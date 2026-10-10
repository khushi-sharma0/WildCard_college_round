import { globalMemoryStore, createAuditLog } from "@/lib/services";

export async function runBillingCycle(forceFailPayment = false) {
  const subscriptions = globalMemoryStore.subscriptions;
  const plans = globalMemoryStore.plans;
  const processed = [];

  for (const sub of subscriptions) {
    if (sub.status === "canceled") continue;

    const plan = plans.find((p: any) => p.id === sub.plan_id);
    if (!plan) continue;

    const baseAmount = plan.price_cents;
    // Overage simulation (dynamic calculation for demo)
    const overageAmount = Math.floor(Math.random() * 5000);
    const totalAmount = baseAmount + overageAmount;
    if (totalAmount === 0) continue;

    const invoiceId = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Handle Payment
    const paymentStatus = forceFailPayment ? "failed" : "succeeded";
    const paymentId = `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    if (!globalMemoryStore.payments) {
      globalMemoryStore.payments = [];
    }

    globalMemoryStore.payments.unshift({
      id: paymentId,
      invoice_id: invoiceId,
      workspace_id: sub.workspace_id,
      amount: totalAmount,
      base_amount: baseAmount,
      overage_amount: overageAmount,
      status: paymentStatus,
      method: "visa_ending_4242",
      gateway_reference: `stripe_ch_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date().toISOString()
    });

    if (paymentStatus === "failed") {
      sub.retry_count = (sub.retry_count || 0) + 1;

      if (sub.retry_count >= 3) {
        sub.status = "canceled";
        await createAuditLog({
          workspace_id: sub.workspace_id,
          role: "system",
          tool: "Billing Cycle",
          risk: "high",
          status: "executed",
          args: {
            subscription_id: sub.id,
            amount: totalAmount,
            base_amount: baseAmount,
            overage_amount: overageAmount,
            retries: sub.retry_count
          },
          result: { message: "Payment failed 3 times, subscription canceled." }
        } as any);
      } else {
        sub.status = "past_due";
        await createAuditLog({
          workspace_id: sub.workspace_id,
          role: "system",
          tool: "Billing Cycle",
          risk: "medium",
          status: "executed",
          args: {
            subscription_id: sub.id,
            amount: totalAmount,
            base_amount: baseAmount,
            overage_amount: overageAmount,
            retries: sub.retry_count
          },
          result: { message: "Payment failed, subscription past due. Will retry." }
        } as any);
      }
    } else {
      sub.retry_count = 0;
      if (sub.status === "trialing" || sub.status === "past_due") {
        sub.status = "active"; // Restores active on success
      }

      // Mark CRM contact as customer
      const contact = globalMemoryStore.contacts.find((c: any) => c.id === sub.contact_id);
      if (contact) {
        contact.status = "customer";
      }

      await createAuditLog({
        workspace_id: sub.workspace_id,
        role: "system",
        tool: "Billing Cycle",
        risk: "low",
        status: "executed",
        args: { subscription_id: sub.id, amount: totalAmount },
        result: { message: "Payment succeeded, cycle renewed." }
      } as any);
    }

    processed.push({
      subscription_id: sub.id,
      invoice_id: invoiceId,
      payment_id: paymentId,
      amount: totalAmount,
      base_amount: baseAmount,
      overage_amount: overageAmount,
      status: paymentStatus
    });
  }

  return { success: true, processed };
}
