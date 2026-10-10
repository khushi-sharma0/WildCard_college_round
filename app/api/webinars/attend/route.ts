import { NextRequest, NextResponse } from "next/server";
import { toggleRegistrationAttended } from "@/lib/services";
import { authorize, getRole, isUnauthenticatedError } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const role = await getRole();
    if (!(await authorize(role, "webinar_write", "update_attendance"))) {
      return NextResponse.json(
        { error: "Policy Blocked: Viewer cannot update attendance." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { registrationId, attended } = body;

    if (!registrationId || typeof attended !== "boolean") {
      return NextResponse.json(
        { error: "registrationId and attended boolean are required." },
        { status: 400 }
      );
    }

    await toggleRegistrationAttended(registrationId, attended);
    return NextResponse.json({ success: true, registrationId, attended });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: isUnauthenticatedError(error) ? 401 : 500 });
  }
}
