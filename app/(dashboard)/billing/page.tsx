import { listPlans, listSubscriptions, listContacts } from "@/lib/services";
import { getRole } from "@/lib/auth";
import BillingView from "@/components/billing/billing-view";

export const revalidate = 0;

export default async function BillingPage() {
  const [plans, subscriptions, contacts, role] = await Promise.all([
    listPlans(),
    listSubscriptions(),
    listContacts(),
    getRole(),
  ]);

  return (
    <BillingView
      initialPlans={plans}
      initialSubscriptions={subscriptions}
      contacts={contacts}
      role={role}
    />
  );
}
