import { NextRequest, NextResponse } from "next/server";
import { subscribeContact } from "@/lib/services";
import { getRole } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const role = await getRole();
    if (role === "viewer") {
      return NextResponse.json(
        { error: "Policy Blocked: Viewer role cannot create subscriptions." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { contactId, planId, workspaceId } = body;

    if (!contactId || !planId) {
      return NextResponse.json(
        { error: "contactId and planId are required." },
        { status: 400 }
      );
    }

    const sub = await subscribeContact(contactId, planId, workspaceId, role);
    return NextResponse.json(sub);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
