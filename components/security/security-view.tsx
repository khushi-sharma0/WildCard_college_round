"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileClock,
  LockKeyhole,
  ShieldAlert,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
import type { AgentRun, ApprovalRecord, AuditLog } from "@/lib/services";
import { formatDate } from "@/lib/utils";

type Role = "admin" | "marketer" | "viewer";

export default function SecurityView({
  initialRuns,
  initialLogs,
  initialApprovals,
  role,
}: {
  initialRuns: AgentRun[];
  initialLogs: AuditLog[];
  initialApprovals: ApprovalRecord[];
  role: Role;
}) {
  const [runs, setRuns] = useState(initialRuns);
  const [logs, setLogs] = useState(initialLogs);
  const [approvals, setApprovals] = useState(initialApprovals);
  const [filter, setFilter] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestAction, setRequestAction] = useState("");
  const [requestDescription, setRequestDescription] = useState("");
  const [requestRisk, setRequestRisk] = useState<"low" | "medium" | "high">("medium");
  const [creatingRequest, setCreatingRequest] = useState(false);
  const router = useRouter();
  const selectedRun = runs.find((run) => run.id === selectedRunId) ?? null;

  useEffect(() => {
    setLogs(initialLogs);
    setRuns(initialRuns);
    setApprovals(initialApprovals);
  }, [initialApprovals, initialLogs, initialRuns]);

  const pending = useMemo(() => runs.filter((run) => run.status === "awaiting_approval" && run.pending_tool && approvals.some((approval) => approval.run_id === run.id && approval.status === "pending")), [approvals, runs]);
  const blockedLogs = useMemo(() => logs.filter((log) => log.status === "blocked"), [logs]);
  const failedRuns = useMemo(() => runs.filter((run) => run.status === "failed"), [runs]);
  const visibleLogs = useMemo(
    () => logs.filter((log) => filter === "all" || log.risk === filter),
    [logs, filter]
  );

  async function decide(runId: string, approved: boolean) {
    if (role !== "marketer" && role !== "admin") {
      setMessage("Only Admin and Marketer identities can approve or reject actions.");
      return;
    }
    setBusyId(runId);
    setMessage("");
    try {
      const targetRun = runs.find((run) => run.id === runId);
      const requestedTool = targetRun?.pending_tool?.tool || "action";
      const requestedRisk = targetRun?.pending_tool?.risk || "high";
      const response = await fetch("/api/agent/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId, approved }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Decision could not be saved.");
      setRuns((current) => current.map((run) => run.id === runId ? data.run : run));
      if (data.approval) setApprovals((current) => current.map((approval) => approval.run_id === runId ? data.approval : approval));
      
      // Update local logs immediately so audit counter and events table update
      const decisionLog: AuditLog = {
        id: `audit-${Date.now()}`,
        workspace_id: data.run?.workspace_id || "default",
        run_id: runId,
        role,
        tool: requestedTool,
        risk: requestedRisk as any,
        status: approved ? "approved" : "rejected",
        args: targetRun?.pending_tool?.args || {},
        result: { message: approved ? `Approved by ${role}; action recorded.` : `Rejected by ${role}; action was not executed.` },
        created_at: new Date().toISOString()
      };
      setLogs((current) => [decisionLog, ...current]);

      setMessage(approved ? (requestedTool === "manual_review" ? "Request approved. No automated action was configured." : "Approval recorded and workflow execution requested.") : "Workflow rejected. No pending action will be executed.");
      setSelectedRunId(null);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  async function createRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creatingRequest || !requestAction.trim() || !requestDescription.trim()) return;
    setCreatingRequest(true);
    setMessage("");
    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "approval_request", actionName: requestAction.trim(), description: requestDescription.trim(), risk: requestRisk }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create approval request.");
      setRuns((current) => [data.run, ...current.filter((run) => run.id !== data.run.id)]);
      if (data.approval) setApprovals((current) => [data.approval, ...current.filter((approval) => approval.run_id !== data.run.id)]);
      
      // Prepend audit record
      const creationLog: AuditLog = {
        id: `audit-${Date.now()}`,
        workspace_id: data.run?.workspace_id || "default",
        run_id: data.run?.id,
        role,
        tool: requestAction.trim(),
        risk: requestRisk,
        status: "pending_approval",
        args: { action_name: requestAction.trim(), description: requestDescription.trim() },
        result: { message: "Approval request created." },
        created_at: new Date().toISOString()
      };
      setLogs((current) => [creationLog, ...current]);

      setRequestDescription("");
      setRequestAction("");
      setRequestOpen(false);
      setMessage("Approval request saved. It is now in the queue and workflow history.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create approval request.");
    } finally {
      setCreatingRequest(false);
    }
  }

  const cardClass = "border border-stone-300 bg-white p-4 shadow-[2px_2px_0px_0px_#1C1917]";
  const buttonClass = "inline-flex items-center justify-center gap-2 border px-3 py-2 text-xs font-mono font-bold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="space-y-7 text-stone-900">
      <header className="flex flex-col justify-between gap-4 border-b border-stone-300 pb-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#C85A32]"><ShieldCheck className="h-4 w-4" /> Governance / Policies / Access control</div>
          <h1 className="font-serif text-3xl font-bold tracking-tight md:text-4xl">Workflow Security</h1>
          <p className="mt-2 max-w-2xl text-sm text-stone-600">Monitor agent actions, review approval checkpoints, and inspect the workspace governance trail.</p>
        </div>
        <div className="inline-flex items-center gap-2 border border-stone-300 bg-[#F5F2EB] px-3 py-2 text-xs font-mono uppercase"><LockKeyhole className="h-4 w-4 text-[#C85A32]" /> Current role: <strong>{role}</strong></div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Live security overview">
        <div className={cardClass}><div className="flex items-center justify-between text-xs text-stone-500"><span>Pending approvals</span><Clock3 className="h-4 w-4 text-[#C85A32]" /></div><div className="mt-3 text-3xl font-bold">{pending.length}</div><p className="mt-1 text-xs text-stone-500">Live agent runs awaiting a decision</p></div>
        <div className={cardClass}><div className="flex items-center justify-between text-xs text-stone-500"><span>Blocked actions</span><ShieldAlert className="h-4 w-4 text-amber-700" /></div><div className="mt-3 text-3xl font-bold">{blockedLogs.length}</div><p className="mt-1 text-xs text-stone-500">Recorded authorization or policy blocks</p></div>
        <div className={cardClass}><div className="flex items-center justify-between text-xs text-stone-500"><span>Failed executions</span><CircleAlert className="h-4 w-4 text-red-700" /></div><div className="mt-3 text-3xl font-bold">{failedRuns.length}</div><p className="mt-1 text-xs text-stone-500">Agent runs recorded with failed status</p></div>
        <div className={cardClass}><div className="flex items-center justify-between text-xs text-stone-500"><span>Audit events</span><FileClock className="h-4 w-4 text-stone-700" /></div><div className="mt-3 text-3xl font-bold">{logs.length}</div><p className="mt-1 text-xs text-stone-500">Records returned by the workspace audit service</p></div>
      </section>

      {message && <div role="status" className="border border-stone-300 bg-[#F5F2EB] px-4 py-3 text-sm">{message}</div>}

      <section className="space-y-3">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end"><div><h2 className="font-serif text-2xl font-bold">Agent approval queue</h2><p className="mt-1 text-xs text-stone-500">Pending actions remain paused until an Admin or Marketer decides.</p></div><div className="flex items-center gap-2"><span className="border border-stone-300 bg-white px-2 py-1 text-[10px] font-mono uppercase">{pending.length} pending</span>{role !== "viewer" && <button type="button" onClick={() => setRequestOpen(true)} className="inline-flex items-center gap-1 border border-stone-900 bg-stone-900 px-3 py-2 text-[10px] font-mono font-bold uppercase text-white hover:bg-stone-700 cursor-pointer">Create request <ArrowUpRight className="h-3 w-3" /></button>}</div></div>
        {pending.length === 0 ? (
          <div className="border border-dashed border-stone-300 bg-white p-8 text-center"><ShieldCheck className="mx-auto h-8 w-8 text-stone-400" /><p className="mt-3 font-semibold">No pending approvals</p><p className="mt-1 text-xs text-stone-500">New sensitive agent actions will appear here when they require review.</p></div>
        ) : pending.map((run) => {
          const risk = run.pending_tool?.risk ?? "high";
          const canDecide = role === "marketer" || role === "admin";
          return (
            <article key={run.id} className="border border-stone-300 bg-white p-4 shadow-[2px_2px_0px_0px_#1C1917] md:p-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><span className="border border-red-300 bg-red-50 px-2 py-1 text-[10px] font-mono font-bold uppercase text-red-800">{risk} risk</span><span className="text-[10px] font-mono uppercase text-stone-500">Run {run.id}</span><span className="border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] font-mono font-bold uppercase text-amber-900">Pending</span></div>
                  <h3 className="mt-3 text-base font-bold">{String(run.pending_tool?.args.action_name ?? run.pending_tool?.tool.replace(/_/g, " "))}</h3>
                  <p className="mt-1 text-sm text-stone-600">{run.prompt}</p>
                  <p className="mt-2 text-xs text-stone-500">Requested {formatDate(run.created_at)} · Requesting role: {run.role}</p>
                </div>
                {canDecide && <div className="flex shrink-0 flex-wrap gap-2"><button disabled={busyId === run.id} onClick={() => decide(run.id, false)} className={`${buttonClass} border-red-300 bg-white text-red-800 hover:bg-red-50 cursor-pointer`}><XCircle className="h-4 w-4" /> Reject</button><button disabled={busyId === run.id} onClick={() => decide(run.id, true)} className={`${buttonClass} border-stone-900 bg-stone-900 text-white hover:bg-stone-700 cursor-pointer`}><CheckCircle2 className="h-4 w-4" /> {busyId === run.id ? "Processing" : run.pending_tool?.tool === "manual_review" ? "Approve" : "Approve & execute"}</button></div>}
              </div>
              <button onClick={() => setSelectedRunId(run.id)} className="mt-4 inline-flex items-center gap-1 text-xs font-mono text-[#C85A32] hover:underline cursor-pointer">Review approval <ArrowUpRight className="h-3 w-3" /></button>
              {!canDecide && <p className="mt-3 text-xs text-amber-800">Approval controls are available to Marketer and Admin roles.</p>}
            </article>
          );
        })}
      </section>

      {requestOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !creatingRequest) setRequestOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="new-request-title" className="w-full max-w-lg border border-stone-300 bg-[#FAF8F5] p-5 shadow-[4px_4px_0px_0px_#1C1917]">
          <div className="flex items-start justify-between"><div><p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#C85A32]">New approval request</p><h2 id="new-request-title" className="mt-1 font-serif text-2xl font-bold">Request an agent action</h2></div><button type="button" onClick={() => setRequestOpen(false)} disabled={creatingRequest} aria-label="Close" className="border border-stone-300 bg-white p-2 hover:bg-stone-100 cursor-pointer"><X className="h-4 w-4" /></button></div>
          <form onSubmit={createRequest} className="mt-4 space-y-4">
            <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500">Action name<input value={requestAction} onChange={(event) => setRequestAction(event.target.value)} required maxLength={100} placeholder="e.g. Export customer list" className="mt-1 block w-full border border-stone-300 bg-white p-2 text-sm font-sans normal-case text-stone-900" /></label>
            <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500">Request description<textarea value={requestDescription} onChange={(event) => setRequestDescription(event.target.value)} required maxLength={1000} rows={3} placeholder="Explain what the agent action needs to do." className="mt-1 block w-full border border-stone-300 bg-white p-2 text-sm font-sans normal-case text-stone-900" /></label>
            <div className="grid grid-cols-2 gap-3"><label className="border border-stone-300 bg-white p-3"><span className="text-[10px] font-mono uppercase text-stone-500">Risk level</span><select value={requestRisk} onChange={(event) => setRequestRisk(event.target.value as "low" | "medium" | "high")} className="mt-1 block w-full border border-stone-300 bg-white p-2 text-sm font-sans normal-case text-stone-900"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><div className="border border-stone-300 bg-white p-3"><div className="text-[10px] font-mono uppercase text-stone-500">Requester role</div><div className="mt-2 text-sm font-bold uppercase">{role}</div></div></div>
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setRequestOpen(false)} disabled={creatingRequest} className="border border-stone-300 bg-white px-4 py-2 text-xs font-mono font-bold uppercase cursor-pointer">Cancel</button><button type="submit" disabled={creatingRequest || !requestAction.trim() || !requestDescription.trim()} className="border border-stone-900 bg-stone-900 px-4 py-2 text-xs font-mono font-bold uppercase text-white disabled:opacity-50 cursor-pointer">{creatingRequest ? "Saving to Supabase..." : "Submit request"}</button></div>
          </form>
        </section>
      </div>}

      <section className="space-y-3">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end"><div><h2 className="font-serif text-2xl font-bold">Workflow history</h2><p className="mt-1 text-xs text-stone-500">Recent agent requests and their current status.</p></div><span className="text-[10px] font-mono uppercase text-stone-500">{runs.length} requests · {pending.length} pending</span></div>
        <div className="overflow-x-auto border border-stone-300 bg-white shadow-[2px_2px_0px_0px_#1C1917]"><table className="w-full min-w-[760px] text-left text-xs"><thead className="border-b border-stone-300 bg-[#F5F2EB] text-[10px] uppercase tracking-wider text-stone-600"><tr><th className="px-4 py-3">Workflow</th><th className="px-4 py-3">Requester</th><th className="px-4 py-3">Started</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Decision</th><th className="px-4 py-3"></th></tr></thead><tbody className="divide-y divide-stone-200">{runs.map((run) => { const approval = approvals.find((item) => item.run_id === run.id); const statusLabel = run.status === "awaiting_approval" ? "Pending Approval" : run.status === "completed" ? "Executed" : run.status.replace(/_/g, " "); return <tr key={run.id} className="hover:bg-[#FAF8F5]"><td className="max-w-sm truncate px-4 py-3 font-medium">{run.prompt}</td><td className="px-4 py-3 uppercase">{run.role}</td><td className="whitespace-nowrap px-4 py-3 font-mono text-stone-500">{formatDate(run.created_at)}</td><td className="px-4 py-3"><span className={`border px-2 py-1 text-[10px] font-mono uppercase ${run.status === "awaiting_approval" ? "border-amber-300 bg-amber-50 text-amber-900" : run.status === "failed" || run.status === "rejected" ? "border-red-200 bg-red-50 text-red-800" : "border-stone-200 bg-stone-50 text-stone-600"}`}>{statusLabel}</span></td><td className="px-4 py-3 capitalize">{approval?.status ?? "—"}</td><td className="px-4 py-3 text-right"><button onClick={() => setSelectedRunId(run.id)} className="border border-stone-300 bg-white px-3 py-1.5 text-[10px] font-mono uppercase hover:bg-stone-100 cursor-pointer">View</button></td></tr>; })}{runs.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-stone-500">No requests have been recorded yet. Create a request above to start the history.</td></tr>}</tbody></table></div>
      </section>

      {selectedRun && <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedRunId(null); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="workflow-review-title" className="w-full max-w-xl border border-stone-300 bg-[#FAF8F5] p-5 shadow-[4px_4px_0px_0px_#1C1917]">
          <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#C85A32]">Workflow review</p><h2 id="workflow-review-title" className="mt-1 font-serif text-2xl font-bold">{String(selectedRun.pending_tool?.args.action_name ?? selectedRun.pending_tool?.tool.replace(/_/g, " ") ?? "Agent request")}</h2></div><button onClick={() => setSelectedRunId(null)} aria-label="Close" className="border border-stone-300 bg-white p-2 hover:bg-stone-100 cursor-pointer"><X className="h-4 w-4" /></button></div>
          <div className="mt-4 border border-stone-300 bg-white p-4"><div className="flex flex-wrap items-center gap-2"><span className="border border-stone-300 bg-[#F5F2EB] px-2 py-1 text-[10px] font-mono uppercase">{selectedRun.status.replace(/_/g, " ")}</span>{selectedRun.pending_tool?.risk && <span className="border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-mono uppercase text-red-800">{selectedRun.pending_tool.risk} risk</span>}{approvals.find((approval) => approval.run_id === selectedRun.id) && <span className="border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-mono uppercase text-emerald-800">Decision: {approvals.find((approval) => approval.run_id === selectedRun.id)?.status}</span>}</div><p className="mt-3 text-sm">{selectedRun.prompt}</p><p className="mt-2 text-[11px] font-mono text-stone-500">Run {selectedRun.id} · {formatDate(selectedRun.created_at)} · Requesting role: {selectedRun.role}</p>
            {selectedRun.pending_tool && <><h3 className="mt-4 text-[10px] font-mono font-bold uppercase tracking-widest text-stone-500">Action parameters</h3><pre className="mt-2 max-h-40 overflow-auto border border-stone-200 bg-[#F5F2EB] p-3 text-xs">{JSON.stringify(selectedRun.pending_tool.args, null, 2)}</pre></>}
            {selectedRun.final_text && <p className="mt-3 whitespace-pre-wrap text-xs text-stone-600">{selectedRun.final_text}</p>}
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2"><button onClick={() => setSelectedRunId(null)} className="border border-stone-300 bg-white px-4 py-2 text-xs font-mono font-bold uppercase hover:bg-stone-100 cursor-pointer">Decide later</button>{selectedRun.status === "awaiting_approval" && selectedRun.pending_tool && (role === "marketer" || role === "admin") && <><button disabled={busyId === selectedRun.id} onClick={() => decide(selectedRun.id, false)} className="inline-flex items-center gap-2 border border-red-300 bg-white px-4 py-2 text-xs font-mono font-bold uppercase text-red-800 disabled:opacity-50 hover:bg-red-50 cursor-pointer"><XCircle className="h-4 w-4" /> Reject</button><button disabled={busyId === selectedRun.id} onClick={() => decide(selectedRun.id, true)} className="inline-flex items-center gap-2 border border-emerald-700 bg-emerald-700 px-4 py-2 text-xs font-mono font-bold uppercase text-white disabled:opacity-50 hover:bg-emerald-800 cursor-pointer"><CheckCircle2 className="h-4 w-4" /> {selectedRun.pending_tool.tool === "manual_review" ? "Approve" : "Approve & execute"}</button></>}</div>
        </section>
      </div>}

      {blockedLogs.length > 0 && <section className="space-y-3"><div><h2 className="font-serif text-2xl font-bold">Blocked and flagged actions</h2><p className="mt-1 text-xs text-stone-500">Recent actions denied by a recorded permission or policy check.</p></div><div className="grid gap-2 md:grid-cols-2">{blockedLogs.slice(0, 6).map((log) => <article key={log.id} className="border border-amber-300 bg-amber-50 p-3"><div className="flex items-center justify-between gap-2"><strong className="text-xs">{log.tool.replace(/_/g, " ")}</strong><span className="text-[10px] font-mono uppercase text-amber-900">{log.risk} risk · Blocked</span></div><p className="mt-1 text-[11px] text-stone-600">{String(log.result?.error ?? log.result?.message ?? "Policy denied this operation.")}</p><p className="mt-2 text-[10px] font-mono uppercase text-stone-500">{formatDate(log.created_at)} · {log.role}</p></article>)}</div></section>}

      <section className="space-y-3">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h2 className="font-serif text-2xl font-bold">Recent security events</h2><p className="mt-1 text-xs text-stone-500">Timestamp, actor role, action, risk and recorded result from the audit trail.</p></div><div className="flex items-center gap-2"><div className="flex gap-1">{["all", "low", "medium", "high"].map((risk) => <button key={risk} onClick={() => setFilter(risk)} className={`border px-3 py-1.5 text-[10px] font-mono font-bold uppercase ${filter === risk ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white text-stone-600"}`}>{risk}</button>)}</div><Link href="/audit" className="inline-flex items-center gap-1 border border-stone-900 bg-white px-3 py-1.5 text-[10px] font-mono font-bold uppercase hover:bg-stone-100">Audit log <ArrowUpRight className="h-3 w-3" /></Link></div></div>
        <div className="overflow-x-auto border border-stone-300 bg-white shadow-[2px_2px_0px_0px_#1C1917]"><table className="w-full text-left text-xs"><thead className="border-b border-stone-300 bg-[#F5F2EB] text-[10px] uppercase tracking-wider text-stone-600"><tr><th className="px-4 py-3">Timestamp</th><th className="px-4 py-3">Actor role</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Risk</th><th className="px-4 py-3">Result</th></tr></thead><tbody className="divide-y divide-stone-200">{visibleLogs.slice(0, 30).map((log) => <tr key={log.id} className="hover:bg-[#FAF8F5]"><td className="whitespace-nowrap px-4 py-3 font-mono text-stone-500">{formatDate(log.created_at)}</td><td className="px-4 py-3 uppercase">{log.role}</td><td className="px-4 py-3 font-semibold">{log.tool.replace(/_/g, " ")}</td><td className="px-4 py-3"><span className={`border px-2 py-1 text-[10px] font-mono uppercase ${log.risk === "high" ? "border-red-200 bg-red-50 text-red-800" : log.risk === "medium" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-stone-200 bg-stone-50 text-stone-600"}`}>{log.risk}</span></td><td className="px-4 py-3"><span className="font-semibold uppercase">{log.status.replace(/_/g, " ")}</span>{(log.result?.message || log.result?.error) && <p className="mt-1 max-w-xs text-[11px] font-normal normal-case text-stone-500">{String(log.result.message ?? log.result.error)}</p>}</td></tr>)}{visibleLogs.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-stone-500">No audit events found for this risk level.</td></tr>}</tbody></table></div>
      </section>

    </div>
  );
}
