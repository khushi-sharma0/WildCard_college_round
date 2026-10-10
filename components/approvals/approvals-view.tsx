"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import type { ApprovalRequest } from "@/lib/services";
import { formatDate } from "@/lib/utils";
import { notifyToast } from "@/lib/toast";

export default function ApprovalsView({
  initialApprovals
}: {
  initialApprovals: ApprovalRequest[];
}) {
  const [approvals, setApprovals] = useState(initialApprovals);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => setApprovals(initialApprovals), [initialApprovals]);

  async function decide(approval: ApprovalRequest, approved: boolean) {
    setBusyId(approval.id);
    try {
      const response = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: approval.id, approved, reason: reason[approval.id] || "" })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not process approval.");
      setApprovals((current) =>
        current.map((item) => item.id === approval.id ? data.approval : item)
      );
      notifyToast("success", approved ? "Request approved and action resumed." : "Request rejected.");
    } catch (error) {
      notifyToast("error", error instanceof Error ? error.message : "Could not process approval.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="space-y-6">
      <header className="border-b border-stone-300 pb-4">
        <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-[#C85A32]">
          Admin Governance
        </p>
        <h1 className="font-serif text-3xl font-bold">Approvals Inbox</h1>
        <p className="mt-1 text-sm text-stone-600">Review sensitive actions requested by Marketers.</p>
      </header>
      {approvals.length === 0 ? (
        <p className="border border-dashed border-stone-400 bg-white p-8 text-center text-sm text-stone-500">
          No approval requests yet.
        </p>
      ) : (
        <div className="space-y-3">
          {approvals.map((approval) => (
            <article key={approval.id} className="border border-stone-300 bg-white p-5 shadow-[2px_2px_0px_0px_#1C1917]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-serif text-lg font-bold">{approval.action.replace(/_/g, " ")}</h2>
                  <p className="mt-1 text-xs text-stone-500">
                    Requested by {approval.requested_by} · {formatDate(approval.created_at)}
                  </p>
                  <pre className="mt-3 whitespace-pre-wrap break-all bg-[#FAF8F5] p-3 text-xs text-stone-700">
                    {JSON.stringify(approval.args, null, 2)}
                  </pre>
                </div>
                <span className="border border-stone-300 bg-stone-100 px-2 py-1 font-mono text-[10px] uppercase">
                  {approval.status}
                </span>
              </div>
              {approval.status === "pending" && (
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <input
                    value={reason[approval.id] || ""}
                    onChange={(event) => setReason((current) => ({ ...current, [approval.id]: event.target.value }))}
                    placeholder="Optional reason"
                    maxLength={500}
                    className="min-w-0 flex-1 border border-stone-300 bg-[#FAF8F5] px-3 py-2 text-xs"
                  />
                  <button
                    type="button"
                    disabled={busyId === approval.id}
                    onClick={() => decide(approval, true)}
                    className="flex items-center justify-center gap-2 border border-[#4A5D4E] bg-[#4A5D4E] px-4 py-2 text-xs font-mono font-bold uppercase text-white disabled:opacity-50"
                  >
                    {busyId === approval.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busyId === approval.id}
                    onClick={() => decide(approval, false)}
                    className="flex items-center justify-center gap-2 border border-[#991B1B] bg-white px-4 py-2 text-xs font-mono font-bold uppercase text-[#991B1B] disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    Reject
                  </button>
                </div>
              )}
              {approval.reason && approval.status !== "pending" && (
                <p className="mt-3 text-xs text-stone-600">Reason: {approval.reason}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
