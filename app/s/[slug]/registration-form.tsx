"use client";

import { useState } from "react";
import { CheckCircle2, ArrowRight, Loader2, Video } from "lucide-react";

export default function RegistrationForm({
  slug,
  jitsiRoom,
}: {
  slug: string;
  jitsiRoom?: string;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [tag, setTag] = useState("retail");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    const room = jitsiRoom || `nexus-webinar-${slug}`;
    const meetUrl = `https://meet.jit.si/${room}`;

    return (
      <div className="p-6 rounded-none bg-[#EDF2EE] border border-[#CCD8CD] shadow-[3px_3px_0px_0px_#1C1917] text-left space-y-4">
        <div className="flex items-center gap-2 text-[#4A5D4E]">
          <CheckCircle2 className="w-5 h-5" />
          <h3 className="font-serif text-lg font-bold text-stone-900">Registration Confirmed</h3>
        </div>
        <p className="text-xs text-stone-700 leading-relaxed">
          Welcome aboard, <span className="font-bold text-stone-900">{name}</span>. Your attendance record has been registered in our CRM.
        </p>
        <div className="pt-2">
          <a
            href={meetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-none bg-[#4A5D4E] hover:bg-[#3B4A3E] text-white font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_#1C1917] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#1C1917]"
          >
            <Video className="w-4 h-4" />
            Join Webinar Room (Jitsi Meet)
          </a>
        </div>
        <p className="text-[11px] font-mono text-stone-500">
          Direct Room: <span className="text-stone-900 font-bold">{room}</span>
        </p>
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
        <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-stone-600 mb-1.5">
          Full Legal / Business Name
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Elena Rostova"
          className="w-full px-3.5 py-2.5 rounded-none bg-[#FAF8F5] border border-stone-300 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900 text-xs transition-all"
        />
      </div>

      <div>
        <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-stone-600 mb-1.5">
          Work Email Address
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="elena@company.com"
          className="w-full px-3.5 py-2.5 rounded-none bg-[#FAF8F5] border border-stone-300 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900 text-xs transition-all"
        />
      </div>

      <div>
        <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-stone-600 mb-1.5">
          Industry Segment
        </label>
        <select
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-none bg-[#FAF8F5] border border-stone-300 text-stone-900 focus:outline-none focus:border-stone-900 text-xs transition-all font-mono"
        >
          <option value="retail">Retail / E-commerce</option>
          <option value="saas">SaaS / Enterprise Software</option>
          <option value="edu">Higher Education / Research</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full mt-2 py-3 px-4 rounded-none bg-[#C85A32] hover:bg-[#B94A26] text-white font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_#1C1917] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#1C1917] flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
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
