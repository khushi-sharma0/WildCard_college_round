import { NextRequest, NextResponse } from "next/server";
import { decide } from "@/lib/agent/orchestrator";
import { authorize, getRole, isUnauthenticatedError } from "@/lib/auth";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const role = await getRole();

    if (!(await authorize(role, "approval_manage", "decide_agent_approval"))) {
      return NextResponse.json(
        { error: "Permission denied: Only an Admin can approve or reject high-risk agent operations." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { runId, approved } = body;

    if (!runId || typeof approved !== "boolean") {
      return NextResponse.json(
        { error: "runId string and approved boolean are required" },
        { status: 400 }
      );
    }

    const updatedSnapshot = await decide(runId, approved, role);
    return NextResponse.json(updatedSnapshot);
  } catch (error: any) {
    console.error("Decision error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process decision" },
      { status: isUnauthenticatedError(error) ? 401 : 500 }
    );
  }
}
