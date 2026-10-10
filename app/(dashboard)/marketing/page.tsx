import { listCampaigns, listSegments, listPlans, listSubscriptions, listWorkspaces } from "@/lib/services";
import { getRole } from "@/lib/auth";
import MarketingView from "@/components/marketing/marketing-view";

export const revalidate = 0;

export default async function MarketingPage() {
  const [campaigns, segments, role, plans, subscriptions, workspaces] = await Promise.all([
    listCampaigns(),
    listSegments(),
    getRole(),
    listPlans(),
    listSubscriptions(),
    listWorkspaces()
  ]);

  return (
    <MarketingView
      initialCampaigns={campaigns}
      segments={segments}
      role={role}
      plans={plans}
      subscriptions={subscriptions}
      workspaces={workspaces}
    />
  );
}
