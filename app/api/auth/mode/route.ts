import { NextResponse } from "next/server";
import { getAuthMode, getMissingSupabaseAuthVariables } from "@/lib/auth-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const mode = getAuthMode();
  return NextResponse.json({
    mode,
    missing: mode === "supabase" ? getMissingSupabaseAuthVariables() : []
  });
}
