import { NextRequest, NextResponse } from "next/server";
import { AuthSetupIncompleteError, completeGoogleSignIn, logAuthenticationEvent } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const callbackError = request.nextUrl.searchParams.get("error");
  if (callbackError) {
    const cancelled = callbackError === "access_denied";
    await logAuthenticationEvent(
      cancelled ? "login_cancelled" : "login_failed",
      "unknown",
      "unknown",
      "blocked",
      { provider: "google", reason: callbackError }
    );
    return NextResponse.redirect(new URL(`/login?error=${cancelled ? "google_denied" : "callback_failed"}`, request.url));
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    await logAuthenticationEvent("login_failed", "unknown", "unknown", "blocked", {
      provider: "google",
      reason: "missing_authorization_code"
    });
    return NextResponse.redirect(new URL("/login?error=callback_failed", request.url));
  }

  try {
    await completeGoogleSignIn(code);
    return NextResponse.redirect(new URL("/", request.url));
  } catch (error) {
    if (error instanceof AuthSetupIncompleteError) {
      return NextResponse.rewrite(new URL("/setup-incomplete", request.url));
    }
    await logAuthenticationEvent("login_failed", "unknown", "unknown", "blocked", {
      provider: "google",
      reason: error instanceof Error ? error.message : "callback_exchange_failed"
    });
    return NextResponse.redirect(new URL("/login?error=callback_failed", request.url));
  }
}
