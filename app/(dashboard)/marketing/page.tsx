import { listCampaigns, listSegments } from "@/lib/services";
import { getRole } from "@/lib/auth";
import MarketingView from "@/components/marketing/marketing-view";

export const revalidate = 0;

export default async function MarketingPage() {
  const [campaigns, segments, role] = await Promise.all([
    listCampaigns(),
    listSegments(),
    getRole(),
  ]);

  return (
    <MarketingView
      initialCampaigns={campaigns}
      segments={segments}
      role={role}
    />
  );
}
