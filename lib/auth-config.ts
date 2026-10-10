export type AuthMode = "local" | "supabase";

export function getAuthMode(): AuthMode {
  return process.env.AUTH_MODE === "supabase" ? "supabase" : "local";
}

export function getMissingSupabaseAuthVariables(): string[] {
  return [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY"
  ].filter((name) => {
    const value = process.env[name]?.trim().toLowerCase();
    return !value || value.includes("your-project") || value.startsWith("your_")
      || value.startsWith("replace_") || value === "changeme";
  });
}
