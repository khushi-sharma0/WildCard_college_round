"use client";

import { useState } from "react";
import { CheckCircle2, ArrowRight, Loader2, Video } from "lucide-react";
import { notifyToast } from "@/lib/toast";
import { SiteTheme } from "@/lib/site-themes";

export default function RegistrationForm({
  slug,
  jitsiRoom,
  theme,
}: {
  slug: string;
  jitsiRoom?: string;
  theme?: SiteTheme;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [tag, setTag] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const fieldStyle = theme ? {
    background: theme.colors.surface,
    color: theme.colors.text,
    borderColor: theme.colors.border,
    borderRadius: theme.radius === "pill" ? "999px" : theme.radius === "rounded" ? "1rem" : "0"
  } : undefined;
  const actionStyle = theme ? {
    background: theme.colors.primary,
    color: theme.mode === "dark" ? theme.colors.background : "#ffffff",
    borderRadius: theme.radius === "pill" ? "999px" : theme.radius === "rounded" ? "1rem" : "0"
  } : undefined;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/forms/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, name, email, tag }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit registration");
      }

      setSubmitted(true);
      setSuccessMessage(data.message || "Your registration was submitted.");
      notifyToast("success", data.message || "Your registration was submitted.");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      notifyToast("error", err.message || "Unable to submit your registration.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    const room = jitsiRoom;
    const meetUrl = room ? `https://meet.jit.si/${encodeURIComponent(room)}` : undefined;

    return (
      <div className="p-6 rounded-none bg-[#EDF2EE] border border-[#CCD8CD] shadow-[3px_3px_0px_0px_#1C1917] text-left space-y-4" style={theme ? { background: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border, borderRadius: fieldStyle?.borderRadius } : undefined}>
        <div className="flex items-center gap-2 text-[#4A5D4E]">
          <CheckCircle2 className="w-5 h-5" />
          <h3 className="font-serif text-lg font-bold text-stone-900" style={theme ? { color: theme.colors.text, fontFamily: theme.fonts.heading } : undefined}>Registration Confirmed</h3>
        </div>
        <p className="text-xs text-stone-700 leading-relaxed" style={theme ? { color: theme.colors.muted } : undefined}>
          Welcome, <span className="font-bold text-stone-900">{name}</span>. {successMessage}
        </p>
        {room && meetUrl && <>
          <div className="pt-2">
            <a href={meetUrl} target="_blank" rel="noopener noreferrer" className="inline-flex w-full items-center justify-center gap-2 bg-[#4A5D4E] px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider text-white shadow-[2px_2px_0px_0px_#1C1917]" style={actionStyle}>
              <Video className="h-4 w-4" />Join Webinar Room
            </a>
          </div>
          <p className="text-[11px] font-mono text-stone-500">Room: <span className="font-bold text-stone-900">{room}</span></p>
        </>}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 text-xs rounded-none bg-[#FDF2F2] border border-[#FCA5A5] text-[#991B1B] font-mono">
          {error}
        </div>
      )}

      <div>
        <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-stone-600 mb-1.5" style={theme ? { color: theme.colors.muted } : undefined}>
          Full Legal / Business Name
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Elena Rostova"
          className="w-full px-3.5 py-2.5 rounded-none bg-[#FAF8F5] border border-stone-300 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900 text-xs transition-all"
          style={fieldStyle}
        />
      </div>

      <div>
        <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-stone-600 mb-1.5" style={theme ? { color: theme.colors.muted } : undefined}>
          Work Email Address
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="elena@company.com"
          className="w-full px-3.5 py-2.5 rounded-none bg-[#FAF8F5] border border-stone-300 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900 text-xs transition-all"
          style={fieldStyle}
        />
      </div>

      <div>
        <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-stone-600 mb-1.5" style={theme ? { color: theme.colors.muted } : undefined}>
          Interest area (optional)
        </label>
        <input
          type="text"
          maxLength={80}
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="What are you interested in?"
          className="w-full rounded-none border border-stone-300 bg-[#FAF8F5] px-3.5 py-2.5 text-xs text-stone-900 transition-all focus:border-stone-900 focus:outline-none"
          style={fieldStyle}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full mt-2 py-3 px-4 rounded-none bg-[#C85A32] hover:bg-[#B94A26] text-white font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_#1C1917] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#1C1917] flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
        style={actionStyle}
      >
        {loading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Registering...
          </>
        ) : (
          <>
            Complete Pass Reservation
            <ArrowRight className="w-3.5 h-3.5" />
          </>
        )}
      </button>

      <p className="text-[10px] font-mono text-center text-stone-500 pt-1">
        Direct confirmation credentials generated upon registration.
      </p>
    </form>
  );
}
