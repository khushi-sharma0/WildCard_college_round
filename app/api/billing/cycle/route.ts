import { NextRequest, NextResponse } from "next/server";
import { runBillingCycle } from "@/lib/billing/cycle";
import { getRole } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const role = await getRole();
    if (role !== "admin") {
      return NextResponse.json({ error: "Only admins can run billing cycles." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const result = await runBillingCycle(body.forceFailPayment);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
