"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { startGoogleSignIn } from "@/lib/auth-client";

type AuthMode = "local" | "supabase";

const LOCAL_ACCOUNTS = [
  { role: "Admin", email: "admin@nexus.demo", password: "NexusAdmin!2026" },
  { role: "Marketer", email: "marketer@nexus.demo", password: "NexusMarketer!2026" },
  { role: "Viewer", email: "viewer@nexus.demo", password: "NexusViewer!2026" }
];

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" transform="translate(0 4)" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.72 7.18l7.62 5.91c4.45-4.11 7.14-10.17 7.14-17.56Z" />
      <path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a23.9 23.9 0 0 0 0 21.56l7.98-6.19Z" transform="translate(0 4)" />
      <path fill="#34A853" d="M24 48c6.47 0 11.9-2.13 15.84-5.79l-7.62-5.91c-2.12 1.42-4.84 2.25-8.22 2.25-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
    </svg>
  );
}

export default function LoginForm({ mode }: { mode: AuthMode }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(() => {
    const providerError = searchParams.get("error");
    if (providerError === "access_denied" || providerError === "google_denied") return "Google sign-in was cancelled. You can try again whenever you're ready.";
    if (providerError) return "Google sign-in could not be completed. Please try again.";
    return null;
  });
  const [loading, setLoading] = useState(false);

  async function continueWithGoogle() {
    setLoading(true);
    setError(null);
    try {
      await startGoogleSignIn();
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Google sign-in failed. Please try again.");
      setLoading(false);
    }
  }

  async function localSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to sign in.");
      const destination = new URL(searchParams.get("next") || "/", window.location.origin);
      router.replace(destination.origin === window.location.origin ? `${destination.pathname}${destination.search}${destination.hash}` : "/");
      router.refresh();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Unable to sign in.");
      setLoading(false);
    }
  }

  return mode === "local" ? (
    <div className="space-y-4">
      <form onSubmit={(event) => void localSignIn(event)} className="space-y-3">
        <label className="block text-xs font-semibold text-stone-700">Email
          <input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-stone-900" />
        </label>
        <label className="block text-xs font-semibold text-stone-700">Password
          <input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-stone-900" />
        </label>
        {error && <p role="alert" className="border border-[#FCA5A5] bg-[#FDF2F2] p-3 text-xs text-[#991B1B]">{error}</p>}
        <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 border border-stone-900 bg-stone-900 px-4 py-3 text-sm font-semibold text-white shadow-[2px_2px_0px_0px_#78716C] hover:bg-stone-800 disabled:cursor-wait disabled:opacity-60">
          {loading && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <details className="border-t border-stone-200 pt-3">
        <summary className="cursor-pointer text-xs font-semibold text-stone-600">Show demo accounts</summary>
        <div className="mt-2 space-y-1 text-[11px] text-stone-600">
          {LOCAL_ACCOUNTS.map((account) => <p key={account.email}>{account.role}: <code>{account.email}</code> / <code>{account.password}</code></p>)}
        </div>
      </details>
    </div>
  ) : (
    <div className="space-y-4">
      {error && <p role="alert" className="border border-[#FCA5A5] bg-[#FDF2F2] p-3 text-xs text-[#991B1B]">{error}</p>}
      <button type="button" onClick={() => void continueWithGoogle()} disabled={loading} className="flex w-full items-center justify-center gap-3 border border-stone-900 bg-white px-4 py-3 text-sm font-semibold text-stone-800 shadow-[2px_2px_0px_0px_#1C1917] transition-colors hover:bg-stone-50 disabled:cursor-wait disabled:opacity-60">
        {loading ? <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" /> : <GoogleMark />}
        {loading ? "Connecting to Google…" : "Continue with Google"}
      </button>
      <p className="text-center text-xs leading-5 text-stone-600">New here? Continue with Google to create a viewer account.</p>
    </div>
  );
}
