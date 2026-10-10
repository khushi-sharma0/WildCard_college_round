"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Eye, LogOut, ShieldCheck, UserCheck, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/auth";

interface TopbarIdentity {
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: UserRole;
}

export default function Topbar({ initialIdentity }: { initialIdentity: TopbarIdentity }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const roleConfig = {
    admin: { label: "Admin", badgeClass: "bg-[#FDF5F1] text-[#C85A32] border-[#E8C2B3]", icon: ShieldCheck },
    marketer: { label: "Marketer", badgeClass: "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]", icon: UserCheck },
    viewer: { label: "Viewer", badgeClass: "bg-stone-200/60 text-stone-700 border-stone-300", icon: Eye }
  }[initialIdentity.role];
  const CurrentIcon = roleConfig.icon;

  async function logout() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to sign out.");
      router.replace("/login");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign out.");
      setBusy(false);
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-stone-300 bg-[#FAF8F5] px-4 md:px-8">
      <div className="font-serif text-base italic text-stone-800">Autonomous Enterprise Execution</div>
      <div className="relative">
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <div className="text-[10px] font-mono uppercase tracking-wider text-stone-500">{initialIdentity.fullName}</div>
            <div className="text-xs font-medium text-stone-700">{initialIdentity.email}</div>
          </div>
          <button
            type="button"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className={cn("flex items-center gap-2 border bg-white px-3 py-1.5 text-xs font-mono font-medium shadow-[2px_2px_0px_0px_#1C1917]", roleConfig.badgeClass)}
          >
            {initialIdentity.avatarUrl
              ? <img src={initialIdentity.avatarUrl} alt="" referrerPolicy="no-referrer" className="h-6 w-6 rounded-full object-cover" />
              : <UserRound aria-hidden="true" className="h-4 w-4" />}
            <CurrentIcon aria-hidden="true" className="h-3.5 w-3.5" />
            <span className="uppercase tracking-wider">{roleConfig.label}</span>
            <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 opacity-70" />
          </button>
        </div>
        {menuOpen && <div className="absolute right-0 mt-2 w-72 border border-stone-900 bg-white p-2 shadow-[4px_4px_0px_0px_#1C1917]">
          <div className="border-b border-stone-200 px-2 py-2">
            <div className="text-xs font-semibold">{initialIdentity.fullName}</div>
            <div className="mt-0.5 text-[10px] text-stone-500">{initialIdentity.email}</div>
            <div className="mt-1 text-[10px] font-mono uppercase text-stone-500">Role: {roleConfig.label}</div>
          </div>
          {error && <p role="alert" className="my-2 border border-[#FCA5A5] bg-[#FDF2F2] p-2 text-xs text-[#991B1B]">{error}</p>}
          <button
            type="button"
            disabled={busy}
            onClick={() => void logout()}
            className="mt-1 flex w-full items-center gap-2 border border-transparent p-2 text-left text-xs font-mono uppercase text-stone-700 hover:border-stone-300 disabled:opacity-50"
          >
            <LogOut aria-hidden="true" className="h-3.5 w-3.5" />
            {busy ? "Signing out…" : "Log out"}
          </button>
        </div>}
      </div>
    </header>
  );
}
