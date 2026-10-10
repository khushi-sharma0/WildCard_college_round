import { getPageEventCounts, getWorkspaceName, listPages, listPlans, listWebinars } from "@/lib/services";
import { getRole } from "@/lib/auth";
import SitesView from "@/components/sites/sites-view";

export const revalidate = 0;

export default async function SitesPage() {
  const [pages, role, webinars, plans, pageEventCounts, workspaceName] = await Promise.all([
    listPages(),
    getRole(),
    listWebinars(),
    listPlans(),
    getPageEventCounts(),
    getWorkspaceName(),
  ]);

  return <SitesView initialPages={pages} role={role} webinars={webinars} plans={plans} pageEventCounts={pageEventCounts} workspaceName={workspaceName} />;
}
