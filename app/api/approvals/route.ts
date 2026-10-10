import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorize, getRole, isUnauthenticatedError } from "@/lib/auth";
import { decideApprovalRequest, listApprovalRequests } from "@/lib/services";

const decisionSchema = z.object({
  id: z.string().min(1),
  approved: z.boolean(),
  reason: z.string().max(500).optional()
});

export async function GET() {
  try {
    const role = await getRole();
    if (!(await authorize(role, "approval_manage", "list_approvals"))) {
      return NextResponse.json({ error: "Admin role required." }, { status: 403 });
    }
    return NextResponse.json({ approvals: await listApprovalRequests() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to list approvals.";
    return NextResponse.json({ error: message }, { status: isUnauthenticatedError(error) ? 401 : 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = await getRole();
    if (!(await authorize(role, "approval_manage", "decide_approval"))) {
      return NextResponse.json({ error: "Admin role required." }, { status: 403 });
    }
    const parsed = decisionSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid decision." }, { status: 400 });
    }
    const approval = await decideApprovalRequest(
      parsed.data.id,
      parsed.data.approved,
      role,
      parsed.data.reason
    );
    return NextResponse.json({ approval });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save approval decision.";
    return NextResponse.json({ error: message }, { status: isUnauthenticatedError(error) ? 401 : 400 });
  }
}
