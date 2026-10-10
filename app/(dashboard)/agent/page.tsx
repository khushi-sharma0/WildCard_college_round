"use client";

import { useState, useEffect, useRef } from "react";
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
  RotateCcw,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Layers,
  Send,
  Video,
  Globe,
  Users,
  CreditCard,
  Mail,
  HelpCircle,
  BarChart3,
  Search,
  Tv,
  Calendar
} from "lucide-react";
import Link from "next/link";
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

interface ReportSummary {
  title: string;
  createdEntities: Array<{ type: string; name: string; url?: string; meta?: string }>;
  hoursSaved: number;
  actionsExecuted: number;
  auditLogCount: number;
}

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  runId?: string;
  runStatus?: string;
  planSteps?: string[];
  timeline?: ToolCallItem[];
  pendingApproval?: PendingApproval | null;
  reportSummary?: ReportSummary;
  finalText?: string | null;
  intentMode?: "conversation" | "analysis" | "workflow";
}

const PRESET_PROMPTS = [
  {
    icon: Video,
    label: "Launch Instant Meeting",
    text: "Launch an instant meeting",
  },
  {
    icon: Calendar,
    label: "Schedule Meeting",
    text: "Schedule a meeting for tomorrow 10am",
  },
  {
    icon: HelpCircle,
    label: "Capabilities Overview",
    text: "What can you do?",
  },
  {
    icon: BarChart3,
    label: "Analyze CRM & Leads",
    text: "Analyze the CRM and leads.",
  },
  {
    icon: Search,
    label: "Query Lead Count",
    text: "How many leads are currently in the CRM?",
  },
  {
    icon: Sparkles,
    label: "Improve Conversions",
    text: "How can I improve my conversions?",
  },
  {
    icon: Play,
    label: "Multi-Module Webinar Launch",
    text: "Create a webinar for our new product, identify interested leads in the CRM, prepare an email marketing campaign, and track registrations.",
  },
  {
    icon: Mail,
    label: "Retail Masterclass & Paid Ticket",
    text: "Launch a webinar on AI in retail next Friday. Create a landing page, email my retail leads, and set up a paid ticket plan.",
  },
];

export default function AgentPage() {
  const [inputPrompt, setInputPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState("viewer");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [expandedDetailsMap, setExpandedDetailsMap] = useState<Record<string, boolean>>({});
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Chat message thread
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-msg",
      sender: "assistant",
      text: "Greetings. I am Nexus's autonomous Business Operating Agent. I coordinate operations across the Website Builder, CRM, SaaS Billing, Marketing Automation, Webinar Studio, and Analytics modules.\n\nAsk me any question, request business intelligence on your data, or instruct me to execute multi-module workflows.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, running]);

  // Read role cookie
  useEffect(() => {
    const match = document.cookie.match(/(^|;)\s*role\s*=\s*([^;]+)/);
    if (match && match[2]) {
      setCurrentRole(match[2].toLowerCase());
    }
  }, []);

  // Poll while active run is running
  useEffect(() => {
    if (!activeRunId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/agent?runId=${activeRunId}`);
        if (!res.ok) return;
        const data = await res.json();

        setMessages((prev) =>
          prev.map((msg) =>
            msg.runId === activeRunId
              ? {
                  ...msg,
                  runStatus: data.run.status,
                  planSteps: data.planSteps || [],
                  timeline: data.timeline || [],
                  pendingApproval: data.pendingApproval || null,
                  reportSummary: data.reportSummary,
                  finalText: data.run.final_text || null,
                  text: data.assistantResponse || data.run.final_text || msg.text,
                }
              : msg
          )
        );

        if (data.run.status !== "running") {
          setRunning(false);
          if (data.run.status !== "awaiting_approval") {
            setActiveRunId(null);
          }
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [activeRunId]);

  async function handleSend(textToSend?: string) {
    const prompt = (textToSend || inputPrompt).trim();
    if (!prompt || running) return;

    setInputPrompt("");
    setRunning(true);
    setErrorBanner(null);

    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `asst-${Date.now()}`;

    // Prepare conversation history for context-aware multi-turn reasoning
    const history = messages
      .filter((m) => m.id !== "welcome-msg")
      .slice(-6)
      .map((m) => ({
        role: m.sender,
        text: m.finalText || m.text,
      }));

    // Append user message and optimistic assistant placeholder
    const newMessages: ChatMessage[] = [
      ...messages,
      {
        id: userMsgId,
        sender: "user",
        text: prompt,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
      {
        id: assistantMsgId,
        sender: "assistant",
        text: "Analyzing request, querying platform telemetry, and preparing response...",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        runStatus: "running",
        planSteps: [],
        timeline: [],
      },
    ];

    setMessages(newMessages);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, history }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to execute agent workflow");
      }

      setActiveRunId(data.run.id);

      // Update assistant message with snapshot
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                runId: data.run.id,
                runStatus: data.run.status,
                planSteps: data.planSteps || [],
                timeline: data.timeline || [],
                pendingApproval: data.pendingApproval || null,
                reportSummary: data.reportSummary,
                finalText: data.run.final_text || null,
                intentMode: data.intentMode,
                text: data.assistantResponse || data.run.final_text || "Processed request successfully.",
              }
            : msg
        )
      );

      if (data.run.status !== "running" && data.run.status !== "awaiting_approval") {
        setRunning(false);
        setActiveRunId(null);
      }
    } catch (err: any) {
      setErrorBanner(err.message || "Execution failed");
      setRunning(false);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                runStatus: "failed",
                text: `Execution notice: ${err.message}. Please retry or check your workspace permissions.`,
              }
            : msg
        )
      );
    }
  }

  async function handleDecision(runId: string, approved: boolean) {
    if (decisionLoading) return;
    setDecisionLoading(true);

    try {
      const res = await fetch("/api/agent/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId, approved }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Decision rejected by governance policy");
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.runId === runId
            ? {
                ...msg,
                runStatus: data.run.status,
                timeline: data.timeline || [],
                pendingApproval: null,
                reportSummary: data.reportSummary,
                finalText: data.run.final_text,
                text: data.assistantResponse || data.run.final_text || (approved
                  ? "Admin authorization verified. High-risk outbound email blast dispatched to Mailtrap sandbox."
                  : "Admin declined campaign transmission. Outbound blast was safely cancelled and kept in draft state."),
              }
            : msg
        )
      );

      setActiveRunId(null);
      setRunning(false);
    } catch (err: any) {
      setErrorBanner(err.message);
    } finally {
      setDecisionLoading(false);
    }
  }

  function handleResetChat() {
    setMessages([
      {
        id: "welcome-reset",
        sender: "assistant",
        text: "Thread reset. What business workflow or analysis would you like to execute next?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setActiveRunId(null);
    setRunning(false);
    setErrorBanner(null);
  }

  const toggleDetails = (msgId: string) => {
    setExpandedDetailsMap((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case "high":
        return (
          <span className="px-2 py-0.5 rounded-none text-[9px] font-mono font-bold uppercase tracking-wider bg-[#FDF2F2] text-[#B91C1C] border border-[#FCA5A5]">
            HIGH RISK
          </span>
        );
      case "medium":
        return (
          <span className="px-2 py-0.5 rounded-none text-[9px] font-mono font-bold uppercase tracking-wider bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]">
            MEDIUM RISK
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-none text-[9px] font-mono font-bold uppercase tracking-wider bg-stone-100 text-stone-600 border border-stone-300">
            LOW RISK
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "executed":
        return (
          <span className="px-2 py-0.5 rounded-none text-[9px] font-mono font-bold uppercase tracking-wider bg-[#F2F7F4] text-[#2F5D38] border border-[#A7D7B5] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-[#2F5D38]" /> EXECUTED
          </span>
        );
      case "pending_approval":
        return (
          <span className="px-2 py-0.5 rounded-none text-[9px] font-mono font-bold uppercase tracking-wider bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> PENDING APPROVAL
          </span>
        );
      case "blocked":
        return (
          <span className="px-2 py-0.5 rounded-none text-[9px] font-mono font-bold uppercase tracking-wider bg-stone-200 text-stone-700 border border-stone-400 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" /> BLOCKED (ROLE)
          </span>
        );
      case "rejected":
        return (
          <span className="px-2 py-0.5 rounded-none text-[9px] font-mono font-bold uppercase tracking-wider bg-stone-100 text-stone-500 border border-stone-300 flex items-center gap-1">
            <X className="w-3 h-3" /> REJECTED
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-none text-[9px] font-mono uppercase tracking-wider bg-stone-100 text-stone-700 border border-stone-300">
            {status}
          </span>
        );
    }
  };

  /**
   * Helper to format markdown in assistant text (headings, bold, lists)
   */
  const renderFormattedText = (rawText: string) => {
    const lines = rawText.split("\n");
    return lines.map((line, idx) => {
      // Heading 3
      if (line.startsWith("### ")) {
        return (
          <h3 key={idx} className="font-serif font-bold text-sm text-stone-900 mt-2 mb-1">
            {line.replace("### ", "")}
          </h3>
        );
      }
      // Heading 2 or 1
      if (line.startsWith("## ") || line.startsWith("# ")) {
        return (
          <h2 key={idx} className="font-serif font-bold text-base text-stone-900 mt-2.5 mb-1.5">
            {line.replace(/^[#]+\s/, "")}
          </h2>
        );
      }
      // Bullet list items
      if (line.trim().startsWith("• ") || line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        const content = line.trim().replace(/^[•\-\*]\s/, "");
        return (
          <div key={idx} className="flex items-start gap-2 pl-1 my-0.5">
            <span className="text-[#C85A32] font-bold text-xs mt-0.5">•</span>
            <span className="leading-relaxed" dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(content) }} />
          </div>
        );
      }
      // Numbered list
      if (/^\d+\.\s/.test(line.trim())) {
        const num = line.trim().match(/^(\d+)\.\s/)?.[1];
        const content = line.trim().replace(/^\d+\.\s/, "");
        return (
          <div key={idx} className="flex items-start gap-2 pl-1 my-0.5">
            <span className="font-mono text-[11px] font-bold text-stone-700 mt-0.5">{num}.</span>
            <span className="leading-relaxed" dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(content) }} />
          </div>
        );
      }
      // Empty line
      if (!line.trim()) {
        return <div key={idx} className="h-1.5" />;
      }
      // Regular paragraph
      return (
        <p key={idx} className="leading-relaxed" dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line) }} />
      );
    });
  };

  const formatInlineMarkdown = (text: string) => {
    return text
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-stone-100 text-stone-800 font-mono text-[11px] border border-stone-200">$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[#C85A32] underline hover:text-[#B94A26] font-semibold inline-flex items-center gap-1">$1 ↗</a>');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-300">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#C85A32] font-semibold mb-1">
            Conversational Autonomous Business Agent
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-stone-900">
            Nexus AI Agent Studio
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Dynamic reasoning, conversational intelligence, and authorized cross-module task execution.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-none bg-white border border-stone-300 text-stone-700 hover:text-stone-900 text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-[1px_1px_0px_0px_#1C1917] cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            New Thread
          </button>
          <div className="px-3 py-1.5 rounded-none bg-[#FAF8F5] border border-stone-300 text-xs text-stone-800 font-mono shadow-[1px_1px_0px_0px_#1C1917]">
            Active Role: <span className="font-bold uppercase text-[#C85A32]">{currentRole}</span>
          </div>
        </div>
      </div>

      {/* Preset Prompts Bar */}
      <div className="p-4 rounded-none bg-white border border-stone-300 shadow-[2px_2px_0px_0px_#1C1917] space-y-2">
        <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-stone-500">
          Instant Inquiries & Multi-Step Workflow Prompts
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {PRESET_PROMPTS.map((preset, idx) => {
            const Icon = preset.icon;
            return (
              <button
                key={idx}
                onClick={() => handleSend(preset.text)}
                disabled={running}
                className="text-left p-2.5 rounded-none bg-[#FAF8F5] hover:bg-white border border-stone-300 hover:border-stone-900 transition-all shadow-[1px_1px_0px_0px_#D6D3D1] hover:shadow-[2px_2px_0px_0px_#1C1917] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group flex items-start gap-2"
              >
                <Icon className="w-4 h-4 text-stone-500 group-hover:text-[#C85A32] flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-stone-900 group-hover:text-[#C85A32] truncate font-serif">
                    {preset.label}
                  </div>
                  <div className="text-[10px] text-stone-500 truncate mt-0.5">
                    "{preset.text}"
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Error / Policy Banner */}
      {errorBanner && (
        <div className="p-4 rounded-none bg-[#FDF2F2] border border-[#FCA5A5] text-[#991B1B] flex items-start justify-between gap-4 shadow-[2px_2px_0px_0px_#B91C1C]">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#B91C1C] flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-mono font-bold uppercase tracking-wider">Notice / Policy Advisory</div>
              <div className="text-xs text-stone-800 mt-0.5">{errorBanner}</div>
            </div>
          </div>
          <button
            onClick={() => setErrorBanner(null)}
            className="text-stone-500 hover:text-stone-900 font-mono text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Conversational Thread Area */}
      <div className="rounded-none bg-white border border-stone-300 shadow-[3px_3px_0px_0px_#1C1917] p-6 space-y-6 min-h-[500px] flex flex-col justify-between">
        {/* Messages Feed */}
        <div className="space-y-6 flex-1 overflow-y-auto pr-1">
          {messages.map((msg) => {
            const hasOperations = (msg.timeline && msg.timeline.length > 0) || (msg.planSteps && msg.planSteps.length > 0);
            const isDetailsExpanded = expandedDetailsMap[msg.id] || false;

            return (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col space-y-2",
                  msg.sender === "user" ? "items-end" : "items-start"
                )}
              >
                {/* Sender & Timestamp Header */}
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-stone-400">
                  {msg.sender === "user" ? (
                    <>
                      <span>{msg.timestamp}</span>
                      <span className="font-bold text-stone-700">Operator ({currentRole})</span>
                    </>
                  ) : (
                    <>
                      <span className="font-bold text-[#C85A32] flex items-center gap-1">
                        <Bot className="w-3.5 h-3.5" /> Nexus Agent
                      </span>
                      <span>{msg.timestamp}</span>
                    </>
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={cn(
                    "p-5 rounded-none max-w-3xl text-xs leading-relaxed space-y-4 border",
                    msg.sender === "user"
                      ? "bg-[#FAF8F5] border-stone-400 text-stone-900 shadow-[2px_2px_0px_0px_#1C1917] font-medium"
                      : "bg-white border-stone-300 text-stone-800 shadow-[2px_2px_0px_0px_#D6D3D1] w-full"
                  )}
                >
                  {/* Primary Conversational Response Content */}
                  <div className="space-y-2 text-stone-800">
                    {msg.runStatus === "running" && !msg.finalText ? (
                      <div className="flex items-center gap-2 text-stone-600 font-mono py-1">
                        <Loader2 className="w-4 h-4 animate-spin text-[#C85A32]" />
                        <span>Analyzing intent and synthesizing platform telemetry...</span>
                      </div>
                    ) : (
                      renderFormattedText(msg.text)
                    )}
                  </div>

                  {/* Human-in-the-Loop Governance Checkpoint Card */}
                  {msg.runStatus === "awaiting_approval" && msg.pendingApproval && (
                    <div className="p-5 rounded-none bg-[#FDFBF7] border-2 border-[#C85A32] shadow-[3px_3px_0px_0px_#1C1917] space-y-3.5 animate-in fade-in">
                      <div className="flex items-center justify-between border-b border-[#E8C2B3] pb-2">
                        <div>
                          <div className="text-[10px] font-mono uppercase tracking-widest text-[#C85A32] font-bold">
                            Governance Checkpoint
                          </div>
                          <div className="font-serif text-base font-bold text-stone-900">
                            Admin Authorization Required
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-none text-[9px] font-mono font-bold uppercase tracking-wider bg-[#FDF2F2] text-[#B91C1C] border border-[#FCA5A5]">
                          HIGH RISK
                        </span>
                      </div>

                      <p className="text-xs text-stone-700 leading-relaxed">
                        The agent has prepared the campaign and paused execution. Outbound bulk emails will not be dispatched without explicit Admin confirmation.
                      </p>

                      <div className="p-3 rounded-none bg-white border border-stone-300 space-y-1.5 text-xs">
                        <div className="flex justify-between items-center text-stone-600">
                          <span className="font-mono text-[11px]">Action:</span>
                          <span className="font-mono text-[#C85A32] font-bold">{msg.pendingApproval.tool}</span>
                        </div>
                        {msg.pendingApproval.campaignSubject && (
                          <div className="flex justify-between items-start text-stone-600 gap-2">
                            <span className="font-mono text-[11px] flex-shrink-0">Subject:</span>
                            <span className="text-right text-stone-900 font-medium">{msg.pendingApproval.campaignSubject}</span>
                          </div>
                        )}
                        {msg.pendingApproval.recipientCount !== undefined && (
                          <div className="flex justify-between items-center text-stone-600">
                            <span className="font-mono text-[11px]">Recipients:</span>
                            <span className="text-stone-900 font-bold font-mono">{msg.pendingApproval.recipientCount} CRM Leads</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-stone-600">
                          <span className="font-mono text-[11px]">Destination Gateway:</span>
                          <span className="text-[#92400E] font-medium font-mono">Mailtrap Sandbox (Safe Staging)</span>
                        </div>
                      </div>

                      {currentRole === "admin" ? (
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <button
                            onClick={() => handleDecision(msg.runId!, true)}
                            disabled={decisionLoading}
                            className="py-2.5 px-4 rounded-none bg-[#4A5D4E] hover:bg-[#3B4A3E] text-white font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_#1C1917] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {decisionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            Authorize & Send
                          </button>

                          <button
                            onClick={() => handleDecision(msg.runId!, false)}
                            disabled={decisionLoading}
                            className="py-2.5 px-4 rounded-none bg-white hover:bg-stone-100 border border-stone-900 text-stone-900 font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_#1C1917] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {decisionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                            Reject Broadcast
                          </button>
                        </div>
                      ) : (
                        <div className="p-3 bg-stone-100 border border-stone-300 text-stone-700 text-xs font-mono">
                          Notice: Only an <strong>ADMIN</strong> can authorize or reject this high-risk operation. You are currently <strong>{currentRole.toUpperCase()}</strong>.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Created Assets Card */}
                  {msg.reportSummary && msg.reportSummary.createdEntities.length > 0 && (
                    <div className="p-4 rounded-none bg-[#FAF8F5] border border-stone-300 space-y-3">
                      <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-[#C85A32]" />
                          <span className="font-serif font-bold text-stone-900 text-xs">
                            Created Business Assets & Live Endpoints
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-[#4A5D4E] font-bold">
                          +{msg.reportSummary.hoursSaved} hrs saved
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {msg.reportSummary.createdEntities.map((entity, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-none bg-white border border-stone-300 flex flex-col justify-between gap-3 shadow-[2px_2px_0px_0px_#1C1917]"
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-mono uppercase tracking-wider text-stone-500 font-bold">
                                  {entity.type}
                                </span>
                                {(entity.type === "Webinar Room" || entity.type === "Scheduled Meeting") && (
                                  <span
                                    className={cn(
                                      "px-1.5 py-0.5 rounded-none text-[9px] font-mono font-bold uppercase tracking-wider",
                                      entity.type === "Scheduled Meeting"
                                        ? "bg-[#FBF4EC] text-[#9A3412] border border-[#FED7AA]"
                                        : "bg-[#F2F7F4] text-[#2F5D38] border border-[#A7D7B5]"
                                    )}
                                  >
                                    {entity.type === "Scheduled Meeting" ? "SCHEDULED" : "LIVE ROOM"}
                                  </span>
                                )}
                              </div>
                              <div className="font-medium text-xs text-stone-900 mt-1 font-serif">
                                {entity.name}
                              </div>
                              {entity.meta && (
                                <div className="text-[10px] font-mono text-stone-500 mt-0.5">
                                  {entity.meta}
                                </div>
                              )}
                            </div>
                            {entity.url && (
                              <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                                {(entity.type === "Webinar Room" || entity.type === "Scheduled Meeting") ? (
                                  <>
                                    <a
                                      href={entity.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none bg-stone-900 hover:bg-stone-800 text-white text-[10px] font-mono font-bold uppercase tracking-wider shadow-[2px_2px_0px_0px_#C85A32] hover:translate-x-[0.5px] hover:translate-y-[0.5px] transition-all cursor-pointer"
                                    >
                                      <Tv className="w-3 h-3 text-[#E8C2B3]" />
                                      <span>{entity.type === "Scheduled Meeting" ? "Access Room" : "Join Meeting"}</span>
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                    <Link
                                      href="/webinars"
                                      className="text-[10px] font-mono font-bold text-[#C85A32] hover:underline flex items-center gap-1"
                                    >
                                      Webinars →
                                    </Link>
                                  </>
                                ) : (
                                  <Link
                                    href={entity.url}
                                    target="_blank"
                                    className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-[#C85A32] hover:underline"
                                  >
                                    <span>Open Asset</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </Link>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Collapsible Technical Execution Section */}
                  {hasOperations && (
                    <div className="pt-2 border-t border-stone-200">
                      <button
                        onClick={() => toggleDetails(msg.id)}
                        className="flex items-center justify-between w-full p-2 rounded-none bg-stone-50 hover:bg-stone-100 border border-stone-300 text-stone-700 text-xs font-mono font-medium transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5 text-stone-500" />
                          <span>Technical Execution & Audit Trail ({msg.timeline?.length || 0} operations)</span>
                        </div>
                        {isDetailsExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-stone-600" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-stone-600" />
                        )}
                      </button>

                      {isDetailsExpanded && (
                        <div className="mt-3 space-y-4 p-3 bg-white border border-stone-300 rounded-none animate-in fade-in">
                          {/* Plan Checklist */}
                          {msg.planSteps && msg.planSteps.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-stone-500">
                                Milestone Plan
                              </div>
                              <div className="space-y-1">
                                {msg.planSteps.map((step, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-start gap-2 p-1.5 rounded-none bg-[#FAF8F5] border border-stone-200 text-[11px] text-stone-800"
                                  >
                                    <span className="w-4 h-4 bg-stone-900 text-white flex items-center justify-center font-mono text-[9px] font-bold flex-shrink-0">
                                      {idx + 1}
                                    </span>
                                    <span className="leading-snug">{step}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Execution Timeline */}
                          {msg.timeline && msg.timeline.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-stone-500">
                                Operation Stream & Logs
                              </div>
                              <div className="space-y-1.5">
                                {msg.timeline.map((item) => {
                                  const isExpanded = expandedLogId === item.id;
                                  return (
                                    <div
                                      key={item.id}
                                      className="rounded-none bg-[#FAF8F5] border border-stone-300 overflow-hidden text-xs"
                                    >
                                      <div
                                        onClick={() => setExpandedLogId(isExpanded ? null : item.id)}
                                        className="p-2 flex items-center justify-between cursor-pointer hover:bg-stone-100 transition-colors"
                                      >
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-mono text-xs font-bold text-stone-900">
                                            {item.tool}
                                          </span>
                                          {getRiskBadge(item.risk)}
                                          {getStatusBadge(item.status)}
                                        </div>

                                        <div className="flex items-center gap-2 text-stone-500 text-[10px] font-mono">
                                          <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                                          {isExpanded ? (
                                            <ChevronDown className="w-3 h-3 text-stone-800" />
                                          ) : (
                                            <ChevronRight className="w-3 h-3 text-stone-500" />
                                          )}
                                        </div>
                                      </div>

                                      {isExpanded && (
                                        <div className="p-2.5 border-t border-stone-200 bg-white space-y-2 text-[11px]">
                                          <div>
                                            <div className="font-mono font-bold uppercase text-[9px] text-stone-500 mb-1">
                                              Arguments
                                            </div>
                                            <pre className="p-2 rounded-none bg-[#F5F2EB] text-stone-900 font-mono overflow-x-auto border border-stone-300 text-[10px]">
                                              {JSON.stringify(item.args, null, 2)}
                                            </pre>
                                          </div>
                                          <div>
                                            <div className="font-mono font-bold uppercase text-[9px] text-stone-500 mb-1">
                                              Result Payload
                                            </div>
                                            <pre className="p-2 rounded-none bg-[#F5F2EB] text-stone-900 font-mono overflow-x-auto border border-stone-300 text-[10px]">
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
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="pt-4 border-t border-stone-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="Ask an informational question, query business data, or enter a workflow command..."
                disabled={running}
                className="w-full px-4 py-3 rounded-none bg-[#FAF8F5] border border-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none text-xs text-stone-900 transition-all shadow-[inset_1px_1px_0px_0px_rgba(0,0,0,0.05)] disabled:opacity-60"
              />
            </div>

            <button
              type="submit"
              disabled={running || !inputPrompt.trim()}
              className="px-5 py-3 rounded-none bg-[#1C1917] hover:bg-[#C85A32] text-white font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_#1C1917] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer flex-shrink-0"
            >
              {running ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </>
              )}
            </button>
          </form>
          <div className="flex items-center justify-between text-[10px] font-mono text-stone-500 mt-2 px-1">
            <span>Dynamic Intent Detection • Context-Aware Reasoning • Role Governance</span>
            <span>Sub-second telemetry execution</span>
          </div>
        </div>
      </div>
    </div>
  );
}
