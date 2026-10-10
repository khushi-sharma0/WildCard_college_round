import { NextResponse } from "next/server";
import { AuthSetupIncompleteError, isUnauthenticatedError, signOut } from "@/lib/auth";

export async function POST() {
  try {
    return await signOut();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to sign out.";
    const status = isUnauthenticatedError(error) ? 401 : error instanceof AuthSetupIncompleteError ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
