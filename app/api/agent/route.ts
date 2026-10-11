import { NextRequest, NextResponse } from "next/server";
import { startRun, snapshot, createManualApprovalRequest } from "@/lib/agent/orchestrator";
import { canPerformAction, getRole } from "@/lib/auth";
import { createAuditLog, isSupabaseConfigured, listAgentRuns, WS } from "@/lib/services";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const runId = request.nextUrl.searchParams.get("runId");
    return NextResponse.json(runId ? await snapshot(runId) : { runs: await listAgentRuns(WS) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load agent workflows.";
    return NextResponse.json({ error: message }, { status: /not found/i.test(message) ? 404 : 503 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = await getRole();
    const body = await req.json();

    if (body?.type === "approval_request") {
      if (!canPerformAction(role, "write")) {
        if (isSupabaseConfigured()) {
          await createAuditLog({
            workspace_id: WS,
            role,
            tool: "create_approval_request",
            risk: "high",
            status: "blocked",
            args: {},
            result: { error: "Viewer role cannot create approval requests." }
          });
        }
        return NextResponse.json(
          { error: "Viewer role is read-only and cannot create approval requests." },
          { status: 403 }
        );
      }
      if (!isSupabaseConfigured()) {
        return NextResponse.json(
          { error: "Persistent approval requests require SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." },
          { status: 503 }
        );
      }
      const actionName = typeof body.actionName === "string" ? body.actionName.trim() : "";
      const description = typeof body.description === "string" ? body.description.trim() : "";
      const risk = body.risk;
      if (!actionName || actionName.length > 100 || !description || description.length > 1000 || !["low", "medium", "high"].includes(risk)) {
        return NextResponse.json(
          { error: "An action name, description (up to 1000 characters), and valid risk level are required." },
          { status: 400 }
        );
      }
      const result = await createManualApprovalRequest(actionName, description, risk, role, WS);
      return NextResponse.json(result, { status: 201 });
    }

    const { prompt, workspaceId, history } = body;
    if (!prompt || typeof prompt !== "string" || !prompt.trim() || prompt.length > 4000) {
      return NextResponse.json({ error: "A non-empty prompt of at most 4000 characters is required." }, { status: 400 });
    }

    const initialSnapshot = await startRun(prompt, role, workspaceId || WS, Array.isArray(history) ? history : []);
    return NextResponse.json(initialSnapshot, { status: 201 });
  } catch (error: any) {
    const message = error instanceof Error ? error.message : "Could not start agent workflow.";
    console.error("Agent run error:", error);
    const status = /not found/i.test(message) ? 404 : /permitted|draft campaign/i.test(message) ? 422 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
