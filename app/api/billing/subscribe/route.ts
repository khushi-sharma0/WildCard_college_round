import { NextRequest, NextResponse } from "next/server";
import { createApprovalRequest, subscribeContact } from "@/lib/services";
import { authorize, getRole, isUnauthenticatedError } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const role = await getRole();
    const canSubscribe = await authorize(
      role,
      role === "admin" ? "billing_subscribe" : "billing_request",
      "create_subscription"
    );
    if (!canSubscribe) {
      return NextResponse.json(
        { error: "Policy Blocked: Viewer role cannot create subscriptions." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { contactId, planId } = body;

    if (!contactId || !planId) {
      return NextResponse.json(
        { error: "contactId and planId are required." },
        { status: 400 }
      );
    }

    if (role === "marketer") {
      const approval = await createApprovalRequest(
        "subscribe_contact",
        { contactId, planId },
        role
      );
      return NextResponse.json({ approval, pendingApproval: true }, { status: 202 });
    }

    const sub = await subscribeContact(contactId, planId);
    return NextResponse.json(sub);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: isUnauthenticatedError(error) ? 401 : 500 });
  }
}
