
import { createClient } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/auth";

const supabaseUrl = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const businessId = process.env.ANALYTICS_BUSINESS_ID?.trim();

export const metricKeys = [
  "totalContacts",
  "pageViews",
  "totalRegistrations",
  "emailsSent",
  "mrrCents",
  "executedAgentActions",
  "pendingApprovals",
  "rejectedErrorEvents",
] as const;

export type MetricKey = (typeof metricKeys)[number];

type AnalyticsForOverrides = {
  kpis: {
    totalContacts: number;
    pageViews: number;
    totalRegistrations: number;
    emailsSent: number;
    mrrCents: number;
    executedAgentActions: number;
  };
  funnel: { stage: string; count: number }[];
  eventsOverTime: { date: string; views: number; leads: number; registrations: number; emails: number }[];
};

function scaleSeries<T extends { views: number; leads: number; registrations: number; emails: number }>(
  series: T[],
  field: "views" | "leads" | "registrations" | "emails",
  currentTotal: number,
  nextTotal: number
): T[] {
  if (currentTotal === nextTotal) return series;
  if (currentTotal <= 0) {
    if (series.length === 0) return series;
    // There is no recorded daily shape to scale from. Use a stable, gently
    // rising display profile so an edited total changes the graph visibly
    // without pretending every day had the same activity.
    const weights = series.map((_, index) => 1 + index + (index % 3 === 1 ? 1 : 0));
    const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
    let assigned = 0;
    return series.map((item, index) => {
      const value = index === series.length - 1
        ? nextTotal - assigned
        : Math.floor((nextTotal * weights[index]) / weightTotal);
      assigned += value;
      return { ...item, [field]: value };
    });
  }
  const factor = nextTotal / currentTotal;
  return series.map((item) => ({ ...item, [field]: Number(item[field]) * factor }));
}

export function applyAnalyticsOverrides<T extends AnalyticsForOverrides>(
  analytics: T,
  overrides: Partial<Record<MetricKey, number>>
): T {
  const kpis = { ...analytics.kpis };
  const funnel = analytics.funnel.map((item) => ({ ...item }));
  let eventsOverTime = analytics.eventsOverTime.map((item) => ({ ...item }));
  const targets = [
    ["totalContacts", "leads", "Leads Created"],
    ["pageViews", "views", "Page Views"],
    ["totalRegistrations", "registrations", "Webinar Registrations"],
    ["emailsSent", "emails", "Emails Sent"],
  ] as const;

  for (const [metricKey, seriesKey, funnelStage] of targets) {
    const target = overrides[metricKey];
    if (target === undefined) continue;
    const current = kpis[metricKey];
    eventsOverTime = scaleSeries(eventsOverTime, seriesKey, current, target);
    kpis[metricKey] = target;
    const stage = funnel.find((item) => item.stage === funnelStage);
    if (stage) stage.count = target;
  }
  for (const key of ["mrrCents", "executedAgentActions"] as const) {
    if (overrides[key] !== undefined) kpis[key] = overrides[key];
  }
  if (overrides.executedAgentActions !== undefined && "estimatedHoursSaved" in kpis) {
    kpis.estimatedHoursSaved = Number((overrides.executedAgentActions * 0.1).toFixed(1));
  }

  return { ...analytics, kpis, funnel, eventsOverTime };
}

const getSupabase = () => {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  }

  try {
    new URL(supabaseUrl);
  } catch {
    throw new Error("SUPABASE_URL is not a valid URL. Copy the Project URL from Supabase Settings.");
  }

  if (!supabaseUrl.startsWith("https://")) {
    throw new Error("SUPABASE_URL must start with https://");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

export async function getAnalyticsOverrides(options: { throwOnError?: boolean } = {}) {
  if (!businessId) {
    if (options.throwOnError) {
      throw new Error("Missing ANALYTICS_BUSINESS_ID in .env");
    }
    console.warn("Missing ANALYTICS_BUSINESS_ID in .env");
    return {};
  }

  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("analytics_overrides")
      .select("metric_key, metric_value")
      .eq("business_id", businessId);

    if (error) {
      console.error("Analytics overrides query failed:", error.message);
      if (options.throwOnError) {
        throw new Error(`Supabase query failed: ${error.message}`);
      }
      return {};
    }

    return Object.fromEntries(
      (data ?? []).map((item) => [
        item.metric_key,
        Number(item.metric_value),
      ])
    ) as Partial<Record<MetricKey, number>>;
  } catch (err) {
    console.error("Could not load analytics overrides:", err);
    if (options.throwOnError) {
      throw err instanceof Error ? err : new Error(String(err));
    }
    return {};
  }
}

export async function saveAnalyticsOverride(
  metricKey: MetricKey,
  metricValue: number,
  role: UserRole
) {
  return saveAnalyticsOverrides({ [metricKey]: metricValue }, role);
}

export async function saveAnalyticsOverrides(
  overrides: Partial<Record<MetricKey, number>>,
  role: UserRole
) {
  if (!businessId) {
    throw new Error("Missing ANALYTICS_BUSINESS_ID in .env");
  }

  const supabase = getSupabase();
  const now = new Date().toISOString();

  const rows = Object.entries(overrides).map(([key, val]) => ({
    business_id: businessId,
    metric_key: key,
    metric_value: Number(val),
    updated_by: role,
    updated_at: now,
  }));

  if (rows.length === 0) return;

  const { error } = await supabase
    .from("analytics_overrides")
    .upsert(rows, { onConflict: "business_id,metric_key" });

  if (error) {
    console.error("Analytics overrides save failed:", error.message);
    throw new Error(`Supabase save failed: ${error.message}`);
  }
}
