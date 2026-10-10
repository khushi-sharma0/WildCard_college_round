"use client";

import { useState } from "react";
import {
  Send,
  Plus,
  Lock,
  AlertCircle,
  Sparkles,
  Calendar as CalendarIcon,
  List,
  Building2
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function MarketingView({
  initialCampaigns,
  segments,
  role,
  plans,
  subscriptions,
  workspaces: initialWorkspaces
}: {
  initialCampaigns: any[];
  segments: any[];
  role: string;
  plans: any[];
  subscriptions: any[];
  workspaces: any[];
}) {
  const [campaigns, setCampaigns] = useState<any[]>(
    initialCampaigns.map((c) => ({
      ...c,
      open_rate: c.status === "sent" ? Math.floor(Math.random() * 40) + 20 : 0,
      click_rate: c.status === "sent" ? Math.floor(Math.random() * 15) + 5 : 0,
      send_time: c.send_time || c.created_at
    }))
  );
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [confirmSendCampaign, setConfirmSendCampaign] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  // Demo Simulation State
  const mockCompanies = (initialWorkspaces || []).map((w) => ({
    ...w,
    planName: w.name?.includes("Globex") ? "Pro" : w.name?.includes("Initech") ? "Enterprise" : "Basic",
    usedEmails: w.name?.includes("Globex") ? 1200 : w.name?.includes("Initech") ? 15000 : 850,
    included_emails: w.name?.includes("Globex") ? 10000 : w.name?.includes("Initech") ? 100000 : 1000,
    overage_rate: w.name?.includes("Globex") ? 30 : w.name?.includes("Initech") ? 20 : 50
  }));

  const [selectedCompanyId, setSelectedCompanyId] = useState(mockCompanies[0]?.id ?? "");
  const activeCompany = mockCompanies.find((c) => c.id === selectedCompanyId) ?? null;

  // Try to use DB plan, otherwise fallback to hardcoded mock limits
  const activeSub = subscriptions?.find((s) => s.workspace_id === selectedCompanyId && s.status !== "canceled");
  const dbPlan = activeSub ? plans?.find((p) => p.id === activeSub.plan_id) : undefined;
  const activePlan = {
    name: dbPlan?.name ?? activeCompany?.planName ?? "Basic",
    included_emails: dbPlan?.included_emails ?? activeCompany?.included_emails ?? 1000,
    email_overage_rate_cents: dbPlan?.email_overage_rate_cents ?? activeCompany?.overage_rate ?? 50
  };

  // Draft form
  const [segmentId, setSegmentId] = useState(segments[0]?.id || "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sendDate, setSendDate] = useState("");
  const [sendTime, setSendTime] = useState("");
  const [aiBrief, setAiBrief] = useState("");
  const [simulatedRecipients, setSimulatedRecipients] = useState<number>(100);

  const [draftLoading, setDraftLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendSuccessMessage, setSendSuccessMessage] = useState<string | null>(null);

  const isViewer = role === "viewer";

  // Calculate Overage
  const totalEmailsAfterSend = (activeCompany?.usedEmails ?? 0) + simulatedRecipients;
  const isOverage = totalEmailsAfterSend > activePlan.included_emails;
  const overageAmount = isOverage ? totalEmailsAfterSend - activePlan.included_emails : 0;
  const overageCost = isOverage ? (overageAmount * activePlan.email_overage_rate_cents) / 100 : 0;

  async function handleAIGenerate() {
    if (!aiBrief) return;
    setAiLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/marketing/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: aiBrief }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSubject(data.subject);
      setBody(data.body);
    } catch (err: any) {
      setError("AI Generation failed: " + err.message);
    } finally {
      setAiLoading(false);
    }
  }

  async function handleCreateDraft(e: React.FormEvent) {
    e.preventDefault();
    if (isViewer) return;
    setDraftLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segment_id: segmentId,
          subject,
          body,
          send_time: sendDate && sendTime ? `${sendDate}T${sendTime}` : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to draft campaign");

      setCampaigns([{ ...data, open_rate: 0, click_rate: 0 }, ...campaigns]);
      setShowDraftModal(false);
      setSubject("");
      setBody("");
      setSendDate("");
      setSendTime("");
      setSimulatedRecipients(100);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDraftLoading(false);
    }
  }

  async function handleSend(campaign: any) {
    if (isViewer) return;
    setSendLoading(true);
    setError(null);
    setSendSuccessMessage(null);

    try {
      const res = await fetch("/api/marketing/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: campaign.id,
          simulated_recipients: simulatedRecipients,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to dispatch campaign");

      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === campaign.id
            ? {
                ...c,
                status: data.status || "sent",
                sent_count: data.sent_count,
                open_rate: data.status === "sent" ? Math.floor(Math.random() * 30) + 20 : 0,
                click_rate: data.status === "sent" ? Math.floor(Math.random() * 10) + 5 : 0
              }
            : c
        )
      );
      setSendSuccessMessage(data.note || `Dispatched campaign successfully.`);
      setConfirmSendCampaign(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSendLoading(false);
    }
  }

  const renderCalendarView = () => {
    const grouped: Record<string, any[]> = campaigns.reduce((acc: Record<string, any[]>, camp: any) => {
      const d = new Date(camp.send_time || camp.created_at).toLocaleDateString();
      if (!acc[d]) acc[d] = [];
      acc[d].push(camp);
      return acc;
    }, {});

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Object.entries(grouped).map(([date, camps]) => (
          <div
            key={date}
            className="bg-white border border-stone-300 shadow-[2px_2px_0px_0px_#1C1917] p-4 min-h-[150px]"
          >
            <div className="font-bold font-mono text-[#C85A32] text-xs border-b border-stone-200 pb-2 mb-3">
              {date}
            </div>
            <div className="space-y-2">
              {camps.map((c: any) => (
                <div
                  key={c.id}
                  className="text-xs p-2 bg-[#FAF8F5] border border-stone-200 shadow-sm flex flex-col gap-1"
                >
                  <span className="font-semibold text-stone-800 line-clamp-1">{c.subject}</span>
                  <span
                    className={`text-[9px] uppercase font-mono px-1.5 py-0.5 self-start ${
                      c.status === "scheduled"
                        ? "bg-[#FEF3C7] text-[#92400E]"
                        : c.status === "sent"
                        ? "bg-[#EDF2EE] text-[#4A5D4E]"
                        : "bg-stone-200"
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Demo Simulation Bar */}
      <div className="bg-[#FAF8F5] border border-stone-300 p-4 shadow-[2px_2px_0px_0px_#1C1917] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-[#C85A32]" />
          <div>
            <label className="text-[10px] uppercase font-bold font-mono text-stone-500">
              Simulate Workspace Account
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              disabled={mockCompanies.length === 0}
              className="block w-48 mt-1 px-2 py-1 bg-white border border-stone-300 text-xs font-mono font-bold"
            >
              {mockCompanies.length === 0 ? (
                <option value="">No workspaces available</option>
              ) : (
                mockCompanies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="ml-4 pl-4 border-l border-stone-300">
            <label className="text-[10px] uppercase font-bold font-mono text-stone-500">Simulate Role</label>
            <select
              value={role}
              onChange={(e) => {
                document.cookie = `role=${e.target.value}; path=/`;
                window.location.reload();
              }}
              className="block w-32 mt-1 px-2 py-1 bg-white border border-stone-300 text-xs font-mono font-bold"
            >
              <option value="admin">Admin</option>
              <option value="marketer">Marketer</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-6 text-right">
          <div>
            <div className="text-[10px] uppercase font-bold font-mono text-stone-500">Current Plan</div>
            <div className="text-sm font-bold text-stone-900">
              {activePlan.name} Plan
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold font-mono text-stone-500">Monthly Usage</div>
            <div
              className={`text-sm font-bold font-mono ${
                (activeCompany?.usedEmails ?? 0) >= activePlan.included_emails
                  ? "text-[#991B1B]"
                  : "text-[#4A5D4E]"
              }`}
            >
              {activeCompany
                ? `${activeCompany.usedEmails.toLocaleString()} / ${activePlan.included_emails.toLocaleString()}`
                : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-300">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-stone-900">
            Marketing Automation
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            AI-driven templates, scheduling, and usage-based billing integration.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center border border-stone-300 bg-white shadow-[2px_2px_0px_0px_#1C1917]">
            <button
              onClick={() => setViewMode("list")}
              className={`px-4 py-2 font-mono text-xs uppercase cursor-pointer ${
                viewMode === "list" ? "bg-stone-100 font-bold" : "text-stone-500 hover:bg-stone-50"
              }`}
            >
              <List className="w-3.5 h-3.5 inline mr-1" /> List
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`px-4 py-2 font-mono text-xs uppercase border-l border-stone-300 cursor-pointer ${
                viewMode === "calendar" ? "bg-stone-100 font-bold" : "text-stone-500 hover:bg-stone-50"
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5 inline mr-1" /> Calendar
            </button>
          </div>

          <button
            onClick={() => !isViewer && setShowDraftModal(true)}
            disabled={isViewer}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-none font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_#1C1917] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#1C1917] cursor-pointer ${
              isViewer
                ? "bg-stone-200 text-stone-500 cursor-not-allowed border border-stone-300"
                : "bg-[#C85A32] hover:bg-[#B94A26] text-white"
            }`}
          >
            {isViewer ? <Lock className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {isViewer ? "Draft (Restricted)" : "New Campaign"}
          </button>
        </div>
      </div>

      {sendSuccessMessage && (
        <div className="p-4 bg-[#EDF2EE] border border-[#A3B899] text-[#2D3B2D] text-xs font-mono">
          {sendSuccessMessage}
        </div>
      )}

      {/* Main View Area */}
      {viewMode === "calendar" ? (
        renderCalendarView()
      ) : (
        <div className="bg-white border border-stone-300 shadow-[3px_3px_0px_0px_#1C1917]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F2EB] border-b border-stone-300 text-stone-600 uppercase font-mono tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-5">Campaign</th>
                  <th className="py-3 px-5">Target Segment</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Sent</th>
                  <th className="py-3 px-5">Open Rate</th>
                  <th className="py-3 px-5">Click Rate</th>
                  <th className="py-3 px-5">Send Time</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-stone-800">
                {campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-stone-400 font-mono">
                      No marketing campaigns found. Draft your first campaign above.
                    </td>
                  </tr>
                ) : (
                  campaigns.map((camp) => (
                    <tr key={camp.id} className="hover:bg-stone-50 transition-colors">
                      <td className="py-3 px-5">
                        <div className="font-semibold text-stone-900">{camp.subject}</div>
                        <div className="text-[11px] text-stone-500 font-mono line-clamp-1">{camp.body}</div>
                      </td>
                      <td className="py-3 px-5 font-mono text-[11px]">
                        <span className="bg-stone-100 px-2 py-0.5 border border-stone-200">
                          {camp.segment_name || "All Contacts"}
                        </span>
                      </td>
                      <td className="py-3 px-5 font-mono">
                        <span
                          className={`px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider border ${
                            camp.status === "sent"
                              ? "bg-[#EDF2EE] text-[#4A5D4E] border-[#A3B899]"
                              : camp.status === "scheduled"
                              ? "bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]"
                              : camp.status === "pending_approval"
                              ? "bg-[#FEF2F2] text-[#991B1B] border-[#F87171]"
                              : "bg-stone-100 text-stone-700 border-stone-300"
                          }`}
                        >
                          {camp.status}
                        </span>
                      </td>
                      <td className="py-3 px-5 font-mono font-bold">{camp.sent_count || 0}</td>
                      <td className="py-3 px-5 font-mono font-bold text-stone-800">
                        {camp.open_rate ? `${camp.open_rate}%` : "—"}
                      </td>
                      <td className="py-3 px-5 font-mono font-bold text-stone-800">
                        {camp.click_rate ? `${camp.click_rate}%` : "—"}
                      </td>
                      <td className="py-3 px-5 text-stone-500 font-mono text-[11px]">
                        {formatDate(camp.send_time)}
                      </td>
                      <td className="py-3 px-5 text-right">
                        {camp.status === "draft" || camp.status === "scheduled" ? (
                          <button
                            onClick={() => setConfirmSendCampaign(camp)}
                            disabled={isViewer}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-mono font-bold uppercase transition-all shadow-[1px_1px_0px_0px_#1C1917] ${
                              isViewer
                                ? "bg-stone-200 text-stone-500 cursor-not-allowed border border-stone-300"
                                : "bg-stone-900 hover:bg-stone-800 text-white border border-stone-900 cursor-pointer"
                            }`}
                          >
                            <Send className="w-3 h-3 text-[#E8C2B3]" /> <span>Send Now</span>
                          </button>
                        ) : (
                          <span className="text-stone-400 font-mono text-[10px] uppercase">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmSendCampaign && (
        <div className="fixed inset-0 bg-stone-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 shadow-xl max-w-sm w-full space-y-4 border border-stone-900 shadow-[6px_6px_0px_0px_#1C1917]">
            <h3 className="font-serif text-lg font-bold">Confirm Broadcast</h3>
            <p className="text-xs text-stone-600">Send &ldquo;{confirmSendCampaign.subject}&rdquo;?</p>

            {error && (
              <div className="p-3 text-xs bg-[#FDF2F2] border border-[#FCA5A5] text-[#991B1B] font-mono">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmSendCampaign(null)}
                className="text-xs uppercase font-mono px-3 py-2 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSend(confirmSendCampaign)}
                disabled={sendLoading}
                className="bg-[#C85A32] text-white px-4 py-2 text-xs uppercase font-bold cursor-pointer"
              >
                {sendLoading ? "Sending..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Draft Campaign Modal */}
      {showDraftModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-stone-900 rounded-none p-6 shadow-[6px_6px_0px_0px_#1C1917] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="font-serif text-xl font-bold text-stone-900">Draft Campaign</h3>
              <button
                onClick={() => setShowDraftModal(false)}
                className="text-stone-500 hover:text-stone-900 font-bold px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 text-xs bg-[#FDF2F2] border border-[#FCA5A5] text-[#991B1B] font-mono">
                {error}
              </div>
            )}

            {/* AI Generator Box */}
            <div className="bg-[#FAF8F5] p-4 border border-stone-300 mb-2">
              <div className="text-[10px] uppercase font-bold mb-2 flex items-center gap-1 text-purple-700">
                <Sparkles className="w-3.5 h-3.5" /> AI Template Generator
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiBrief}
                  onChange={(e) => setAiBrief(e.target.value)}
                  placeholder="e.g. Announce our new AI features"
                  className="text-xs p-2 flex-1 border border-stone-300 bg-white"
                />
                <button
                  type="button"
                  onClick={handleAIGenerate}
                  disabled={aiLoading || !aiBrief}
                  className="bg-purple-700 text-white px-3 py-2 text-xs font-bold uppercase disabled:opacity-50 cursor-pointer"
                >
                  {aiLoading ? "Generating..." : "Generate"}
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateDraft} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-stone-600 mb-1">
                    Target Segment
                  </label>
                  <select
                    value={segmentId}
                    onChange={(e) => setSegmentId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 text-xs font-mono"
                  >
                    {segments.map((seg) => (
                      <option key={seg.id} value={seg.id}>
                        {seg.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-stone-600 mb-1">
                    Simulate Recipients Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={simulatedRecipients}
                    onChange={(e) => setSimulatedRecipients(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Overage Warning */}
              {isOverage && (
                <div className="p-3 bg-[#FDF2F2] border border-[#FCA5A5] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-[#991B1B] mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-[#991B1B]">Usage Limit Exceeded</div>
                    <div className="text-[11px] font-mono text-[#991B1B] mt-1">
                      Sending this will put you {overageAmount.toLocaleString()} emails over your {activePlan.name}{" "}
                      Plan limit.
                      <br />
                      <span className="font-bold">Overage Charge: ${overageCost.toFixed(2)}</span> ($
                      {(activePlan.email_overage_rate_cents / 100).toFixed(2)} / email)
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-stone-600 mb-1">
                  Send Time (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={sendDate}
                    onChange={(e) => setSendDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 text-xs font-mono"
                  />
                  <input
                    type="time"
                    value={sendTime}
                    onChange={(e) => setSendTime(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-stone-600 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-stone-600 mb-1">Body</label>
                <textarea
                  rows={4}
                  required
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-stone-300 text-xs font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-stone-200 mt-4">
                <button
                  type="button"
                  onClick={() => setShowDraftModal(false)}
                  className="px-4 py-2 text-xs uppercase font-mono cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={draftLoading}
                  className="px-5 py-2 bg-[#C85A32] text-white text-xs font-bold uppercase shadow-[2px_2px_0px_0px_#1C1917] cursor-pointer"
                >
                  {draftLoading ? "Saving..." : sendDate && sendTime ? "Schedule" : "Save Draft"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
