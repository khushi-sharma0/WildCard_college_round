import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createWebinar, listWebinars, listRegistrations } from "@/lib/services";
import { authorize, getRole, isUnauthenticatedError } from "@/lib/auth";

const webinarSchema = z.object({
  title: z.string().trim().min(5, "Webinar title must be at least 5 characters").max(160),
  scheduled_at: z.string().refine((date) => !Number.isNaN(Date.parse(date)), "A valid webinar date is required"),
  landing_page_id: z.string().optional(),
  plan_id: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    await getRole();
    const { searchParams } = new URL(req.url);
    const webinarId = searchParams.get("webinarId");

    if (webinarId) {
      const registrations = await listRegistrations(webinarId);
      return NextResponse.json({ registrations });
    }

    const webinars = await listWebinars();
    return NextResponse.json({ webinars });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: isUnauthenticatedError(error) ? 401 : 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = await getRole();
    if (!(await authorize(role, "webinar_write", "create_webinar"))) {
      return NextResponse.json(
        { error: "Policy Blocked: Viewer role cannot create webinars." },
        { status: 403 }
      );
    }

    const parsed = webinarSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid webinar details." },
        { status: 400 }
      );
    }

    const { title, scheduled_at, landing_page_id, plan_id } = parsed.data;
    const webinar = await createWebinar(title, scheduled_at, landing_page_id, plan_id);
    return NextResponse.json(webinar);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: isUnauthenticatedError(error) ? 401 : 500 });
  }
}
