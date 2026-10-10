import { listPages } from "@/lib/services";
import { getRole } from "@/lib/auth";
import SitesView from "@/components/sites/sites-view";

export const revalidate = 0;

export default async function SitesPage() {
  const [pages, role] = await Promise.all([
    listPages(),
    getRole(),
  ]);

  return <SitesView initialPages={pages} role={role} />;
}
