import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createPlan } from "@/lib/services";
import { authorize, getRole, isUnauthenticatedError } from "@/lib/auth";

const planSchema = z.object({
  name: z.string().trim().min(2, "Plan name must be at least 2 characters").max(100),
  price_cents: z.number().int().positive("Price must be greater than zero"),
  interval: z.enum(["monthly", "yearly", "one_time"]),
  description: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const role = await getRole();
    if (!(await authorize(role, "plan_manage", "create_plan"))) {
      return NextResponse.json(
        { error: "Policy Blocked: Billing plan creation is strictly restricted to Admin role." },
        { status: 403 }
      );
    }

    const parsed = planSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid plan details." },
        { status: 400 }
      );
    }

    const { name, price_cents, interval, description } = parsed.data;
    const plan = await createPlan(name, Number(price_cents), interval || "monthly", description);
    return NextResponse.json(plan);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: isUnauthenticatedError(error) ? 401 : 500 });
  }
}
