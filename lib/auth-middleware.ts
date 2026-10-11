import { NextResponse, type NextRequest } from "next/server";
import { getAuthMode, getMissingSupabaseAuthVariables } from "@/lib/auth-config";
import { LOCAL_SESSION_COOKIE, verifyLocalSessionToken } from "@/lib/auth/local-session";

export async function updateAuthSession(request: NextRequest): Promise<NextResponse> {
  if (getAuthMode() === "supabase") {
    const missing = getMissingSupabaseAuthVariables();
    if (missing.length) {
      if (request.nextUrl.pathname.startsWith("/api/")) {
        return NextResponse.json({ error: `Setup incomplete. Missing: ${missing.join(", ")}` }, { status: 503 });
      }
      if (request.nextUrl.pathname === "/setup-incomplete") return NextResponse.next();
      const setupUrl = request.nextUrl.clone();
      setupUrl.pathname = "/setup-incomplete";
      setupUrl.search = "";
      return NextResponse.rewrite(setupUrl);
    }
    const { updateSupabaseSession } = await import("@/lib/supabase/middleware");
    return updateSupabaseSession(request);
  }

  const response = NextResponse.next();
  const token = request.cookies.get(LOCAL_SESSION_COOKIE)?.value;
  let isAuthenticated = false;
  let tampered = false;
  if (token) {
    try {
      await verifyLocalSessionToken(token);
      isAuthenticated = true;
    } catch {
      tampered = true;
    }
  }

  const pathname = request.nextUrl.pathname;
  const publicPath = pathname === "/login" || pathname === "/setup-incomplete"
    || pathname.startsWith("/s/") || pathname === "/api/auth/login"
    || pathname === "/api/forms/submit";
  if (isAuthenticated && pathname === "/login") {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }
  if (tampered) response.cookies.set(LOCAL_SESSION_COOKIE, "", { path: "/", maxAge: 0, httpOnly: true, sameSite: "lax" });
  return response;
}
