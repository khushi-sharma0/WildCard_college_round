import { NextRequest, NextResponse } from "next/server";
import { createWebinar, listWebinars, listRegistrations } from "@/lib/services";
import { getRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const webinarId = searchParams.get("webinarId");

    if (webinarId) {
      const registrations = await listRegistrations(webinarId);
      return NextResponse.json({ registrations });
    }

    const webinars = await listWebinars();
    return NextResponse.json({ webinars });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = await getRole();
    if (role === "viewer") {
      return NextResponse.json(
        { error: "Policy Blocked: Viewer role cannot create webinars." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { title, scheduled_at, landing_page_id, plan_id } = body;

    if (!title || !scheduled_at) {
      return NextResponse.json(
        { error: "Title and scheduled_at date are required." },
        { status: 400 }
      );
    }

    const webinar = await createWebinar(title, scheduled_at, landing_page_id, plan_id);
    return NextResponse.json(webinar);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
