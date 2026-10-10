"use client";

import { useState } from "react";
import { Campaign, Segment } from "@/lib/services";
import {
  Mail,
  Send,
  Plus,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { notifyToast } from "@/lib/toast";

export default function MarketingView({
  initialCampaigns,
  segments,
  role,
}: {
  initialCampaigns: Campaign[];
  segments: Segment[];
  role: string;
}) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [confirmSendCampaign, setConfirmSendCampaign] = useState<Campaign | null>(null);

  // Draft form
  const [segmentId, setSegmentId] = useState(segments[0]?.id || "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [draftLoading, setDraftLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendSuccessMessage, setSendSuccessMessage] = useState<string | null>(null);

  const isViewer = role === "viewer";

  async function handleCreateDraft(e: React.FormEvent) {
    e.preventDefault();
    if (isViewer) return;

    setDraftLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segment_id: segmentId, subject, body }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to draft campaign");

      setCampaigns([data, ...campaigns]);
      setShowDraftModal(false);
      setSubject("");
      setBody("");
      notifyToast("success", "Campaign draft saved.");
    } catch (err: any) {
      setError(err.message);
      notifyToast("error", err.message || "Failed to draft campaign.");
    } finally {
      setDraftLoading(false);
    }
  }

  async function handleSend(campaign: Campaign) {
    if (isViewer) return;
    setSendLoading(true);
    setError(null);
    setSendSuccessMessage(null);

    try {
      const res = await fetch("/api/marketing/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: campaign.id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to dispatch campaign");
      if (data.pendingApproval) {
        setConfirmSendCampaign(null);
        notifyToast("success", "Large send queued for Admin approval.");
        return;
      }

      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === campaign.id
            ? { ...c, status: "sent", sent_count: data.sent_count }
            : c
        )
      );

      setSendSuccessMessage(
        `Dispatched ${data.sent_count} emails. ${data.note || "Mailtrap sandbox delivered"}`
      );
      setConfirmSendCampaign(null);
      notifyToast("success", `Campaign sent to ${data.sent_count} recipients.`);
    } catch (err: any) {
      setError(err.message);
      notifyToast("error", err.message || "Failed to dispatch campaign.");
    } finally {
      setSendLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-300">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#C85A32] font-semibold mb-1">
            Outbound Broadcasts & Audiences
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-stone-900">
            Marketing Automation
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Segmented email blasts, message composition, and safe sandbox delivery.
          </p>
        </div>

        <div>
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
            {isViewer ? "Draft Campaign (Admin/Marketer Only)" : "Draft Campaign"}
          </button>
        </div>
      </div>

      {/* Mailtrap Advisory Box */}
      <div className="p-4 rounded-none bg-white border border-stone-300 shadow-[2px_2px_0px_0px_#1C1917] flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-[#92400E] flex-shrink-0 mt-0.5" />
        <div className="text-xs text-stone-700 leading-relaxed font-sans">
          <span className="font-bold text-stone-900 font-mono uppercase text-[11px]">Mailtrap Sandbox Active:</span> All outgoing campaign emails are safely delivered to your Mailtrap Sandbox inbox (<code className="bg-stone-100 text-stone-800 px-1 py-0.2 border border-stone-300 font-mono text-[11px]">sandbox.smtp.mailtrap.io:2525</code>). Real recipients will not receive messages.
        </div>
      </div>

      {sendSuccessMessage && (
        <div className="p-4 rounded-none bg-[#EDF2EE] border border-[#CCD8CD] text-[#4A5D4E] flex items-center gap-2.5 text-xs font-mono">
          <CheckCircle2 className="w-4 h-4 text-[#4A5D4E]" />
          <span>{sendSuccessMessage}</span>
        </div>
      )}

      {/* Campaigns Table */}
      <div className="rounded-none bg-white border border-stone-300 shadow-[3px_3px_0px_0px_#1C1917] overflow-hidden">
        {campaigns.length === 0 && (
          <p className="border-b border-stone-200 p-8 text-center text-sm text-stone-500">
            No campaigns yet. Draft a campaign to get started.
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5F2EB] border-b border-stone-300 text-stone-600 uppercase font-mono tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-5">Subject Line</th>
                <th className="py-3 px-5">Segment</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5">Delivered</th>
                <th className="py-3 px-5">Date</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 text-stone-800">
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-400 font-mono">
                    No marketing campaigns drafted yet.
                  </td>
                </tr>
              ) : (
                campaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-[#FAF8F5] transition-colors">
                    <td className="py-3 px-5 font-bold text-stone-900 font-serif text-sm max-w-xs truncate">
                      {camp.subject}
                    </td>
                    <td className="py-3 px-5 text-stone-600">
                      <span className="px-2 py-0.5 rounded-none bg-stone-100 text-[10px] font-mono border border-stone-300 font-semibold">
                        {camp.segment_name || "Retail Cohort"}
                      </span>
                    </td>
                    <td className="py-3 px-5">
                      <span
                        className={`px-2 py-0.5 rounded-none text-[10px] font-mono font-bold uppercase tracking-wider border ${
                          camp.status === "sent"
                            ? "bg-[#EDF2EE] text-[#4A5D4E] border-[#CCD8CD]"
                            : camp.status === "sending"
                            ? "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]"
                            : "bg-stone-100 text-stone-600 border-stone-300"
                        }`}
                      >
                        {camp.status}
                      </span>
                    </td>
                    <td className="py-3 px-5 font-mono text-stone-800 font-semibold">
                      {camp.sent_count > 0 ? `${camp.sent_count} sandbox recipients` : "—"}
                    </td>
                    <td className="py-3 px-5 text-stone-500 font-mono text-[11px]">
                      {formatDate(camp.created_at)}
                    </td>
                    <td className="py-3 px-5 text-right">
                      {camp.status === "draft" ? (
                        <button
                          onClick={() => setConfirmSendCampaign(camp)}
                          disabled={isViewer}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-[1px_1px_0px_0px_#1C1917] ${
                            isViewer
                              ? "bg-stone-200 text-stone-500 cursor-not-allowed border border-stone-300"
                              : "bg-stone-900 hover:bg-stone-800 text-white border border-stone-900 cursor-pointer"
                          }`}
                        >
                          <Send className="w-3 h-3 text-[#E8C2B3]" />
                          <span>Send Blast</span>
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

      {/* Confirmation Dialog for Send */}
      {confirmSendCampaign && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-stone-900 rounded-none p-6 shadow-[6px_6px_0px_0px_#1C1917] space-y-4">
            <div className="flex items-center gap-3 border-b border-stone-200 pb-3">
              <div className="w-8 h-8 rounded-none bg-stone-900 text-white flex items-center justify-center">
                <Send className="w-4 h-4 text-[#E8C2B3]" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-stone-900">Confirm Broadcast</h3>
                <p className="text-[10px] font-mono uppercase text-stone-500">Mailtrap sandbox outbound trigger</p>
              </div>
            </div>

            <p className="text-xs text-stone-700 leading-relaxed">
              Are you sure you want to dispatch this email campaign?
              <br />
              <span className="font-serif font-bold text-stone-900 text-sm">"{confirmSendCampaign.subject}"</span>
            </p>

            <div className="p-3 rounded-none bg-[#FAF8F5] border border-stone-300 text-[11px] font-mono text-stone-600 space-y-1">
              <div>• Recipients: Up to 20 matching contacts</div>
              <div>• Transport: sandbox.smtp.mailtrap.io</div>
              <div>• Authorized roles: Admin or Marketer</div>
            </div>

            {error && (
              <div className="p-2.5 rounded-none bg-[#FDF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs font-mono">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmSendCampaign(null)}
                className="px-4 py-2 rounded-none text-xs font-mono text-stone-600 hover:text-stone-900 uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSend(confirmSendCampaign)}
                disabled={sendLoading}
                className="px-5 py-2 rounded-none bg-[#C85A32] hover:bg-[#B94A26] text-white font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_#1C1917] flex items-center gap-2 cursor-pointer"
              >
                {sendLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Confirm & Send Blast
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Draft Campaign Modal */}
      {showDraftModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-stone-900 rounded-none p-6 shadow-[6px_6px_0px_0px_#1C1917] space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="font-serif text-xl font-bold text-stone-900">Draft Marketing Campaign</h3>
              <button
                onClick={() => setShowDraftModal(false)}
                className="text-stone-500 hover:text-stone-900 font-mono text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDraft} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Target Audience Segment
                </label>
                <select
                  value={segmentId}
                  onChange={(e) => setSegmentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-none bg-[#FAF8F5] border border-stone-300 text-stone-900 text-xs focus:outline-none focus:border-stone-900 font-mono"
                >
                  {segments.map((seg) => (
                    <option key={seg.id} value={seg.id}>
                      {seg.name} (tag: {seg.filter_tag})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Subject Line
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={200}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Invitation: Next-Gen AI in Retail Masterclass"
                  className="w-full px-3 py-2 rounded-none bg-[#FAF8F5] border border-stone-300 text-stone-900 text-xs focus:outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Body (Personalization: &#123;&#123;name&#125;&#125;)
                </label>
                <textarea
                  rows={5}
                  required
                  minLength={20}
                  maxLength={10000}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Hi {{name}},\n\nJoin our upcoming session to explore automated inventory planning..."
                  className="w-full px-3 py-2 rounded-none bg-[#FAF8F5] border border-stone-300 text-stone-900 text-xs focus:outline-none focus:border-stone-900 resize-none font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDraftModal(false)}
                  className="px-4 py-2 rounded-none text-xs font-mono text-stone-600 hover:text-stone-900 uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={draftLoading}
                  className="px-5 py-2 rounded-none bg-[#C85A32] hover:bg-[#B94A26] text-white font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_#1C1917] flex items-center gap-2 cursor-pointer"
                >
                  {draftLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
