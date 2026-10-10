import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLog, deleteRecord, listPages, listWebinars, MutableRecordKind, updateRecord } from "@/lib/services";
import { authorize, getRole, isUnauthenticatedError } from "@/lib/auth";
import { pageSchema } from "@/lib/site-validation";

const schemas = {
  page: pageSchema,
  webinar: z.object({
    title: z.string().trim().min(5).max(160),
    scheduled_at: z.string().refine((date) => !Number.isNaN(Date.parse(date))),
    landing_page_id: z.string().optional(),
    plan_id: z.string().optional()
  }),
  campaign: z.object({
    segment_id: z.string().optional(),
    subject: z.string().trim().min(3).max(200),
    body: z.string().trim().min(20).max(10000)
  }),
  plan: z.object({
    name: z.string().trim().min(2).max(100),
    price_cents: z.number().int().positive(),
    interval: z.enum(["monthly", "yearly", "one_time"]),
    description: z.string().max(1000).optional()
  })
};

type RouteParams = { params: { kind: string; id: string } };

function parseKind(value: string): MutableRecordKind | null {
  return value === "page" || value === "webinar" || value === "campaign" || value === "plan"
    ? value
    : null;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const role = await getRole();
    const kind = parseKind(params.kind);
    if (!kind) return NextResponse.json({ error: "Unknown record type." }, { status: 404 });
    const permission = kind === "page" ? "page_write"
      : kind === "webinar" ? "webinar_write"
      : kind === "campaign" ? "campaign_write"
      : "plan_manage";
    if (!(await authorize(role, permission, `update_${kind}`))) {
      return NextResponse.json({ error: "Your role cannot edit this record." }, { status: 403 });
    }

    const parsed = schemas[kind].safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid record details." },
        { status: 400 }
      );
    }

    const linkedWebinarId = "linked_webinar_id" in parsed.data ? parsed.data.linked_webinar_id : null;
    if (kind === "page" && linkedWebinarId &&
        !(await listWebinars()).some((webinar) => webinar.id === linkedWebinarId)) {
      return NextResponse.json({ error: "Choose a webinar from this workspace." }, { status: 400 });
    }

    const priorPage = kind === "page" ? (await listPages()).find((page) => page.id === params.id) : undefined;
    const record = await updateRecord(kind, params.id, parsed.data, role);
    if (kind === "page" && priorPage && "is_published" in parsed.data && priorPage.is_published !== parsed.data.is_published) {
      await createAuditLog({
        workspace_id: priorPage.workspace_id,
        role,
        tool: parsed.data.is_published ? "publish_page" : "unpublish_page",
        risk: "medium",
        status: "executed",
        args: { id: params.id, slug: parsed.data.slug },
        result: { entity: "page", id: params.id, is_published: parsed.data.is_published }
      });
    }
    return NextResponse.json(record);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update record.";
    const status = isUnauthenticatedError(error) ? 401 : message.includes("already in use") || message.includes("already exists") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const role = await getRole();
    const kind = parseKind(params.kind);
    if (!kind) return NextResponse.json({ error: "Unknown record type." }, { status: 404 });
    const permission = kind === "page" ? "page_write"
      : kind === "webinar" ? "webinar_write"
      : kind === "campaign" ? "campaign_write"
      : "plan_manage";
    if (!(await authorize(role, permission, `delete_${kind}`))) {
      return NextResponse.json({ error: "Your role cannot delete this record." }, { status: 403 });
    }

    await deleteRecord(kind, params.id, role);
    return NextResponse.json({ success: true, id: params.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete record.";
    const status = isUnauthenticatedError(error) ? 401 : message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
