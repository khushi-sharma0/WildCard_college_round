"use client";

import { useEffect, useState } from "react";
import { Loader2, UserRound } from "lucide-react";
import { notifyToast } from "@/lib/toast";
import type { UserRole } from "@/lib/auth";

interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
}

export default function TeamRolesView() {
  const [users, setUsers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/team")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load team members.");
        if (!cancelled) setUsers(data);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load team members.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  async function updateRole(user: TeamMember, role: UserRole) {
    setUpdatingId(user.id);
    try {
      const response = await fetch("/api/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, role })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update role.");
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, role: data.user.role } : item));
      notifyToast("success", `Updated ${user.full_name || user.email} to ${role}.`);
    } catch (updateError) {
      notifyToast("error", updateError instanceof Error ? updateError.message : "Unable to update role.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="border-b border-stone-300 pb-4">
        <div className="mb-1 text-[10px] font-mono font-semibold uppercase tracking-widest text-[#C85A32]">Workspace access</div>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-stone-900">Team & Roles</h1>
        <p className="mt-1 text-sm text-stone-600">Manage workspace roles. New Google accounts start as Viewers.</p>
      </header>
      {error && <p role="alert" className="border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="overflow-hidden border border-stone-300 bg-white shadow-[3px_3px_0px_0px_#1C1917]">
        <div className="grid grid-cols-[minmax(0,1fr)_150px] border-b border-stone-300 bg-[#F5F2EB] px-4 py-3 text-[10px] font-mono font-bold uppercase tracking-wider text-stone-600 md:grid-cols-[minmax(0,1fr)_180px_150px]">
          <span>Workspace member</span><span className="hidden md:block">Joined</span><span>Role</span>
        </div>
        {loading ? <div className="flex items-center justify-center gap-2 p-10 text-sm text-stone-500"><Loader2 className="h-4 w-4 animate-spin" />Loading team…</div>
          : users.length ? users.map((user) => <article key={user.id} className="grid grid-cols-[minmax(0,1fr)_150px] items-center gap-3 border-b border-stone-200 px-4 py-3 last:border-b-0 md:grid-cols-[minmax(0,1fr)_180px_150px]">
            <div className="flex min-w-0 items-center gap-3">
              {user.avatar_url ? <img src={user.avatar_url} alt="" referrerPolicy="no-referrer" className="h-10 w-10 shrink-0 rounded-full border border-stone-300 object-cover" /> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-300 bg-stone-100"><UserRound className="h-5 w-5 text-stone-500" /></span>}
              <div className="min-w-0"><p className="truncate text-sm font-semibold text-stone-900">{user.full_name || "Google user"}</p><p className="truncate text-xs text-stone-500">{user.email}</p></div>
            </div>
            <time className="hidden text-xs text-stone-500 md:block" dateTime={user.created_at}>{new Date(user.created_at).toLocaleDateString()}</time>
            <label className="sr-only" htmlFor={`role-${user.id}`}>Role for {user.full_name || user.email}</label>
            <div className="flex items-center gap-2"><select id={`role-${user.id}`} value={user.role} disabled={updatingId === user.id} onChange={(event) => void updateRole(user, event.target.value as UserRole)} className="w-full border border-stone-300 bg-white px-2 py-2 text-xs font-mono uppercase disabled:opacity-50"><option value="admin">Admin</option><option value="marketer">Marketer</option><option value="viewer">Viewer</option></select>{updatingId === user.id && <Loader2 className="h-4 w-4 animate-spin" />}</div>
          </article>)
          : <p className="p-8 text-center text-sm text-stone-500">No team members found.</p>}
      </div>
    </div>
  );
}
