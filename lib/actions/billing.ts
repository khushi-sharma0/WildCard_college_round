"use server";

import { getSupabase } from "../supabase";
import {
  fallbackPlans,
  mockSubscriptions,
  mockUsageEvents,
  mockInvoices
} from "../billing/limits";

// Mock payment gateway call
async function mockChargeGateway(amount_cents: number): Promise<{ success: boolean }> {
  return new Promise((resolve) => setTimeout(() => resolve({ success: true }), 500));
}

export async function subscribe_customer(
  workspace_id: string,
  contact_id: string,
  plan_id: string
) {
  const supabase = getSupabase();
  let plan: any;

  if (supabase) {
    const { data } = await supabase.from("plans").select("*").eq("id", plan_id).single();
    plan = data;
  } else {
    plan = fallbackPlans.find((p) => p.id === plan_id);
  }

  if (!plan) throw new Error("Plan not found");

  const start = new Date();
  const end = new Date(start);
  if (plan.interval === "monthly") end.setMonth(start.getMonth() + 1);
  else end.setFullYear(start.getFullYear() + 1);

  const status = plan.name === "Pro" ? "trialing" : "active";
  if (status === "trialing") end.setDate(start.getDate() + 14);

  const subData = {
    workspace_id,
    contact_id,
    plan_id,
    status,
    mrr_cents: plan.price_cents,
    current_period_start: start.toISOString(),
    current_period_end: end.toISOString()
  };

  if (supabase) {
    const { data, error } = await supabase.from("subscriptions").insert(subData).select().single();
    if (error) throw error;
    return { success: true, subscription: data };
  } else {
    const mockSub = { id: `sub-${Date.now()}`, ...subData };
    mockSubscriptions.push(mockSub);
    return { success: true, subscription: mockSub };
  }
}

export async function get_usage(workspace_id: string) {
  const supabase = getSupabase();
  let events: any[] = [];

  if (supabase) {
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    ).toISOString();
    const { data } = await supabase
      .from("usage_events")
      .select("*")
      .eq("workspace_id", workspace_id)
      .gte("timestamp", startOfMonth);
    if (data) events = data;
  } else {
    events = mockUsageEvents.filter((e) => e.workspace_id === workspace_id);
  }

  const usage = { emails_sent: 0, ai_actions: 0 };
  events.forEach((e) => {
    if (e.metric === "emails_sent") usage.emails_sent += e.quantity;
    if (e.metric === "ai_actions") usage.ai_actions += e.quantity;
  });

  return usage;
}

export async function generate_invoice(subscription_id: string) {
  const supabase = getSupabase();
  let sub: any, plan: any;

  if (supabase) {
    const { data } = await supabase
      .from("subscriptions")
      .select("*, plans(*)")
      .eq("id", subscription_id)
      .single();
    if (!data) throw new Error("Subscription not found");
    sub = data;
    plan = data.plans;
  } else {
    sub = mockSubscriptions.find((s) => s.id === subscription_id);
    if (!sub) throw new Error("Subscription not found");
    plan = fallbackPlans.find((p) => p.id === sub.plan_id);
  }

  const workspace_id = sub.workspace_id;
  const usage = await get_usage(workspace_id);

  const includedEmails = plan?.included_emails || 1000;
  const emailOverageRate = plan?.email_overage_rate_cents || 50;
  const includedAi = plan?.included_ai_actions || 100;
  const aiOverageRate = plan?.ai_overage_rate_cents || 10;

  const extraEmails = Math.max(0, usage.emails_sent - includedEmails);
  const emailOverage = extraEmails * emailOverageRate;

  const extraAi = Math.max(0, usage.ai_actions - includedAi);
  const aiOverage = extraAi * aiOverageRate;

  const basePrice = plan?.price_cents || sub.mrr_cents || 0;
  const amount_due_cents = basePrice + emailOverage + aiOverage;

  let invoice: any;
  if (supabase) {
    const { data, error } = await supabase
      .from("invoices")
      .insert({
        workspace_id,
        subscription_id,
        amount_due_cents,
        period_start: sub.current_period_start,
        period_end: sub.current_period_end,
        status: "open"
      })
      .select()
      .single();
    if (error) throw error;
    invoice = data;
  } else {
    invoice = {
      id: `inv-${Date.now()}`,
      workspace_id,
      subscription_id,
      amount_due_cents,
      period_start: sub.current_period_start,
      period_end: sub.current_period_end,
      status: "open"
    };
    mockInvoices.push(invoice);
  }

  const charge = await mockChargeGateway(amount_due_cents);
  if (charge.success) {
    invoice.status = "paid";
    invoice.amount_paid_cents = amount_due_cents;
    invoice.paid_at = new Date().toISOString();
    if (supabase) {
      await supabase
        .from("invoices")
        .update({
          status: "paid",
          amount_paid_cents: amount_due_cents,
          paid_at: invoice.paid_at
        })
        .eq("id", invoice.id);
    }
  }

  return { success: true, invoice };
}
