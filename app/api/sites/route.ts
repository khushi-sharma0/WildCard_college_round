import { NextRequest, NextResponse } from "next/server";
import { createAuditLog, createPage, listPages, listWebinars } from "@/lib/services";
import { authorize, getRole, isUnauthenticatedError } from "@/lib/auth";
import { pageSchema } from "@/lib/site-validation";

export async function GET() {
  try {
    const pages = await listPages();
    return NextResponse.json(pages);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = await getRole();
    if (!(await authorize(role, "page_write", "create_page"))) {
      return NextResponse.json(
        { error: "Policy Blocked: Viewer role is read-only and cannot create landing pages." },
        { status: 403 }
      );
    }

    const parsed = pageSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid landing page details." },
        { status: 400 }
      );
    }

    if (parsed.data.linked_webinar_id &&
        !(await listWebinars()).some((webinar) => webinar.id === parsed.data.linked_webinar_id)) {
      return NextResponse.json({ error: "Choose a webinar from this workspace." }, { status: 400 });
    }

    if ((await listPages()).some((page) => page.slug === parsed.data.slug)) {
      return NextResponse.json({ error: `The page slug "${parsed.data.slug}" is already in use.` }, { status: 409 });
    }

    const page = await createPage(
      parsed.data.title,
      parsed.data.slug,
      parsed.data.content,
      undefined,
      undefined,
      undefined,
      false,
      {
        gjs_data: parsed.data.gjs_data,
        builder_data: parsed.data.builder_data,
        theme_color: parsed.data.theme_color,
        linked_webinar_id: parsed.data.linked_webinar_id,
        is_published: parsed.data.is_published
      }
    );
    if (page.is_published) {
      await createAuditLog({
        workspace_id: page.workspace_id,
        role,
        tool: "publish_page",
        risk: "medium",
        status: "executed",
        args: { id: page.id, slug: page.slug },
        result: { entity: "page", id: page.id, is_published: true }
      });
    }
    return NextResponse.json(page);
  } catch (error: any) {
    const status = isUnauthenticatedError(error) ? 401 : error.message?.includes("already in use") ? 409 : 400;
    return NextResponse.json({ error: error.message || "Failed to create landing page." }, { status });
  }
}
