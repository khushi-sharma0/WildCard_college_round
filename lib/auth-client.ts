"use client";

export async function startGoogleSignIn(): Promise<void> {
  const { createBrowserSupabaseClient } = await import("@/lib/supabase/browser");
  const { error } = await createBrowserSupabaseClient().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/auth/callback` }
  });
  if (error) throw error;
}
