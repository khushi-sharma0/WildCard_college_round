import LoginForm from "@/components/auth/login-form";
import SetupIncomplete from "@/components/auth/setup-incomplete";
import { getAuthMode, getMissingSupabaseAuthVariables } from "@/lib/auth-config";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const mode = getAuthMode();
  const missing = mode === "supabase" ? getMissingSupabaseAuthVariables() : [];
  if (missing.length) return <SetupIncomplete missingVariables={missing} />;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAF8F5] px-4 py-10 text-stone-900">
      <div className="w-full max-w-md border border-stone-900 bg-white p-7 shadow-[5px_5px_0px_0px_#1C1917]">
        {mode === "local" && <p className="mb-5 border border-amber-300 bg-amber-50 px-3 py-2 text-center text-xs font-mono text-amber-950">Local development mode: Supabase is disabled</p>}
        <div className="mb-6 border-b border-stone-200 pb-5">
          <div className="mb-2 font-serif text-2xl font-bold tracking-tight">NEXUS</div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-[#C85A32]">Business Operating Platform</p>
          <h1 className="mt-5 font-serif text-2xl font-bold">Sign in</h1>
          <p className="mt-1 text-sm text-stone-600">{mode === "local" ? "Sign in with a local development account." : "Continue securely with your Google account."}</p>
        </div>
        <Suspense fallback={<p className="text-xs text-stone-500">Loading sign-in…</p>}>
          <LoginForm mode={mode} />
        </Suspense>
      </div>
    </main>
  );
}
