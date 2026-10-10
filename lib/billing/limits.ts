import { getSupabase } from "../supabase";

// Mock Fallback Data (If Supabase is not configured)
export const mockUsageEvents: any[] = [];
export const mockSubscriptions: any[] = [];
export const mockInvoices: any[] = [];
export const mockInvoiceLineItems: any[] = [];

// Base plans to fallback to
export const fallbackPlans = [
  {
    id: "11111111-1111-1111-1111-111111111101",
    name: "Basic",
    price_cents: 99900,
    max_websites: 1,
    max_contacts: 500,
    max_webinars_per_month: 2,
    included_emails: 1000,
    email_overage_rate_cents: 50,
    included_ai_actions: 100,
    ai_overage_rate_cents: 10,
    interval: "monthly"
  },
  {
    id: "11111111-1111-1111-1111-111111111102",
    name: "Pro",
    price_cents: 299900,
    max_websites: 5,
    max_contacts: 5000,
    max_webinars_per_month: 10,
    included_emails: 10000,
    email_overage_rate_cents: 30,
    included_ai_actions: 1000,
    ai_overage_rate_cents: 8,
    interval: "monthly"
  },
  {
    id: "11111111-1111-1111-1111-111111111103",
    name: "Enterprise",
    price_cents: 999900,
    max_websites: 999,
    max_contacts: 50000,
    max_webinars_per_month: 999,
    included_emails: 100000,
    email_overage_rate_cents: 20,
    included_ai_actions: 10000,
    ai_overage_rate_cents: 5,
    interval: "monthly"
  }
];

export async function check_limit(
  workspace_id: string,
  feature: string
): Promise<{ allowed: boolean; reason?: string }> {
  const supabase = getSupabase();
  let plan: any = null;
  let sub: any = null;

  if (supabase) {
    // 1. Get current active subscription & plan for workspace
    const { data: s } = await supabase
      .from("subscriptions")
      .select("plan_id, status")
      .eq("workspace_id", workspace_id)
      .eq("status", "active")
      .single();
    if (!s) return { allowed: false, reason: "No active subscription found. Upgrade your plan." };
    sub = s;
    const { data: p } = await supabase.from("plans").select("*").eq("id", sub.plan_id).single();
    if (!p) return { allowed: false, reason: "Plan not found." };
    plan = p;
  } else {
    sub = mockSubscriptions.find((s) => s.workspace_id === workspace_id && s.status === "active");
    if (!sub) return { allowed: false, reason: "No active subscription found (Mock)." };
    plan = fallbackPlans.find((p) => p.id === sub.plan_id);
    if (!plan) return { allowed: false, reason: "Plan not found (Mock)." };
  }

  // Metered features - always allowed, will just bill overage
  if (feature === "emails_sent" || feature === "ai_actions") {
    return { allowed: true };
  }

  return { allowed: true };
}

export async function record_usage(
  workspace_id: string,
  metric: string,
  quantity: number
): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    await supabase.from("usage_events").insert({ workspace_id, metric, quantity });
  } else {
    mockUsageEvents.push({
      id: `use-${Date.now()}`,
      workspace_id,
      metric,
      quantity,
      timestamp: new Date().toISOString()
    });
  }
}
