import { redirect } from "next/navigation";
import TeamRolesView from "@/components/team/team-roles-view";
import { getIdentity, logAuthenticationEvent } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const identity = await getIdentity();
  if (identity.role !== "admin") {
    await logAuthenticationEvent("team_page_denied", identity.role, identity.email, "blocked", {
      user_id: identity.userId,
      reason: "admin_required"
    });
    redirect("/");
  }
  return <TeamRolesView />;
}
