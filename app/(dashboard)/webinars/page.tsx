import { listWebinars, listPages, listPlans } from "@/lib/services";
import { getRole } from "@/lib/auth";
import WebinarsView from "@/components/webinars/webinars-view";

export const revalidate = 0;

export default async function WebinarsPage() {
  const [webinars, pages, plans, role] = await Promise.all([
    listWebinars(),
    listPages(),
    listPlans(),
    getRole(),
  ]);

  return (
    <WebinarsView
      initialWebinars={webinars}
      pages={pages}
      plans={plans}
      role={role}
    />
  );
}
