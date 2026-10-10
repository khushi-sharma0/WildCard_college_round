"use client";

import { useState, useEffect } from "react";
import {
  Bot,
  Play,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  RefreshCw,
  Clock,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolCallItem {
  id: string;
  tool: string;
  risk: "low" | "medium" | "high";
  status: "executed" | "blocked" | "pending_approval" | "rejected" | "error";
  args: Record<string, any>;
  result: Record<string, any>;
  timestamp: string;
}

interface PendingApproval {
  tool: string;
  args: Record<string, any>;
  risk: string;
  summary: string;
  campaignSubject?: string;
  recipientCount?: number;
}

const EXAMPLE_PROMPTS = [
  {
    title: "Demo Workflow (Cross-Module)",
    text: "Launch a webinar on AI in retail next Friday. Create a landing page, email my retail leads, and set up a paid ticket plan.",
  },
  {
    title: "Segment Analysis",
    text: "Create a segment of retail contacts and tell me how many there are",
  },
  {
    title: "Analytics & Funnel Query",
    text: "Query analytics overview, conversion funnel, and summary of SaaS billing MRR",
  },
];

export default function AgentPage() {
  const [prompt, setPrompt] = useState(EXAMPLE_PROMPTS[0].text);
  const [running, setRunning] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<string | null>(null);
  const [planSteps, setPlanSteps] = useState<string[]>([]);
  const [timeline, setTimeline] = useState<ToolCallItem[]>([]);
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);
  const [finalText, setFinalText] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState("viewer");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [decisionLoading, setDecisionLoading] = useState(false);

  // Read role cookie
  useEffect(() => {
    const match = document.cookie.match(/(^|;)\s*role\s*=\s*([^;]+)/);
    if (match && match[2]) {
      setCurrentRole(match[2].toLowerCase());
    }
  }, []);

  // Poll while run is active
  useEffect(() => {
    if (!runId || runStatus !== "running") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/agent?runId=${runId}`);
        if (!res.ok) return;
        const data = await res.json();

        setRunStatus(data.run.status);
        setPlanSteps(data.planSteps || []);
        setTimeline(data.timeline || []);
        setPendingApproval(data.pendingApproval || null);
        setFinalText(data.run.final_text || null);

        if (data.run.status !== "running") {
          setRunning(false);
        }
      } catch (e) {
        console.error("Polling error", e);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [runId, runStatus]);

  async function handleStartRun(overridePrompt?: string) {
    const targetPrompt = overridePrompt || prompt;
    if (!targetPrompt.trim() || running) return;

    setRunning(true);
    setErrorBanner(null);
    setFinalText(null);
    setPendingApproval(null);
    setTimeline([]);
    setPlanSteps([]);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: targetPrompt }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to start agent run");
      }

      setRunId(data.run.id);
      setRunStatus(data.run.status);
      setPlanSteps(data.planSteps || []);
      setTimeline(data.timeline || []);
      setPendingApproval(data.pendingApproval || null);
      setFinalText(data.run.final_text || null);

      if (data.run.status !== "running") {
        setRunning(false);
      }
    } catch (err: any) {
      setErrorBanner(err.message || "Failed to initiate workflow");
      setRunning(false);
    }
  }

  async function handleDecision(approved: boolean) {
    if (!runId || decisionLoading) return;
    setDecisionLoading(true);

    try {
      const res = await fetch("/api/agent/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId, approved }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Decision rejected by platform policy");
      }

      setRunStatus(data.run.status);
      setPlanSteps(data.planSteps || []);
      setTimeline(data.timeline || []);
      setPendingApproval(data.pendingApproval || null);
      setFinalText(data.run.final_text || null);
    } catch (err: any) {
      setErrorBanner(err.message);
    } finally {
      setDecisionLoading(false);
    }
  }

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case "high":
        return (
          <span className="px-2 py-0.5 rounded-none text-[10px] font-mono font-bold uppercase tracking-wider bg-[#FDF2F2] text-[#B91C1C] border border-[#FCA5A5]">
            HIGH RISK
          </span>
        );
      case "medium":
        return (
          <span className="px-2 py-0.5 rounded-none text-[10px] font-mono font-bold uppercase tracking-wider bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
            MEDIUM RISK
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-none text-[10px] font-mono font-bold uppercase tracking-wider bg-[#EDF2EE] text-[#4A5D4E] border border-[#CCD8CD]">
            LOW RISK
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "executed":
        return (
          <span className="px-2 py-0.5 rounded-none text-[10px] font-mono font-bold uppercase tracking-wider bg-stone-100 text-stone-800 border border-stone-300 flex items-center gap-1">
            <Check className="w-3 h-3 text-[#4A5D4E]" /> EXECUTED
          </span>
        );
      case "pending_approval":
        return (
          <span className="px-2 py-0.5 rounded-none text-[10px] font-mono font-bold uppercase tracking-wider bg-[#FDF5F1] text-[#C85A32] border border-[#E8C2B3] flex items-center gap-1 animate-pulse">
            <Clock className="w-3 h-3" /> PENDING APPROVAL
          </span>
        );
      case "blocked":
        return (
          <span className="px-2 py-0.5 rounded-none text-[10px] font-mono font-bold uppercase tracking-wider bg-stone-200 text-stone-700 border border-stone-400 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" /> BLOCKED
          </span>
        );
      case "rejected":
        return (
          <span className="px-2 py-0.5 rounded-none text-[10px] font-mono font-bold uppercase tracking-wider bg-stone-100 text-stone-500 border border-stone-300 flex items-center gap-1">
            <X className="w-3 h-3" /> REJECTED
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-none text-[10px] font-mono uppercase tracking-wider bg-stone-100 text-stone-700 border border-stone-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-300">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#C85A32] font-semibold mb-1">
            Autonomous Multi-Step Execution Loop
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-stone-900">
            Agent Studio
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Natural-language orchestrator with permissions, automated rollouts, human approval checkpoints, and immutable audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-none bg-white border border-stone-300 shadow-[1px_1px_0px_0px_#1C1917] text-xs text-stone-800 font-mono">
            Active Role: <span className="font-bold uppercase text-[#C85A32]">{currentRole}</span>
          </div>
        </div>
      </div>

      {/* Input Box & Example Prompts */}
      <div className="p-6 rounded-none bg-white border border-stone-300 shadow-[3px_3px_0px_0px_#1C1917] space-y-5">
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-600 font-semibold mb-2">
            Natural-Language Workflow Instruction
          </label>
          <div className="relative">
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Specify the business objective for the agent to plan, validate, and execute..."
              className="w-full px-4 py-3 rounded-none bg-[#FAF8F5] border border-stone-300 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900 text-sm resize-none font-normal leading-relaxed"
            />
            <button
              onClick={() => handleStartRun()}
              disabled={running || !prompt.trim()}
              className="absolute right-3 bottom-4 px-5 py-2.5 rounded-none bg-[#C85A32] hover:bg-[#B94A26] text-white font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_#1C1917] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#1C1917] flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {running ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Run Workflow
                </>
              )}
            </button>
          </div>
        </div>

        {/* 3 Clickable Example Prompts */}
        <div className="pt-2 border-t border-stone-200">
          <div className="text-[10px] font-mono font-semibold text-stone-500 uppercase tracking-widest mb-2.5">
            Verified Instruction Presets
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {EXAMPLE_PROMPTS.map((ex, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setPrompt(ex.text);
                  handleStartRun(ex.text);
                }}
                className="text-left p-3.5 rounded-none bg-[#FAF8F5] hover:bg-white border border-stone-300 hover:border-stone-900 shadow-[1px_1px_0px_0px_#D6D3D1] hover:shadow-[2px_2px_0px_0px_#1C1917] transition-all cursor-pointer group"
              >
                <div className="text-xs font-bold text-stone-900 font-serif group-hover:text-[#C85A32] flex items-center gap-1.5 mb-1">
                  <Bot className="w-3.5 h-3.5 text-stone-600" />
                  {ex.title}
                </div>
                <div className="text-[11px] text-stone-600 line-clamp-2 leading-snug">
                  "{ex.text}"
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error / Rate Limit Banner */}
      {errorBanner && (
        <div className="p-4 rounded-none bg-[#FDF2F2] border border-[#FCA5A5] text-[#991B1B] flex items-start justify-between gap-4 shadow-[2px_2px_0px_0px_#B91C1C]">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#B91C1C] flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-mono font-bold uppercase tracking-wider">Notice / Quota Advisory</div>
              <div className="text-xs text-stone-800 mt-0.5">{errorBanner}</div>
              <div className="text-[11px] text-stone-600 mt-1">
                Tip: If this is an external API rate limit, retry after a few seconds.
              </div>
            </div>
          </div>
          <button
            onClick={() => handleStartRun()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-none bg-white hover:bg-stone-50 border border-stone-900 text-stone-900 text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-[1px_1px_0px_0px_#1C1917] cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}

      {/* Loading indicator */}
      {running && (
        <div className="p-5 rounded-none bg-[#FDF5F1] border border-[#E8C2B3] flex items-center gap-4 shadow-[2px_2px_0px_0px_#C85A32]">
          <Loader2 className="w-5 h-5 text-[#C85A32] animate-spin" />
          <div>
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-stone-900">Workflow in Progress</div>
            <div className="text-xs text-stone-600">
              Validating role permissions, orchestrating modules, and recording audit entries...
            </div>
          </div>
        </div>
      )}

      {/* Results Section */}
      {(planSteps.length > 0 || timeline.length > 0 || pendingApproval || finalText) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Plan Checklist & Execution Timeline */}
          <div className="lg:col-span-7 space-y-6">
            {/* a) Plan Checklist */}
            {planSteps.length > 0 && (
              <div className="p-6 rounded-none bg-white border border-stone-300 shadow-[3px_3px_0px_0px_#1C1917] space-y-4">
                <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#4A5D4E]" />
                    <h3 className="font-serif text-base font-bold text-stone-900">
                      Orchestration Plan Checklist
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-stone-500">
                    {planSteps.length} milestones
                  </span>
                </div>

                <div className="space-y-2">
                  {planSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-2.5 rounded-none bg-[#FAF8F5] border border-stone-200 text-xs text-stone-800"
                    >
                      <span className="w-4 h-4 rounded-none bg-stone-900 text-white flex items-center justify-center font-mono text-[10px] font-bold flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span className="leading-snug">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* b) Live Timeline of Tool Calls */}
            {timeline.length > 0 && (
              <div className="p-6 rounded-none bg-white border border-stone-300 shadow-[3px_3px_0px_0px_#1C1917] space-y-4">
                <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-stone-700" />
                    <h3 className="font-serif text-base font-bold text-stone-900">
                      Step Execution Timeline
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-stone-500">{timeline.length} operations</span>
                </div>

                <div className="space-y-2.5">
                  {timeline.map((item) => {
                    const isExpanded = expandedLogId === item.id;
                    return (
                      <div
                        key={item.id}
                        className="rounded-none bg-[#FAF8F5] border border-stone-300 overflow-hidden transition-all"
                      >
                        <div
                          onClick={() => setExpandedLogId(isExpanded ? null : item.id)}
                          className="p-3 flex items-center justify-between cursor-pointer hover:bg-stone-100 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-mono text-xs font-bold text-stone-900">
                              {item.tool}
                            </span>
                            {getRiskBadge(item.risk)}
                            {getStatusBadge(item.status)}
                          </div>

                          <div className="flex items-center gap-2 text-stone-500">
                            <span className="text-[10px] font-mono">
                              {new Date(item.timestamp).toLocaleTimeString()}
                            </span>
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </div>
                        </div>

                        {/* Collapsible Args / Result JSON */}
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-2 border-t border-stone-200 bg-white space-y-3 text-xs">
                            <div>
                              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500 mb-1">
                                Input Arguments
                              </div>
                              <pre className="p-3 rounded-none bg-[#F5F2EB] text-stone-900 font-mono text-[11px] overflow-x-auto border border-stone-300">
                                {JSON.stringify(item.args, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500 mb-1">
                                Execution Result
                              </div>
                              <pre className="p-3 rounded-none bg-[#F5F2EB] text-stone-900 font-mono text-[11px] overflow-x-auto border border-stone-300">
                                {JSON.stringify(item.result, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Approval Card & Final Summary */}
          <div className="lg:col-span-5 space-y-6">
            {/* c) Highlighted Approval Card */}
            {runStatus === "awaiting_approval" && pendingApproval && (
              <div className="p-6 rounded-none bg-[#FDFBF7] border-2 border-[#C85A32] shadow-[4px_4px_0px_0px_#1C1917] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E8C2B3]">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#C85A32] font-bold">
                      Governance Checkpoint
                    </span>
                    <h3 className="font-serif text-lg font-bold text-stone-900">
                      Admin Approval Required
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-none text-[10px] font-mono font-bold uppercase tracking-wider bg-[#FDF2F2] text-[#B91C1C] border border-[#FCA5A5]">
                    HIGH RISK
                  </span>
                </div>

                <p className="text-xs text-stone-700 leading-relaxed">
                  The agent has staged all low and medium-risk operations and is paused at this checkpoint. Outbound messaging will not proceed without approval.
                </p>

                {/* Details box */}
                <div className="p-3.5 rounded-none bg-white border border-stone-300 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-stone-600">
                    <span className="font-mono text-[11px]">Action:</span>
                    <span className="font-mono text-[#C85A32] font-bold">{pendingApproval.tool}</span>
                  </div>
                  {pendingApproval.campaignSubject && (
                    <div className="flex justify-between items-start text-stone-600 gap-2">
                      <span className="font-mono text-[11px] flex-shrink-0">Subject:</span>
                      <span className="text-right text-stone-900 font-medium">{pendingApproval.campaignSubject}</span>
                    </div>
                  )}
                  {pendingApproval.recipientCount !== undefined && (
                    <div className="flex justify-between items-center text-stone-600">
                      <span className="font-mono text-[11px]">Recipients:</span>
                      <span className="text-stone-900 font-bold font-mono">{pendingApproval.recipientCount} Retail Leads</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-stone-600">
                    <span className="font-mono text-[11px]">Transport:</span>
                    <span className="text-[#92400E] font-medium font-mono">Mailtrap Sandbox (Safe)</span>
                  </div>
                </div>

                {/* Action Buttons */}
                {currentRole === "admin" ? (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => handleDecision(true)}
                      disabled={decisionLoading}
                      className="py-2.5 px-4 rounded-none bg-[#4A5D4E] hover:bg-[#3B4A3E] text-white font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_#1C1917] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#1C1917] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {decisionLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      Approve & Send
                    </button>

                    <button
                      onClick={() => handleDecision(false)}
                      disabled={decisionLoading}
                      className="py-2.5 px-4 rounded-none bg-white hover:bg-stone-100 border border-stone-900 text-stone-900 font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_#1C1917] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#1C1917] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {decisionLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <X className="w-3.5 h-3.5" />
                      )}
                      Reject Action
                    </button>
                  </div>
                ) : (
                  <div className="p-3 rounded-none bg-stone-100 border border-stone-300 text-center space-y-1">
                    <div className="text-xs font-mono font-bold text-stone-900 flex items-center justify-center gap-1.5 uppercase">
                      <ShieldAlert className="w-3.5 h-3.5 text-[#C85A32]" />
                      Only an Admin can approve
                    </div>
                    <p className="text-[11px] text-stone-600">
                      Switch identity to <span className="text-stone-900 font-bold">Admin</span> via top switcher to authorize this transmission.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* d) Final Summary Text */}
            {finalText && (
              <div className="p-6 rounded-none bg-white border border-stone-300 shadow-[3px_3px_0px_0px_#1C1917] space-y-3">
                <div className="flex items-center gap-2 text-[#4A5D4E] pb-2 border-b border-stone-200">
                  <CheckCircle2 className="w-4 h-4" />
                  <h3 className="font-serif text-base font-bold text-stone-900">
                    Execution Outcome Report
                  </h3>
                </div>
                <div className="p-3.5 rounded-none bg-[#FAF8F5] border border-stone-300 text-xs text-stone-800 whitespace-pre-line leading-relaxed font-mono">
                  {finalText}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
