import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  AuthSetupIncompleteError,
  getIdentity,
  isUnauthenticatedError,
  UnauthenticatedError,
  listTeamMembers,
  logAuthenticationEvent,
  updateTeamMemberRole
} from "@/lib/auth";

const roleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "marketer", "viewer"])
});

async function requireAdmin() {
  const identity = await getIdentity();
  if (identity.role !== "admin") {
    await logAuthenticationEvent("team_access_denied", identity.role, identity.email, "blocked", {
      user_id: identity.userId,
      reason: "admin_required"
    });
    return false;
  }
  return true;
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Team management request failed.";
  const status = isUnauthenticatedError(error) || error instanceof UnauthenticatedError ? 401
    : error instanceof AuthSetupIncompleteError ? 503
      : message.includes("Only Admins") ? 403
        : message.includes("not found") ? 404
          : message.includes("last Admin") || message.includes("invalid current role") ? 409 : 500;
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    if (!(await requireAdmin())) return NextResponse.json({ error: "Only Admins can view Team & Roles." }, { status: 403 });
    return NextResponse.json(await listTeamMembers());
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!(await requireAdmin())) return NextResponse.json({ error: "Only Admins can change roles." }, { status: 403 });
    const parsed = roleSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid role change." }, { status: 400 });
    }
    const user = await updateTeamMemberRole(parsed.data.userId, parsed.data.role);
    return NextResponse.json({ success: true, user });
  } catch (error) {
    return errorResponse(error);
  }
}
