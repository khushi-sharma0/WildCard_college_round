import { listPlans, listSubscriptions, listPayments, listWorkspaces } from "@/lib/services";
import { getRole } from "@/lib/auth";
import BillingView from "@/components/billing/billing-view";

export const revalidate = 0;

export default async function BillingPage() {
  const [plans, subscriptions, payments, role, workspaces] = await Promise.all([
    listPlans(),
    listSubscriptions(),
    listPayments(),
    getRole(),
    listWorkspaces(),
  ]);

  return (
    <BillingView
      initialPlans={plans}
      initialSubscriptions={subscriptions}
      initialPayments={payments}
      role={role}
      workspaces={workspaces}
    />
  );
}
