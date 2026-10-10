import { NextRequest, NextResponse } from "next/server";
import { startRun, snapshot } from "@/lib/agent/orchestrator";
import { authorize, getRole, isUnauthenticatedError } from "@/lib/auth";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const role = await getRole();
    const body = await req.json();
    const { prompt, workspaceId } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Prompt string is required" }, { status: 400 });
    }

    if (!(await authorize(role, "agent_execute", "start_agent_run"))) {
      return NextResponse.json({ error: "Your role can only inspect data in Agent Studio." }, { status: 403 });
    }
    const initialSnapshot = await startRun(prompt, role, workspaceId);

    return NextResponse.json(initialSnapshot);
  } catch (error: any) {
    console.error("Agent run error:", error);
    return NextResponse.json({ error: error.message || "Failed to start agent run" }, { status: isUnauthenticatedError(error) ? 401 : 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await getRole();
    const { searchParams } = new URL(req.url);
    const runId = searchParams.get("runId");

    if (!runId) {
      return NextResponse.json({ error: "Missing runId query parameter" }, { status: 400 });
    }

    const snap = await snapshot(runId);
    return NextResponse.json(snap);
  } catch (error: any) {
    console.error("Agent snapshot error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch run snapshot" }, { status: isUnauthenticatedError(error) ? 401 : 500 });
  }
}
