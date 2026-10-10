import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthMode } from "@/lib/auth-config";
import { isUnauthenticatedError, signInWithPassword } from "@/lib/auth";
import { LOCAL_SESSION_COOKIE, localSessionCookieOptions } from "@/lib/auth/local-session";

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(256)
});

export async function POST(request: NextRequest) {
  if (getAuthMode() !== "local") {
    return NextResponse.json({ error: "Password sign-in is disabled in Supabase mode." }, { status: 404 });
  }
  try {
    const parsed = loginSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
    const { token, identity } = await signInWithPassword(parsed.data.email, parsed.data.password);
    const response = NextResponse.json({ success: true, name: identity.fullName, role: identity.role });
    response.cookies.set(LOCAL_SESSION_COOKIE, token, localSessionCookieOptions());
    return response;
  } catch (error) {
    const status = isUnauthenticatedError(error) ? 401 : 500;
    return NextResponse.json({
      error: status === 401 ? "Email or password is incorrect." : "Unable to sign in. Please try again."
    }, { status });
  }
}
