import { NextRequest, NextResponse } from "next/server";
import { createPlan } from "@/lib/services";
import { getRole } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const role = await getRole();
    if (role !== "admin") {
      return NextResponse.json(
        { error: "Policy Blocked: Billing plan creation is strictly restricted to Admin role." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, price_cents, interval, description } = body;

    if (!name || !price_cents) {
      return NextResponse.json(
        { error: "Name and price_cents are required." },
        { status: 400 }
      );
    }

    const plan = await createPlan(name, Number(price_cents), interval || "monthly", description);
    return NextResponse.json(plan);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
