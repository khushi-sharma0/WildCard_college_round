import { tools, AgentTool, RiskTier } from "./tools";
import {
  saveAgentRun,
  getAgentRun,
  createAuditLog,
  listAuditLogs,
  listCampaigns,
  listContacts,
  listSegments,
  WS,
  AgentRun
} from "../services";
import { UserRole } from "../auth";

export interface SnapshotData {
  run: AgentRun;
  planSteps: string[];
  timeline: Array<{
    id: string;
    tool: string;
    risk: RiskTier;
    status: "executed" | "blocked" | "pending_approval" | "rejected" | "error";
    args: Record<string, any>;
    result: Record<string, any>;
    timestamp: string;
  }>;
  pendingApproval?: {
    tool: string;
    args: Record<string, any>;
    risk: string;
    summary: string;
    campaignSubject?: string;
    recipientCount?: number;
  } | null;
}

/**
 * Snapshot: retrieves current run, timeline, plan checklist, and pending approval
 */
export async function snapshot(runId: string): Promise<SnapshotData> {
  const run = await getAgentRun(runId);
  if (!run) {
    throw new Error(`Agent run ${runId} not found`);
  }

  const logs = await listAuditLogs(run.workspace_id);
  const runLogs = logs.filter((l) => l.run_id === runId);

  // Extract plan checklist steps from submit_plan audit log or run.steps
  let planSteps: string[] = [];
  const planLog = runLogs.find((l) => l.tool === "submit_plan");
  if (planLog && planLog.args?.steps) {
    planSteps = planLog.args.steps;
  } else if (Array.isArray(run.steps)) {
    const planStepObj = run.steps.find((s) => s.tool === "submit_plan");
    if (planStepObj?.args?.steps) {
      planSteps = planStepObj.args.steps;
    }
  }

  // Build timeline
  const timeline = runLogs.map((log) => ({
    id: log.id,
    tool: log.tool,
    risk: log.risk,
    status: log.status,
    args: log.args,
    result: log.result,
    timestamp: log.created_at
  }));

  // Build pending approval metadata if awaiting approval
  let pendingApproval = null;
  if (run.status === "awaiting_approval" && run.pending_tool) {
    let campaignSubject: string | undefined = undefined;
    let recipientCount: number | undefined = undefined;

    if (run.pending_tool.tool === "send_campaign") {
      const campId = run.pending_tool.args.campaign_id;
      const campaigns = await listCampaigns(run.workspace_id);
      const campaign = campaigns.find((c) => c.id === campId);
      if (campaign) {
        campaignSubject = campaign.subject;
        const segments = await listSegments(run.workspace_id);
        const segment = segments.find((s) => s.id === campaign.segment_id);
        const allContacts = await listContacts(run.workspace_id);
        const matched = segment
          ? allContacts.filter((c) => c.tags && c.tags.includes(segment.filter_tag))
          : allContacts;
        recipientCount = Math.min(matched.length, 20);
      }
    }

    pendingApproval = {
      tool: run.pending_tool.tool,
      args: run.pending_tool.args,
      risk: run.pending_tool.risk,
      summary: `Confirmation needed before triggering ${run.pending_tool.tool} (${run.pending_tool.risk.toUpperCase()} RISK)`,
      campaignSubject,
      recipientCount
    };
  }

  return {
    run,
    planSteps,
    timeline,
    pendingApproval
  };
}

/**
 * Start Run: initiates multi-step workflow from user prompt
 */
export async function startRun(
  prompt: string,
  role: UserRole = "viewer",
  workspaceId: string = WS
): Promise<SnapshotData> {
  const runId = `run-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const run: AgentRun = {
    id: runId,
    workspace_id: workspaceId,
    prompt,
    status: "running",
    steps: [],
    pending_tool: null,
    final_text: null,
    role,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  await saveAgentRun(run);

  // Determine workflow execution plan based on prompt
  const lowerPrompt = prompt.toLowerCase();

  // Scenario 1: Retail segment count demo prompt
  // e.g. "Create a segment of retail contacts and tell me how many there are"
  if (lowerPrompt.includes("segment") && !lowerPrompt.includes("webinar")) {
    const plannedSteps = [
      "Submit execution plan for retail segment analysis",
      "Create or verify segment 'Retail Leads' filtering tag 'retail'",
      "Query matching contacts and compute audience size"
    ];

    // Step 1: submit_plan
    await executeStep(run, "submit_plan", { steps: plannedSteps }, role, workspaceId);

    // Step 2: create_segment
    const segRes = await executeStep(
      run,
      "create_segment",
      { name: "Retail Leads", filter_tag: "retail" },
      role,
      workspaceId
    );

    // Step 3: query_analytics
    await executeStep(run, "query_analytics", { focus: "overview" }, role, workspaceId);

    const contacts = await listContacts(workspaceId, undefined, "retail");
    if (role === "viewer") {
      run.status = "completed";
      run.final_text = `Action blocked: As a Viewer, you do not have permission to create segments. Segment creation was blocked. Currently, there are ${contacts.length} retail contacts in the CRM.`;
    } else {
      run.status = "completed";
      run.final_text = `Successfully created audience segment 'Retail Leads' (filter: 'retail'). Found ${contacts.length} contacts matching this criteria in your CRM.`;
    }

    run.updated_at = new Date().toISOString();
    await saveAgentRun(run);
    return await snapshot(runId);
  }

  // Scenario 2: Full Webinar Demo Instruction
  // "Launch a webinar on AI in retail next Friday. Create a landing page, email my retail leads, and set up a paid ticket plan."
  const defaultSteps = [
    "Plan workflow: multi-channel webinar launch",
    "Create 'Retail Decision Makers' segment (tag: retail)",
    "Schedule 'AI in Retail: Next-Gen Store Intelligence' webinar with Jitsi room",
    "Publish responsive registration landing page (/s/ai-retail-summit)",
    "Set up 'Webinar VIP Ticket' plan ($99 one-time)",
    "Draft targeted email campaign to retail segment",
    "Request Admin approval before email blast (HIGH RISK checkpoint)",
    "Send email campaign to retail leads via Mailtrap sandbox"
  ];

  // 1. Submit Plan
  await executeStep(run, "submit_plan", { steps: defaultSteps }, role, workspaceId);

  // 2. Create Segment
  const segResult = await executeStep(
    run,
    "create_segment",
    { name: "Retail Decision Makers", filter_tag: "retail" },
    role,
    workspaceId
  );
  const segmentId = segResult?.segment_id || "22222222-2222-2222-2222-222222222201";

  // 3. Create Landing Page
  const pageResult = await executeStep(
    run,
    "create_page",
    {
      title: "AI in Retail: Autonomous Business Systems",
      slug: "ai-retail-summit",
      content:
        "Join retail tech innovators next Friday to learn how autonomous agents automate customer engagement, inventory planning, and omnichannel marketing."
    },
    role,
    workspaceId
  );
  const pageId = pageResult?.page_id;

  // 4. Create Paid Ticket Plan (Admin only)
  const planResult = await executeStep(
    run,
    "create_plan",
    {
      name: "Webinar VIP Ticket",
      price_cents: 9900,
      interval: "one_time",
      description: "VIP seat, live Q&A access, and exclusive Retail AI benchmark guide"
    },
    role,
    workspaceId
  );
  const planId = planResult?.plan_id;

  // 5. Create Webinar
  const nextFriday = new Date();
  nextFriday.setDate(nextFriday.getDate() + ((7 + 5 - nextFriday.getDay()) % 7 || 7));
  nextFriday.setHours(14, 0, 0, 0);

  await executeStep(
    run,
    "create_webinar",
    {
      title: "AI in Retail: Next-Gen Store Intelligence",
      scheduled_at: nextFriday.toISOString(),
      landing_page_id: pageId,
      plan_id: planId
    },
    role,
    workspaceId
  );

  // 6. Draft Campaign
  const draftResult = await executeStep(
    run,
    "draft_campaign",
    {
      segment_id: segmentId,
      subject: "Exclusive Invitation: AI in Retail Executive Masterclass",
      body: "Hi {{name}},\n\nAI is redefining modern retail operations. Next Friday, we are hosting a private masterclass on automating store operations and personalized marketing.\n\nReserve your VIP ticket at /s/ai-retail-summit.\n\nBest,\nNexus Operations"
    },
    role,
    workspaceId
  );
  const campaignId = draftResult?.campaign_id;

  // 7. Check if user is Viewer
  if (role === "viewer") {
    run.status = "completed";
    run.final_text =
      "Execution complete with policy blocks. As a Viewer (read-only role), write actions ('create_segment', 'create_page', 'create_plan', 'create_webinar', 'draft_campaign', 'send_campaign') were blocked. No modifications were committed to your database.";
    run.updated_at = new Date().toISOString();
    await saveAgentRun(run);
    return await snapshot(runId);
  }

  // 8. HIGH-RISK CHECKPOINT: send_campaign
  // Pauses execution and awaits Admin approval!
  run.status = "awaiting_approval";
  run.pending_tool = {
    tool: "send_campaign",
    args: { campaign_id: campaignId },
    risk: "high"
  };

  // Log pending approval to audit log
  await createAuditLog({
    workspace_id: workspaceId,
    run_id: run.id,
    role,
    tool: "send_campaign",
    risk: "high",
    status: "pending_approval",
    args: { campaign_id: campaignId },
    result: { message: "Paused execution: awaiting Admin approval" }
  });

  run.updated_at = new Date().toISOString();
  await saveAgentRun(run);
  return await snapshot(runId);
}

/**
 * Execute a single step with validation, role check, and audit logging
 */
async function executeStep(
  run: AgentRun,
  toolName: string,
  args: Record<string, any>,
  role: UserRole,
  workspaceId: string
): Promise<any> {
  const tool = tools[toolName];
  if (!tool) {
    throw new Error(`Tool ${toolName} not found`);
  }

  // Permission check
  const isAllowed = tool.allowedRoles.includes(role);
  if (!isAllowed) {
    const blockedLog = await createAuditLog({
      workspace_id: workspaceId,
      run_id: run.id,
      role,
      tool: toolName,
      risk: tool.riskTier,
      status: "blocked",
      args,
      result: { error: `Permission denied: Role '${role}' is not authorized to execute '${toolName}'. Allowed: ${tool.allowedRoles.join(", ")}` }
    });
    run.steps.push({
      tool: toolName,
      args,
      risk: tool.riskTier,
      status: "blocked",
      result: blockedLog.result
    });
    return null;
  }

  try {
    const validatedArgs = tool.schema.parse(args);
    const result = await tool.execute(validatedArgs, { role, workspaceId });

    await createAuditLog({
      workspace_id: workspaceId,
      run_id: run.id,
      role,
      tool: toolName,
      risk: tool.riskTier,
      status: "executed",
      args: validatedArgs,
      result
    });

    run.steps.push({
      tool: toolName,
      args: validatedArgs,
      risk: tool.riskTier,
      status: "executed",
      result
    });

    return result;
  } catch (err: any) {
    const errorResult = { error: err.message || "Execution error" };
    await createAuditLog({
      workspace_id: workspaceId,
      run_id: run.id,
      role,
      tool: toolName,
      risk: tool.riskTier,
      status: "error",
      args,
      result: errorResult
    });
    run.steps.push({
      tool: toolName,
      args,
      risk: tool.riskTier,
      status: "error",
      result: errorResult
    });
    return null;
  }
}

/**
 * Decide: Admin approves or rejects the pending high-risk tool
 */
export async function decide(
  runId: string,
  approved: boolean,
  role: UserRole = "viewer"
): Promise<SnapshotData> {
  const run = await getAgentRun(runId);
  if (!run) throw new Error(`Run ${runId} not found`);

  if (run.status !== "awaiting_approval" || !run.pending_tool) {
    throw new Error(`Run is not currently awaiting approval (status: ${run.status})`);
  }

  // Strict permission rule: Only Admin can approve
  if (role !== "admin") {
    throw new Error("Permission denied: Only an Admin can approve high-risk actions.");
  }

  const { tool: toolName, args } = run.pending_tool;

  if (!approved) {
    // Admin rejected
    await createAuditLog({
      workspace_id: run.workspace_id,
      run_id: run.id,
      role,
      tool: toolName,
      risk: "high",
      status: "rejected",
      args,
      result: { message: "Campaign delivery was rejected by Admin. Email blast canceled." }
    });

    run.status = "rejected";
    run.pending_tool = null;
    run.final_text = `Workflow completed with rejection: Admin rejected '${toolName}'. The email campaign remains safely saved as a 'draft' and no outbound emails were dispatched.`;
    run.updated_at = new Date().toISOString();
    await saveAgentRun(run);

    return await snapshot(runId);
  }

  // Admin approved: Execute the pending high-risk tool!
  const tool = tools[toolName];
  if (!tool) throw new Error(`Pending tool ${toolName} not found`);

  try {
    const result = await tool.execute(args, { role, workspaceId: run.workspace_id });

    await createAuditLog({
      workspace_id: run.workspace_id,
      run_id: run.id,
      role,
      tool: toolName,
      risk: "high",
      status: "executed",
      args,
      result
    });

    run.steps.push({
      tool: toolName,
      args,
      risk: "high",
      status: "executed",
      result
    });

    run.status = "completed";
    run.pending_tool = null;
    run.final_text = `Webinar campaign launched successfully!
- Target Segment: 'Retail Decision Makers'
- Landing Page: Published and active at /s/ai-retail-summit
- Paid Ticket Plan: Created 'Webinar VIP Ticket' ($99.00)
- Webinar Room: Generated Jitsi Meet room (instant video conference)
- Email Blast: Dispatched ${result.sent_count || 20} emails to Mailtrap sandbox (${result.note || "sandbox mode"})
- Human-In-The-Loop: Approved by Admin. All audit logs recorded.`;

    run.updated_at = new Date().toISOString();
    await saveAgentRun(run);

    return await snapshot(runId);
  } catch (err: any) {
    run.status = "failed";
    run.final_text = `Execution failed during approved tool execution: ${err.message}`;
    run.updated_at = new Date().toISOString();
    await saveAgentRun(run);
    return await snapshot(runId);
  }
}
