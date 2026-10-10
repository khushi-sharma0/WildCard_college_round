import AgentView from "@/components/agent/agent-view";
import { getRole } from "@/lib/auth";

export const revalidate = 0;

export default async function AgentPage() {
  const role = await getRole();
  return <AgentView role={role} />;
}
