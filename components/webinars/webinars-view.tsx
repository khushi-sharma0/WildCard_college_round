"use client";

import { useState } from "react";
import { Webinar, Page, Plan, Registration } from "@/lib/services";
import {
  Video,
  Plus,
  ExternalLink,
  Users,
  Calendar,
  Lock,
  Loader2,
  Tv,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function WebinarsView({
  initialWebinars,
  pages,
  plans,
  role,
}: {
  initialWebinars: Webinar[];
  pages: Page[];
  plans: Plan[];
  role: string;
}) {
  const [webinars, setWebinars] = useState<Webinar[]>(initialWebinars);
  const [selectedWebinar, setSelectedWebinar] = useState<Webinar | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loadingRegs, setLoadingRegs] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [pageId, setPageId] = useState("");
  const [planId, setPlanId] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isViewer = role === "viewer";

  async function handleOpenAttendees(webinar: Webinar) {
    setSelectedWebinar(webinar);
    setLoadingRegs(true);
    try {
      const res = await fetch(`/api/webinars?webinarId=${webinar.id}`);
      const data = await res.json();
      setRegistrations(data.registrations || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRegs(false);
    }
  }

  async function handleToggleAttended(regId: string, currentStatus: boolean) {
    if (isViewer) return;
    const newStatus = !currentStatus;

    setRegistrations((prev) =>
      prev.map((r) => (r.id === regId ? { ...r, attended: newStatus } : r))
    );

    try {
      await fetch("/api/webinars/attend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: regId, attended: newStatus }),
      });
    } catch (e) {
      console.error(e);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (isViewer) return;

    setFormLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/webinars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          scheduled_at: date || new Date(Date.now() + 86400000 * 7).toISOString(),
          landing_page_id: pageId || undefined,
          plan_id: planId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to schedule webinar");

      setWebinars([data, ...webinars]);
      setShowCreateModal(false);
      setTitle("");
      setDate("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFormLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-300">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#C85A32] font-semibold mb-1">
            Live Interactive Broadcasts
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-stone-900">
            Webinar Management
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Zero-configuration Jitsi Meet conferencing rooms, ticket linkages, and attendee roll call.
          </p>
        </div>

        <div>
          <button
            onClick={() => !isViewer && setShowCreateModal(true)}
            disabled={isViewer}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-none font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_#1C1917] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#1C1917] cursor-pointer ${
              isViewer
                ? "bg-stone-200 text-stone-500 cursor-not-allowed border border-stone-300"
                : "bg-[#C85A32] hover:bg-[#B94A26] text-white"
            }`}
          >
            {isViewer ? <Lock className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {isViewer ? "Schedule Webinar (Admin/Marketer Only)" : "Schedule Webinar"}
          </button>
        </div>
      </div>

      {/* Webinars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {webinars.map((webinar) => {
          const linkedPage = pages.find((p) => p.id === webinar.landing_page_id);
          const linkedPlan = plans.find((p) => p.id === webinar.plan_id);
          const jitsiUrl = `https://meet.jit.si/${webinar.jitsi_room}`;

          return (
            <div
              key={webinar.id}
              className="p-6 rounded-none bg-white border border-stone-300 shadow-[3px_3px_0px_0px_#1C1917] hover:border-stone-900 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-stone-600">
                    <Calendar className="w-3.5 h-3.5 text-[#C85A32]" />
                    {formatDate(webinar.scheduled_at)}
                  </div>
                  <span className="px-2 py-0.5 rounded-none text-[10px] font-mono font-bold uppercase tracking-wider bg-stone-100 text-stone-700 border border-stone-300">
                    Jitsi Meet HD
                  </span>
                </div>

                <h3 className="font-serif text-xl font-bold text-stone-900 tracking-tight">
                  {webinar.title}
                </h3>

                {/* Metadata badges */}
                <div className="flex flex-wrap gap-2 pt-1 text-xs">
                  {linkedPage && (
                    <span className="px-2 py-0.5 rounded-none bg-[#FAF8F5] text-stone-700 border border-stone-300 font-mono text-[11px]">
                      Page: <span className="font-bold text-stone-900">/s/{linkedPage.slug}</span>
                    </span>
                  )}
                  {linkedPlan && (
                    <span className="px-2 py-0.5 rounded-none bg-[#EDF2EE] text-[#4A5D4E] border border-[#CCD8CD] font-mono text-[11px]">
                      Ticket: {linkedPlan.name} (${(linkedPlan.price_cents / 100).toFixed(0)})
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-4 border-t border-stone-200 flex items-center justify-between gap-3">
                <button
                  onClick={() => handleOpenAttendees(webinar)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-none bg-[#FAF8F5] hover:bg-stone-100 text-stone-900 text-xs font-mono font-bold uppercase tracking-wider border border-stone-900 shadow-[1px_1px_0px_0px_#1C1917] transition-all cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-[#C85A32]" />
                  <span>{webinar.registrations_count || 12} Attendees</span>
                </button>

                <a
                  href={jitsiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-none bg-stone-900 hover:bg-stone-800 text-white text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_#C85A32] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#C85A32]"
                >
                  <Tv className="w-3.5 h-3.5 text-[#E8C2B3]" />
                  <span>Join Room</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Registrations & Attendance Modal */}
      {selectedWebinar && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white border border-stone-900 rounded-none p-6 shadow-[6px_6px_0px_0px_#1C1917] space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div>
                <h3 className="font-serif text-xl font-bold text-stone-900">Registered Attendees</h3>
                <p className="text-xs text-stone-500 font-mono mt-0.5">{selectedWebinar.title}</p>
              </div>
              <button
                onClick={() => setSelectedWebinar(null)}
                className="text-stone-500 hover:text-stone-900 font-mono text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {loadingRegs ? (
              <div className="py-12 flex items-center justify-center gap-2 text-stone-600 font-mono text-xs">
                <Loader2 className="w-4 h-4 animate-spin" />
                Fetching registrations...
              </div>
            ) : registrations.length === 0 ? (
              <div className="py-12 text-center text-stone-400 font-mono text-xs">
                No registrations found for this webinar session.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {registrations.map((reg) => (
                  <div
                    key={reg.id}
                    className="p-3 rounded-none bg-[#FAF8F5] border border-stone-300 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="font-serif text-sm font-bold text-stone-900">
                        {reg.contact?.name || "Attendee"}
                      </div>
                      <div className="text-[11px] text-stone-500 font-mono">
                        {reg.contact?.email || "email@company.com"}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-none border ${
                          reg.attended
                            ? "bg-[#EDF2EE] text-[#4A5D4E] border-[#CCD8CD]"
                            : "bg-stone-100 text-stone-600 border-stone-300"
                        }`}
                      >
                        {reg.attended ? "Attended" : "Registered"}
                      </span>

                      <button
                        onClick={() => handleToggleAttended(reg.id, reg.attended)}
                        disabled={isViewer}
                        className={`px-3 py-1.5 rounded-none text-xs font-mono font-bold uppercase tracking-wider transition-all border shadow-[1px_1px_0px_0px_#1C1917] ${
                          reg.attended
                            ? "bg-white hover:bg-stone-50 text-stone-700 border-stone-400"
                            : "bg-[#4A5D4E] hover:bg-[#3B4A3E] text-white border-[#4A5D4E]"
                        } ${isViewer ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        {reg.attended ? "Mark Absent" : "Mark Attended"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Schedule Webinar Form Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-stone-900 rounded-none p-6 shadow-[6px_6px_0px_0px_#1C1917] space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="font-serif text-xl font-bold text-stone-900">Schedule Webinar</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-stone-500 hover:text-stone-900 font-mono text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 text-xs bg-[#FDF2F2] border border-[#FCA5A5] text-[#991B1B] font-mono">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Session Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. AI in Retail: Autonomous Supply & Merchandising"
                  className="w-full px-3 py-2 rounded-none bg-[#FAF8F5] border border-stone-300 text-stone-900 text-xs focus:outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Scheduled Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-none bg-[#FAF8F5] border border-stone-300 text-stone-900 text-xs focus:outline-none focus:border-stone-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Link Landing Page (Optional)
                </label>
                <select
                  value={pageId}
                  onChange={(e) => setPageId(e.target.value)}
                  className="w-full px-3 py-2 rounded-none bg-[#FAF8F5] border border-stone-300 text-stone-900 text-xs focus:outline-none focus:border-stone-900 font-mono"
                >
                  <option value="">None (Standalone)</option>
                  {pages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} (/s/{p.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Link Paid Ticket Plan (Optional)
                </label>
                <select
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                  className="w-full px-3 py-2 rounded-none bg-[#FAF8F5] border border-stone-300 text-stone-900 text-xs focus:outline-none focus:border-stone-900 font-mono"
                >
                  <option value="">None (Free Admission)</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (${(p.price_cents / 100).toFixed(0)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-none text-xs font-mono text-stone-600 hover:text-stone-900 uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 rounded-none bg-[#C85A32] hover:bg-[#B94A26] text-white font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_#1C1917] flex items-center gap-2 cursor-pointer"
                >
                  {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
