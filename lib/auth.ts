import { cookies } from "next/headers";

export type UserRole = "admin" | "marketer" | "viewer";

export async function getRole(): Promise<UserRole> {
  const cookieStore = await cookies();
  const roleCookie = cookieStore.get("role")?.value?.toLowerCase();
  
  if (roleCookie === "admin" || roleCookie === "marketer" || roleCookie === "viewer") {
    return roleCookie;
  }
  return "viewer"; // Default role is viewer
}

export function canPerformAction(role: UserRole, action: "read" | "write" | "admin" | "send_campaign"): boolean {
  if (role === "admin") return true;
  
  if (role === "marketer") {
    if (action === "admin") return false; // Billing / plan creation is Admin-only
    return true; // Marketer can create pages, webinars, draft campaigns, etc.
  }
  
  // Viewer is read-only
  return action === "read";
}
