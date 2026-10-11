import { NextRequest, NextResponse } from "next/server";
import { decide } from "@/lib/agent/orchestrator";
import { canPerformAction, getRole } from "@/lib/auth";
import { createAuditLog, isSupabaseConfigured, WS } from "@/lib/services";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const role = await getRole();
    const body = await request.json();
    if (typeof body?.runId !== "string" || typeof body.approved !== "boolean") {
      return NextResponse.json({ error: "runId and approved are required." }, { status: 400 });
    }

    if ((role !== "marketer" && role !== "admin") || !canPerformAction(role, "write")) {
      if (isSupabaseConfigured()) {
        await createAuditLog({
          workspace_id: WS,
          role,
          tool: "approval_decision",
          risk: "high",
          status: "blocked",
          args: { run_id: body.runId, approved: body.approved },
          result: { error: `Role '${role}' is not authorized to decide approval requests.` },
        });
      }
      return NextResponse.json(
        { error: "Only Admin and Marketer identities may approve or reject workflow actions." },
        { status: 403 }
      );
    }
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Persistent approval decisions require SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." }, { status: 503 });
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.runId)) {
      return NextResponse.json({ error: "runId must be a valid agent run ID." }, { status: 400 });
    }

    return NextResponse.json(await decide(body.runId, body.approved, role));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process approval decision.";
    const status = /already.*decided|not pending|approval_run_not_pending/i.test(message) ? 409 : /not found/i.test(message) ? 404 : 503;
    return NextResponse.json({ error: message }, { status });
  }
}
