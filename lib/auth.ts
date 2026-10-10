import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAuthMode, getMissingSupabaseAuthVariables } from "@/lib/auth-config";
import { LOCAL_SESSION_COOKIE, createLocalSessionToken, localSessionCookieOptions, verifyLocalSessionToken } from "@/lib/auth/local-session";

export type UserRole = "admin" | "marketer" | "viewer";
export type Permission =
  | "read"
  | "agent_execute"
  | "contact_write"
  | "page_write"
  | "webinar_write"
  | "campaign_write"
  | "campaign_send"
  | "billing_request"
  | "billing_subscribe"
  | "plan_manage"
  | "audit_read"
  | "approval_manage"
  | "workspace_manage";

export interface AuthUser {
  id: string;
  email?: string;
  created_at: string;
  last_sign_in_at?: string | null;
  user_metadata: Record<string, unknown>;
  app_metadata: Record<string, unknown>;
}

export interface AuthIdentity {
  userId: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: UserRole;
  realRole: UserRole;
  isImpersonating: false;
}

export interface CurrentUserWithRole extends AuthIdentity {
  user: AuthUser;
}

export interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
}

export class UnauthenticatedError extends Error {
  readonly status = 401;
  constructor() {
    super("Authentication required.");
    this.name = "UnauthenticatedError";
  }
}

export class AuthSetupIncompleteError extends Error {
  readonly status = 503;
  constructor(readonly missingVariables: string[]) {
    super(`Supabase setup incomplete. Missing: ${missingVariables.join(", ")}`);
    this.name = "AuthSetupIncompleteError";
  }
}

export function isUnauthenticatedError(error: unknown): boolean {
  return error instanceof UnauthenticatedError;
}

export function getAuthSetupStatus(): string[] {
  return getAuthMode() === "supabase" ? getMissingSupabaseAuthVariables() : [];
}

const WORKSPACE_ID = process.env.DEMO_WORKSPACE_ID || "00000000-0000-0000-0000-000000000001";

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  admin: [
    "read", "agent_execute", "contact_write", "page_write", "webinar_write",
    "campaign_write", "campaign_send", "billing_subscribe", "plan_manage",
    "audit_read", "approval_manage", "workspace_manage"
  ],
  marketer: [
    "read", "agent_execute", "contact_write", "page_write", "webinar_write",
    "campaign_write", "campaign_send", "billing_request"
  ],
  viewer: ["read"]
};

function isUserRole(value: unknown): value is UserRole {
  return value === "admin" || value === "marketer" || value === "viewer";
}

function ensureSupabaseConfiguration(): void {
  const missing = getMissingSupabaseAuthVariables();
  if (missing.length) throw new AuthSetupIncompleteError(missing);
}

function toIdentity(
  user: AuthUser,
  profile: { id: string; email: string; full_name: string | null; avatar_url: string | null; role: string }
): CurrentUserWithRole {
  if (!isUserRole(profile.role)) throw new Error("The account has an invalid role. Contact a workspace administrator.");
  const email = profile.email || user.email || "";
  const metadataName = user.user_metadata.full_name || user.user_metadata.name;
  const metadataAvatar = user.user_metadata.avatar_url || user.user_metadata.picture;
  return {
    user,
    userId: user.id,
    email,
    fullName: profile.full_name || (typeof metadataName === "string" ? metadataName : email),
    avatarUrl: profile.avatar_url || (typeof metadataAvatar === "string" ? metadataAvatar : null),
    role: profile.role,
    realRole: profile.role,
    isImpersonating: false
  };
}

async function getLocalIdentity(optional: boolean): Promise<CurrentUserWithRole | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(LOCAL_SESSION_COOKIE)?.value;
  if (!token) {
    if (optional) return null;
    await logAuthenticationEvent("authentication_denied", "unknown", "unknown", "blocked", {
      reason: "missing_local_session"
    });
    throw new UnauthenticatedError();
  }

  let session: { userId: string };
  try {
    session = await verifyLocalSessionToken(token);
  } catch (error) {
    await logAuthenticationEvent("authentication_denied", "unknown", "unknown", "blocked", {
      reason: error instanceof Error ? error.message : "invalid_local_session"
    });
    throw new UnauthenticatedError();
  }
  const { getLocalUserById } = await import("@/lib/auth/local-store");
  const user = await getLocalUserById(session.userId);
  if (!user || !isUserRole(user.role)) {
    await logAuthenticationEvent("authentication_denied", "unknown", "unknown", "blocked", {
      user_id: session.userId,
      reason: "local_user_not_found_or_invalid_role"
    });
    throw new UnauthenticatedError();
  }
  const authUser: AuthUser = {
    id: user.id,
    email: user.email,
    created_at: user.created_at,
    user_metadata: { full_name: user.full_name },
    app_metadata: { provider: "local" }
  };
  return toIdentity(authUser, user);
}

async function getSupabaseIdentity(optional: boolean): Promise<CurrentUserWithRole | null> {
  ensureSupabaseConfiguration();
  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    if (optional) return null;
    await logAuthenticationEvent("authentication_denied", "unknown", "unknown", "blocked", {
      reason: error?.message || "missing_or_invalid_session"
    });
    throw new UnauthenticatedError();
  }

  const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
  const admin = createAdminSupabaseClient();
  const { data: profile, error: profileError } = await admin.from("profiles")
    .select("id,email,full_name,avatar_url,role").eq("id", user.id).maybeSingle();
  if (profileError) throw new Error(`Unable to load user role: ${profileError.message}`);

  const adminEmails = new Set((process.env.ADMIN_EMAILS || "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
  const isBootstrapAdmin = !!user.email && adminEmails.has(user.email.toLowerCase());
  let currentProfile = profile;
  if (!currentProfile) {
    const { data, error } = await admin.from("profiles").upsert({
      id: user.id,
      email: user.email || "",
      full_name: user.user_metadata.full_name || user.user_metadata.name || "",
      avatar_url: user.user_metadata.avatar_url || user.user_metadata.picture || null,
      role: isBootstrapAdmin ? "admin" : "viewer"
    }, { onConflict: "id", ignoreDuplicates: true })
      .select("id,email,full_name,avatar_url,role").maybeSingle();
    if (error) throw new Error(`Unable to create user profile: ${error.message}`);
    if (data) currentProfile = data;
    else {
      const { data: existing, error: readError } = await admin.from("profiles")
        .select("id,email,full_name,avatar_url,role").eq("id", user.id).single();
      if (readError || !existing) throw new Error(`Unable to load user profile: ${readError?.message || "Profile was not created."}`);
      currentProfile = existing;
    }
    await logAuthenticationEvent("profile_created", currentProfile.role, user.email || "", "executed", { user_id: user.id });
  } else if (isBootstrapAdmin && currentProfile.role !== "admin") {
    const previousRole = currentProfile.role;
    const { data, error } = await admin.from("profiles").update({ role: "admin" }).eq("id", user.id)
      .select("id,email,full_name,avatar_url,role").single();
    if (error || !data) throw new Error(`Unable to bootstrap administrator: ${error?.message || "Profile was not updated."}`);
    currentProfile = data;
    await logAuthenticationEvent("role_bootstrap", "admin", user.email || "", "executed", {
      user_id: user.id, from_role: previousRole, to_role: "admin"
    });
  }

  return toIdentity(user, currentProfile);
}

export async function getCurrentUserWithRole(options: { optional?: boolean } = {}): Promise<CurrentUserWithRole | null> {
  return getAuthMode() === "supabase"
    ? getSupabaseIdentity(!!options.optional)
    : getLocalIdentity(!!options.optional);
}

export async function getOptionalIdentity(): Promise<CurrentUserWithRole | null> {
  return getCurrentUserWithRole({ optional: true });
}

export async function getIdentity(): Promise<CurrentUserWithRole> {
  const identity = await getCurrentUserWithRole();
  if (!identity) throw new UnauthenticatedError();
  return identity;
}

export async function getRole(): Promise<UserRole> {
  return (await getIdentity()).role;
}

export async function signInWithPassword(email: string, password: string): Promise<{ token: string; identity: CurrentUserWithRole }> {
  if (getAuthMode() !== "local") throw new Error("Password sign-in is available only in local development mode.");
  const { verifyLocalCredentials } = await import("@/lib/auth/local-store");
  const user = await verifyLocalCredentials(email, password);
  if (!user) {
    await logAuthenticationEvent("login_failed", "unknown", email, "blocked", { provider: "local_password" });
    throw new UnauthenticatedError();
  }
  const token = await createLocalSessionToken(user.id);
  await logAuthenticationEvent("login", user.role, user.email, "executed", {
    user_id: user.id, provider: "local_password"
  });
  return { token, identity: toIdentity({
    id: user.id,
    email: user.email,
    created_at: user.created_at,
    user_metadata: { full_name: user.full_name },
    app_metadata: { provider: "local" }
  }, user) };
}

export async function signOut(): Promise<NextResponse> {
  if (getAuthMode() === "local") {
    const identity = await getCurrentUserWithRole({ optional: true });
    if (identity) await logAuthenticationEvent("logout", identity.role, identity.email, "executed", { user_id: identity.userId });
    const response = NextResponse.json({ success: true });
    response.cookies.set(LOCAL_SESSION_COOKIE, "", { ...localSessionCookieOptions(), maxAge: 0 });
    return response;
  }

  ensureSupabaseConfiguration();
  const identity = await getCurrentUserWithRole({ optional: true });
  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(`Unable to sign out: ${error.message}`);
  if (identity) await logAuthenticationEvent("logout", identity.role, identity.email, "executed", { user_id: identity.userId });
  return NextResponse.json({ success: true });
}

export async function completeGoogleSignIn(code: string): Promise<void> {
  ensureSupabaseConfiguration();
  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) throw new Error(error?.message || "Google did not return an authenticated user.");
  if (data.user.app_metadata.provider !== "google") throw new Error("Only Google sign-in is enabled.");
  const identity = await getCurrentUserWithRole();
  if (!identity) throw new Error("Unable to load the authenticated profile.");
  const createdAt = Date.parse(data.user.created_at);
  const lastSignInAt = data.user.last_sign_in_at ? Date.parse(data.user.last_sign_in_at) : Number.NaN;
  if (Number.isFinite(createdAt) && Number.isFinite(lastSignInAt) && Math.abs(lastSignInAt - createdAt) <= 2000) {
    await logAuthenticationEvent("signup", identity.role, identity.email, "executed", { user_id: identity.userId, provider: "google" });
  }
  await logAuthenticationEvent("login", identity.role, identity.email, "executed", { user_id: identity.userId, provider: "google" });
}

export function canPerformAction(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export async function authorize(_role: UserRole, permission: Permission, action: string): Promise<boolean> {
  const identity = await getIdentity();
  if (canPerformAction(identity.role, permission)) return true;
  const { createAuditLog } = await import("@/lib/services");
  await createAuditLog({
    workspace_id: WORKSPACE_ID,
    role: identity.role,
    tool: action,
    risk: "high",
    status: "blocked",
    args: { permission, actor_id: identity.userId, actor_email: identity.email },
    result: { reason: "permission_denied" }
  });
  return false;
}

export async function listTeamMembers(): Promise<TeamMember[]> {
  if (getAuthMode() === "local") {
    const { listLocalUsers } = await import("@/lib/auth/local-store");
    return (await listLocalUsers()).map(({ id, email, full_name, avatar_url, role, created_at }) => ({
      id, email, full_name, avatar_url, role, created_at
    }));
  }
  ensureSupabaseConfiguration();
  const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
  const admin = createAdminSupabaseClient();
  const members: TeamMember[] = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`Unable to list users: ${error.message}`);
    const { data: profiles, error: profileError } = await admin.from("profiles")
      .select("id,email,full_name,avatar_url,role").in("id", data.users.map((user) => user.id));
    if (profileError) throw new Error(`Unable to load profiles: ${profileError.message}`);
    const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]));
    for (const user of data.users) {
      const profile = profileById.get(user.id);
      members.push({
        id: user.id,
        email: profile?.email || user.email || "",
        full_name: profile?.full_name || user.user_metadata.full_name || user.user_metadata.name || "",
        avatar_url: profile?.avatar_url || user.user_metadata.avatar_url || user.user_metadata.picture || null,
        role: isUserRole(profile?.role) ? profile.role : "viewer",
        created_at: user.created_at
      });
    }
    if (data.users.length < 1000) break;
  }
  return members;
}

export async function updateTeamMemberRole(userId: string, role: UserRole): Promise<TeamMember> {
  const identity = await getIdentity();
  if (identity.role !== "admin") throw new Error("Only Admins can change roles.");

  if (getAuthMode() === "local") {
    const { updateLocalUserRole } = await import("@/lib/auth/local-store");
    const { user, previousRole } = await updateLocalUserRole(userId, role);
    if (previousRole !== role) await logRoleChange(identity, user, previousRole, role);
    return { id: user.id, email: user.email, full_name: user.full_name, avatar_url: user.avatar_url, role: user.role, created_at: user.created_at };
  }

  ensureSupabaseConfiguration();
  const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
  const admin = createAdminSupabaseClient();
  const { data: target, error: targetError } = await admin.from("profiles")
    .select("id,email,full_name,avatar_url,role").eq("id", userId).maybeSingle();
  if (targetError) throw new Error(`Unable to load user profile: ${targetError.message}`);
  if (!target) throw new Error("User profile not found.");
  if (!isUserRole(target.role)) throw new Error("User has an invalid current role.");
  if (target.role === "admin" && role !== "admin") {
    const { count, error } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
    if (error) throw new Error(`Unable to verify administrator count: ${error.message}`);
    if ((count || 0) <= 1) throw new Error("The last Admin cannot be demoted.");
  }
  if (target.role === role) {
    const { data: authUser, error } = await admin.auth.admin.getUserById(userId);
    if (error || !authUser.user) throw new Error(`Unable to load user join date: ${error?.message || "User not found."}`);
    return {
      id: target.id,
      email: target.email,
      full_name: target.full_name || "",
      avatar_url: target.avatar_url,
      role,
      created_at: authUser.user.created_at
    };
  }
  const { data, error } = await admin.from("profiles").update({ role }).eq("id", userId)
    .select("id,email,full_name,avatar_url,role").single();
  if (error || !data) throw new Error(`Unable to update user role: ${error?.message || "No profile returned."}`);
  const { data: authUser, error: authUserError } = await admin.auth.admin.getUserById(userId);
  if (authUserError || !authUser.user) throw new Error(`Unable to load user join date: ${authUserError?.message || "User not found."}`);
  await logRoleChange(identity, data, target.role, role);
  return {
    id: data.id,
    email: data.email,
    full_name: data.full_name || "",
    avatar_url: data.avatar_url,
    role: data.role as UserRole,
    created_at: authUser.user.created_at
  };
}

async function logRoleChange(
  actor: AuthIdentity,
  target: { id: string; email: string },
  fromRole: UserRole,
  toRole: UserRole
): Promise<void> {
  const { createAuditLog } = await import("@/lib/services");
  await createAuditLog({
    workspace_id: WORKSPACE_ID,
    role: actor.role,
    tool: "role_change",
    risk: "high",
    status: "executed",
    args: {
      actor_id: actor.userId,
      actor_email: actor.email,
      target_id: target.id,
      target_email: target.email,
      from_role: fromRole,
      to_role: toRole
    },
    result: { target_id: target.id, role: toRole }
  });
}

export async function logAuthenticationEvent(
  action: string,
  role: string,
  email: string,
  result: "executed" | "blocked",
  details: Record<string, unknown> = {}
): Promise<void> {
  const { createAuditLog } = await import("@/lib/services");
  await createAuditLog({
    workspace_id: WORKSPACE_ID,
    role,
    tool: action,
    risk: result === "blocked" ? "high" : "low",
    status: result,
    args: { actor_email: email, ...details },
    result: { outcome: result }
  });
}
