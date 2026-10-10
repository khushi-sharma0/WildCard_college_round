import { NextRequest, NextResponse } from "next/server";
import { cancelSubscription } from "@/lib/services";
import { getRole } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const role = await getRole();
    if (role !== "admin") {
      return NextResponse.json({ error: "Only admins can cancel subscriptions." }, { status: 403 });
    }

    const { subscriptionId } = await req.json();
    if (!subscriptionId) {
      return NextResponse.json({ error: "subscriptionId is required." }, { status: 400 });
    }

    const result = await cancelSubscription(subscriptionId, undefined, role);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
