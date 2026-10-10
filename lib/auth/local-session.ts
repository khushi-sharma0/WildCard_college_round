import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";

export const LOCAL_SESSION_COOKIE = "nexus_local_session";
const SESSION_LIFETIME_SECONDS = 60 * 60 * 8;
const DEVELOPMENT_SECRET = "nexus-local-development-only-secret-change-before-deploying";
type SessionWarningGlobal = typeof globalThis & { __nexusSessionSecretWarning?: boolean };

function getSigningKey(): Uint8Array {
  let secret = process.env.SESSION_SECRET;
  if (!secret && process.env.NODE_ENV !== "production") {
    secret = DEVELOPMENT_SECRET;
    const globalWithWarning = globalThis as SessionWarningGlobal;
    if (!globalWithWarning.__nexusSessionSecretWarning) {
      console.warn("SESSION_SECRET is unset; using the local development fallback. Set SESSION_SECRET before deployment.");
      globalWithWarning.__nexusSessionSecretWarning = true;
    }
  }
  if (!secret) throw new Error("SESSION_SECRET is required for local authentication in production.");
  return new TextEncoder().encode(secret);
}

export async function createLocalSessionToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_LIFETIME_SECONDS}s`)
    .sign(getSigningKey());
}

export async function verifyLocalSessionToken(token: string): Promise<{ userId: string }> {
  const { payload } = await jwtVerify(token, getSigningKey(), { algorithms: ["HS256"] });
  if (typeof payload.sub !== "string" || !payload.sub) throw new Error("Invalid local session.");
  return { userId: payload.sub };
}

export function localSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_LIFETIME_SECONDS
  };
}
