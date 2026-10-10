import type { SupabaseClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { randomUUID } from "node:crypto";
import { SiteBuilderSettings, SiteTheme } from "@/lib/site-themes";

// Default workspace ID
export const WS = process.env.DEMO_WORKSPACE_ID || "00000000-0000-0000-0000-000000000001";

// Types
export interface Contact {
  id: string;
  workspace_id: string;
  name: string;
  email: string;
  tags: string[];
  source: string;
  status: "lead" | "qualified" | "customer" | "lost";
  created_at: string;
}

export interface Segment {
  id: string;
  workspace_id: string;
  name: string;
  filter_tag: string;
  created_at: string;
}

export interface Page {
  id: string;
  workspace_id: string;
  title: string;
  slug: string;
  content: string;
  gjs_data?: PageBlock[] | null;
  builder_data?: SiteBuilderSettings | null;
  theme_color?: string;
  linked_webinar_id?: string | null;
  html?: string;
  css?: string;
  is_published: boolean;
  created_at: string;
}

export type PageBlockType =
  | "hero"
  | "text"
  | "image"
  | "features"
  | "gallery"
  | "testimonials"
  | "faq"
  | "registration"
  | "pricing"
  | "cta"
  | "footer";

export interface PageBlock {
  id: string;
  type: PageBlockType;
  content: string;
  items?: string[];
  target_id?: string;
  variant?: string;
  hidden?: boolean;
  settings?: {
    alignment?: "left" | "center" | "right";
    contentWidth?: "narrow" | "standard" | "wide" | "full";
    spacing?: "compact" | "normal" | "spacious";
    background?: { kind: "solid" | "gradient" | "image"; value: string };
    columnCount?: number;
    mobileStack?: "image-above" | "image-below";
  };
}

export interface SavedSiteTheme extends SiteTheme {
  workspace_id: string;
  created_at: string;
}

export interface Plan {
  id: string;
  workspace_id: string;
  name: string;
  price_cents: number;
  interval: string;
  description: string;
  created_at: string;
}

export interface Webinar {
  id: string;
  workspace_id: string;
  title: string;
  scheduled_at: string;
  jitsi_room: string;
  landing_page_id?: string;
  plan_id?: string;
  created_at: string;
  registrations_count?: number;
}

export interface Registration {
  id: string;
  workspace_id: string;
  webinar_id: string;
  contact_id: string;
  attended: boolean;
  created_at: string;
  contact?: Contact;
}

export interface Subscription {
  id: string;
  workspace_id: string;
  contact_id: string;
  plan_id: string;
  status: string;
  mrr_cents: number;
  created_at: string;
  contact_name?: string;
  plan_name?: string;
}

export interface Campaign {
  id: string;
  workspace_id: string;
  idempotency_key?: string;
  segment_id?: string;
  subject: string;
  body: string;
  status: "draft" | "sending" | "sent";
  sent_count: number;
  created_at: string;
  segment_name?: string;
}

export interface AuditLog {
  id: string;
  workspace_id: string;
  run_id?: string;
  role: string;
  tool: string;
  risk: "low" | "medium" | "high";
  status: "executed" | "blocked" | "pending_approval" | "rejected" | "error";
  args: Record<string, any>;
  result: Record<string, any>;
  created_at: string;
}

export interface AgentRun {
  id: string;
  workspace_id: string;
  prompt: string;
  status: "running" | "awaiting_approval" | "completed" | "failed" | "rejected";
  steps: any[];
  pending_tool?: {
    tool: string;
    args: Record<string, any>;
    risk: string;
  } | null;
  final_text?: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

export type MutableRecordKind = "page" | "webinar" | "campaign" | "plan";
export type MutableRecord = Page | Webinar | Campaign | Plan;
export interface ApprovalRequest {
  id: string;
  workspace_id: string;
  action: "subscribe_contact" | "send_campaign";
  args: Record<string, string>;
  requested_by: string;
  status: "pending" | "approved" | "rejected";
  reason?: string;
  created_at: string;
}

// Global In-Memory Fallback Store (Ensures 100% functionality even when Supabase is not configured or in offline demo mode)
class MemoryStore {
  contacts: Contact[] = [];
  segments: Segment[] = [];
  pages: Page[] = [];
  plans: Plan[] = [];
  webinars: Webinar[] = [];
  registrations: Registration[] = [];
  subscriptions: Subscription[] = [];
  campaigns: Campaign[] = [];
  events: Array<{ id: string; workspace_id: string; event_type: string; payload: any; created_at: string }> = [];
  agent_runs: AgentRun[] = [];
  audit_logs: AuditLog[] = [];
  approvals: ApprovalRequest[] = [];
  site_themes: SavedSiteTheme[] = [];

  constructor() {
    this.seed();
  }

  seed() {
    // 3 default plans
    this.plans = [
      { id: "11111111-1111-1111-1111-111111111101", workspace_id: WS, name: "Retail Growth Pass", price_cents: 4900, interval: "monthly", description: "Access to weekly retail AI masterminds & templates", created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
      { id: "11111111-1111-1111-1111-111111111102", workspace_id: WS, name: "Webinar VIP Ticket", price_cents: 9900, interval: "one_time", description: "Live Q&A seat + recording + exclusive retail benchmark deck", created_at: new Date(Date.now() - 86400000 * 4).toISOString() },
      { id: "11111111-1111-1111-1111-111111111103", workspace_id: WS, name: "Enterprise AI Pilot", price_cents: 49900, interval: "monthly", description: "Dedicated AI business agent for large retailers", created_at: new Date(Date.now() - 86400000 * 3).toISOString() }
    ];

    // 3 default segments
    this.segments = [
      { id: "22222222-2222-2222-2222-222222222201", workspace_id: WS, name: "Retail Decision Makers", filter_tag: "retail", created_at: new Date(Date.now() - 86400000 * 6).toISOString() },
      { id: "22222222-2222-2222-2222-222222222202", workspace_id: WS, name: "SaaS Founders", filter_tag: "saas", created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
      { id: "22222222-2222-2222-2222-222222222203", workspace_id: WS, name: "Higher Ed Leaders", filter_tag: "edu", created_at: new Date(Date.now() - 86400000 * 4).toISOString() }
    ];

    // 50 Seed contacts
    const retailNames = [
      "Marcus Vance", "Elena Rostova", "Sarah Jenkins", "Devon Miller", "Chloe Zhao",
      "Liam Gallagher", "Amara Okafor", "Kenji Sato", "Maria Hernandez", "Julian Thorne",
      "Priya Sharma", "David Kim", "Sofia Rossi", "Arthur Pendelton", "Nadia Chen",
      "Lucas Silva", "Hannah Schmidt", "Tariq Mansour", "Jessica Walsh", "Aaron Patel", "Zoe Kravitz", "Oliver Queen"
    ];
    const saasNames = [
      "Alex Mercer", "Bianca Costa", "Carlos Mendoza", "Dana Scully", "Ethan Hunt",
      "Fatima Zahra", "Gordon Freeman", "Huy Nguyen", "Iris West", "Jack Ryan",
      "Kavita Rao", "Leo Sterling", "Mina Tanaka", "Noah Bennett", "Olivia Pope", "Peter Parker"
    ];
    const eduNames = [
      "Dr. Alistair Finch", "Beth Harmon", "Cedric Diggory", "Dr. Donna Noble", "Elijah Vance",
      "Fiona Gallagher", "George Weasley", "Hermione Granger", "Ian Malcolm", "Julia Roberts", "Karl Popper", "Luna Lovegood"
    ];

    let contactIndex = 1;
    const addContacts = (names: string[], tag: string) => {
      for (const name of names) {
        const id = `00000000-0000-0000-0001-${String(contactIndex++).padStart(12, "0")}`;
        const domain = tag === "retail" ? "retailcorp.demo" : tag === "saas" ? "cloudflow.demo" : "eduinst.demo";
        const email = `${name.toLowerCase().replace(/[^a-z]/g, ".")}@${domain}`;
        const statuses: Contact["status"][] = ["lead", "lead", "qualified", "customer", "lost"];
        const status = statuses[contactIndex % statuses.length];
        this.contacts.push({
          id,
          workspace_id: WS,
          name,
          email,
          tags: [tag, contactIndex % 3 === 0 ? "vip" : "verified"],
          source: contactIndex % 2 === 0 ? "inbound_page" : "campaign",
          status,
          created_at: new Date(Date.now() - (contactIndex * 86400000 * 0.25)).toISOString()
        });
      }
    };
    addContacts(retailNames, "retail");
    addContacts(saasNames, "saas");
    addContacts(eduNames, "edu");

    // Sample Landing Page
    this.pages = [
      {
        id: "33333333-3333-3333-3333-333333333301",
        workspace_id: WS,
        title: "AI in Retail 2026 Summit",
        slug: "ai-retail-summit",
        content: "Discover how AI-powered business orchestration unifies supply chains, personalized store experiences, and automated customer marketing.",
        html: `<div class="p-8 text-white"><h1 class="text-3xl font-extrabold text-blue-400">Autonomous AI for Modern Retailers</h1><p class="mt-3 text-slate-300">Boost inventory velocity and automate 80% of customer journeys with Nexus AI.</p></div>`,
        is_published: true,
        created_at: new Date(Date.now() - 86400000 * 3).toISOString()
      }
    ];

    // Sample Webinar
    this.webinars = [
      {
        id: "44444444-4444-4444-4444-444444444401",
        workspace_id: WS,
        title: "AI in Retail: Next-Gen Store Intelligence",
        scheduled_at: new Date(Date.now() + 86400000 * 7).toISOString(),
        jitsi_room: "nexus-ai-retail-summit-2026",
        landing_page_id: "33333333-3333-3333-3333-333333333301",
        plan_id: "11111111-1111-1111-1111-111111111102",
        created_at: new Date(Date.now() - 86400000 * 2).toISOString()
      }
    ];

    // Seed Registrations
    for (let i = 0; i < 12; i++) {
      const contact = this.contacts[i];
      if (contact) {
        this.registrations.push({
          id: `reg-${i + 1}`,
          workspace_id: WS,
          webinar_id: "44444444-4444-4444-4444-444444444401",
          contact_id: contact.id,
          attended: i % 2 === 0,
          created_at: new Date(Date.now() - 86400000 * (i % 3)).toISOString()
        });
      }
    }

    // Seed Subscriptions
    for (let i = 0; i < 5; i++) {
      const customer = this.contacts.find((c, idx) => c.status === "customer" && idx >= i * 2);
      if (customer) {
        this.subscriptions.push({
          id: `sub-${i + 1}`,
          workspace_id: WS,
          contact_id: customer.id,
          plan_id: "11111111-1111-1111-1111-111111111101",
          status: "active",
          mrr_cents: 4900,
          created_at: new Date(Date.now() - 86400000 * (i + 1)).toISOString()
        });
      }
    }

    // Seed Campaigns
    this.campaigns = [
      {
        id: "55555555-5555-5555-5555-555555555501",
        workspace_id: WS,
        segment_id: "22222222-2222-2222-2222-222222222201",
        subject: "Invitation: AI in Retail Executive Masterclass",
        body: "Hi {{name}},\n\nJoin us next Friday to discover how AI is automating inventory planning and marketing in retail. Reserve your seat here.\n\nBest,\nThe Nexus Team",
        status: "sent",
        sent_count: 22,
        created_at: new Date(Date.now() - 86400000 * 2).toISOString()
      }
    ];

    // Seed 120 Events
    for (let i = 1; i <= 120; i++) {
      const types = ["page_view", "page_view", "lead_created", "webinar_registered", "email_sent", "subscribed", "agent_action"];
      const type = types[i % types.length];
      const daysAgo = (14 - (i % 14));
      const date = new Date(Date.now() - daysAgo * 86400000 + (i * 37 % 1440) * 60000);
      this.events.push({
        id: `evt-${i}`,
        workspace_id: WS,
        event_type: type,
        payload: { source: i % 3 === 0 ? "campaign" : i % 2 === 0 ? "direct" : "inbound_page" },
        created_at: date.toISOString()
      });
    }

    // Seed Audit Logs
    this.audit_logs = [
      {
        id: "audit-1",
        workspace_id: WS,
        role: "admin",
        tool: "create_segment",
        risk: "low",
        status: "executed",
        args: { name: "Retail Decision Makers", filter_tag: "retail" },
        result: { segment_id: "22222222-2222-2222-2222-222222222201", matched_contacts: 22 },
        created_at: new Date(Date.now() - 86400000 * 2).toISOString()
      },
      {
        id: "audit-2",
        workspace_id: WS,
        role: "admin",
        tool: "create_plan",
        risk: "medium",
        status: "executed",
        args: { name: "Retail Growth Pass", price_cents: 4900, interval: "monthly" },
        result: { plan_id: "11111111-1111-1111-1111-111111111101" },
        created_at: new Date(Date.now() - 86400000 * 2).toISOString()
      },
      {
        id: "audit-3",
        workspace_id: WS,
        role: "admin",
        tool: "create_webinar",
        risk: "medium",
        status: "executed",
        args: { title: "AI in Retail: Next-Gen Store Intelligence" },
        result: { webinar_id: "44444444-4444-4444-4444-444444444401" },
        created_at: new Date(Date.now() - 86400000 * 1).toISOString()
      },
      {
        id: "audit-4",
        workspace_id: WS,
        role: "admin",
        tool: "send_campaign",
        risk: "high",
        status: "executed",
        args: { campaign_id: "55555555-5555-5555-5555-555555555501" },
        result: { sent_count: 22, mode: "mailtrap_sandbox" },
        created_at: new Date(Date.now() - 86400000 * 1).toISOString()
      }
    ];
  }
}

// Preserve the development fallback across Next.js route bundles and hot reloads.
type ServicesGlobal = typeof globalThis & {
  __nexusMemoryStore?: MemoryStore;
};

const servicesGlobal = globalThis as ServicesGlobal;
if (!servicesGlobal.__nexusMemoryStore) {
  servicesGlobal.__nexusMemoryStore = new MemoryStore();
}
const globalMemoryStore = servicesGlobal.__nexusMemoryStore;

async function getSupabase(): Promise<SupabaseClient | null> {
  if (process.env.AUTH_MODE !== "supabase") return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || url.includes("your-project") || key.includes("your_service_role_key")) {
    return null;
  }
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

// ==============================================================================
// SERVICE IMPLEMENTATIONS
// ==============================================================================

/**
 * 1. TRACK: Record analytical and operational events
 */
export async function track(
  eventType: string,
  payload: Record<string, any> = {},
  workspaceId: string = WS
): Promise<{ success: boolean }> {
  const supabase = await getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase.from("events").insert({
        workspace_id: workspaceId,
        event_type: eventType,
        payload
      });
      if (!error) return { success: true };
    } catch (err) {
      console.warn("Supabase track error, using fallback", err);
    }
  }

  // Fallback
  globalMemoryStore.events.push({
    id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    workspace_id: workspaceId,
    event_type: eventType,
    payload,
    created_at: new Date().toISOString()
  });
  return { success: true };
}

export async function trackPageEvent(
  eventType: "page_view" | "form_submitted",
  payload: Record<string, unknown>,
  workspaceId: string = WS
): Promise<void> {
  const supabase = await getSupabase();
  if (supabase) {
    const { error } = await supabase.from("events").insert({
      workspace_id: workspaceId,
      event_type: eventType,
      payload
    });
    if (error) throw new Error(`Unable to record ${eventType}: ${error.message}`);
    return;
  }

  await track(eventType, payload, workspaceId);
}

export async function getPageEventCounts(
  workspaceId: string = WS
): Promise<Record<string, { views: number; submissions: number }>> {
  const supabase = await getSupabase();
  let events: Array<{ event_type: string; payload: Record<string, unknown> }> = [];
  if (supabase) {
    const { data, error } = await supabase.from("events")
      .select("event_type,payload")
      .eq("workspace_id", workspaceId)
      .in("event_type", ["page_view", "form_submitted"]);
    if (error) throw new Error(`Unable to load landing page activity: ${error.message}`);
    events = (data || []) as typeof events;
  } else {
    events = globalMemoryStore.events
      .filter((event) => event.workspace_id === workspaceId && (event.event_type === "page_view" || event.event_type === "form_submitted"))
      .map(({ event_type, payload }) => ({ event_type, payload }));
  }

  return events.reduce<Record<string, { views: number; submissions: number }>>((counts, event) => {
    const pageId = typeof event.payload?.page_id === "string" ? event.payload.page_id : "";
    if (!pageId) return counts;
    const count = counts[pageId] || { views: 0, submissions: 0 };
    if (event.event_type === "page_view") count.views += 1;
    if (event.event_type === "form_submitted") count.submissions += 1;
    counts[pageId] = count;
    return counts;
  }, {});
}

/**
 * 2. QUERY ANALYTICS: Summary KPIs, Funnel, and Daily Trends
 */
export async function queryAnalytics(workspaceId: string = WS, rangeDays = 14) {
  const contacts = await listContacts(workspaceId);
  const webinars = await listWebinars(workspaceId);
  const campaigns = await listCampaigns(workspaceId);
  const subscriptions = await listSubscriptions(workspaceId);
  const auditLogs = await listAuditLogs(workspaceId);

  // Aggregate stats
  const totalContacts = contacts.length;
  const leadsCount = contacts.filter((c) => c.status === "lead").length;
  const customersCount = contacts.filter((c) => c.status === "customer").length;

  // Calculate MRR
  const mrrCents = subscriptions
    .filter((s) => s.status === "active")
    .reduce((sum, s) => sum + (s.mrr_cents || 0), 0);

  const registrationsByWebinar = await Promise.all(
    webinars.map((webinar) => listRegistrations(webinar.id, workspaceId))
  );
  const registrations = registrationsByWebinar.flat();
  const totalRegistrations = registrations.length;
  const totalAttended = registrations.filter((registration) => registration.attended).length;

  const emailsSent = campaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0);
  const executedAgentActions = auditLogs.filter((a) => a.status === "executed").length;
  const estimatedHoursSaved = Number((executedAgentActions * 0.1).toFixed(1));

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - Math.max(1, Math.min(30, rangeDays)) + 1);
  fromDate.setHours(0, 0, 0, 0);
  let events = globalMemoryStore.events.filter(
    (event) =>
      event.workspace_id === workspaceId &&
      new Date(event.created_at).getTime() >= fromDate.getTime()
  );
  const supabase = await getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("events")
      .select("event_type,payload,created_at")
      .eq("workspace_id", workspaceId)
      .gte("created_at", fromDate.toISOString())
      .order("created_at", { ascending: true });
    if (error) throw new Error(`Unable to load analytics events: ${error.message}`);
    if (data) events = data as typeof events;
  }
  const pageViews = events.filter((event) => event.event_type === "page_view").length;
  const visitorsToRegistrants = pageViews
    ? Number(((totalRegistrations / pageViews) * 100).toFixed(1))
    : 0;
  const webinarAttendanceRate = totalRegistrations
    ? Number(((totalAttended / totalRegistrations) * 100).toFixed(1))
    : 0;
  const funnel = [
    { stage: "Page Views", count: pageViews },
    { stage: "Leads Created", count: contacts.length },
    { stage: "Webinar Registrations", count: totalRegistrations },
    { stage: "Emails Sent", count: emailsSent },
    { stage: "Customers (Subscribed)", count: customersCount }
  ];

  const daysMap: Record<string, { date: string; views: number; leads: number; registrations: number; emails: number }> = {};
  for (let i = Math.max(1, Math.min(30, rangeDays)) - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().split("T")[0];
    daysMap[key] = {
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      views: 0,
      leads: 0,
      registrations: 0,
      emails: 0
    };
  }

  for (const evt of events) {
    const key = evt.created_at.split("T")[0];
    if (daysMap[key]) {
      if (evt.event_type === "page_view") daysMap[key].views++;
      else if (evt.event_type === "lead_created") daysMap[key].leads++;
      else if (evt.event_type === "webinar_registered") daysMap[key].registrations++;
      else if (evt.event_type === "email_sent") daysMap[key].emails++;
    }
  }

  const eventsOverTime = Object.values(daysMap);

  return {
    kpis: {
      totalContacts,
      leadsCount,
      customersCount,
      mrrCents,
      pageViews,
      totalRegistrations,
      totalAttended,
      webinarAttendanceRate,
      visitorsToRegistrants,
      emailsSent,
      activeSubscriptions: subscriptions.filter((subscription) => subscription.status === "active").length,
      conversionRate: totalContacts ? Number(((customersCount / totalContacts) * 100).toFixed(1)) : 0,
      executedAgentActions,
      estimatedHoursSaved
    },
    funnel,
    eventsOverTime
  };
}

/**
 * 3. CREATE SEGMENT: Create audience segment by tag
 */
export async function createSegment(
  name: string,
  filter_tag: string,
  workspaceId: string = WS
): Promise<Segment> {
  const cleanTag = filter_tag.trim().toLowerCase();
  const existing = (await listSegments(workspaceId)).find(
    (segment) => segment.filter_tag.trim().toLowerCase() === cleanTag
  );
  if (existing) return existing;

  const supabase = await getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("segments")
        .insert({
          workspace_id: workspaceId,
          name,
          filter_tag: cleanTag
        })
        .select()
        .single();
      if (!error && data) {
        await track("segment_created", { segment_id: data.id, name, filter_tag: cleanTag }, workspaceId);
        return data;
      }
    } catch (err) {
      console.warn("Supabase createSegment fallback", err);
    }
  }

  const newSegment: Segment = {
    id: `seg-${Date.now()}`,
    workspace_id: workspaceId,
    name,
    filter_tag: cleanTag,
    created_at: new Date().toISOString()
  };
  globalMemoryStore.segments.unshift(newSegment);
  await track("segment_created", { segment_id: newSegment.id, name, filter_tag: cleanTag }, workspaceId);
  return newSegment;
}

/**
 * 4. CREATE PAGE: Create a responsive landing page
 */
export async function createPage(
  title: string,
  slug: string,
  content: string,
  html?: string,
  css?: string,
  workspaceId: string = WS,
  reuseExistingSlug: boolean = false,
  builder?: {
    gjs_data?: PageBlock[];
    builder_data?: SiteBuilderSettings;
    theme_color?: string;
    linked_webinar_id?: string | null;
    is_published?: boolean;
  }
): Promise<Page> {
  const cleanSlug = slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/^-+|-+$/g, "");

  const existingPage = (await listPages(workspaceId)).find(
    (page) => page.slug.toLowerCase() === cleanSlug
  );
  if (existingPage) {
    if (existingPage.title === title && existingPage.content === content) {
      return existingPage;
    }
    if (reuseExistingSlug) return existingPage;
    throw new Error(`The page slug "${cleanSlug}" is already in use.`);
  }

  const escapeHtml = (value: string) =>
    value.replace(/[&<>"']/g, (character) => {
      const entities: Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;"
      };
      return entities[character] || character;
    });
  const generatedHtml =
    html ||
    `<div class="max-w-3xl mx-auto py-12 px-6 text-slate-100">
      <div class="inline-block px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-full text-xs font-semibold uppercase tracking-wider mb-4 border border-indigo-500/30">Official Executive Webinar</div>
      <h1 class="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent mb-6">${escapeHtml(title)}</h1>
      <p class="text-lg text-slate-300 leading-relaxed mb-8">${escapeHtml(content)}</p>
    </div>`;

  const supabase = await getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("pages")
      .insert({
        workspace_id: workspaceId,
        title,
        slug: cleanSlug,
        content,
        html: generatedHtml,
        css: css || "",
        gjs_data: builder?.gjs_data || null,
        builder_data: builder?.builder_data || null,
        theme_color: builder?.theme_color || "#C85A32",
        linked_webinar_id: builder?.linked_webinar_id || null,
        is_published: builder?.is_published ?? true
      })
      .select()
      .single();
    if (error) throw new Error(`Unable to create landing page: ${error.message}`);
    if (!data) throw new Error("Unable to create landing page: the database returned no record.");
    await track("page_created", { page_id: data.id, slug: cleanSlug }, workspaceId);
    return data as Page;
  }

  const newPage: Page = {
    id: `page-${Date.now()}`,
    workspace_id: workspaceId,
    title,
    slug: cleanSlug,
    content,
    gjs_data: builder?.gjs_data,
    builder_data: builder?.builder_data,
    theme_color: builder?.theme_color || "#C85A32",
    linked_webinar_id: builder?.linked_webinar_id || null,
    html: generatedHtml,
    css: css || "",
    is_published: builder?.is_published ?? true,
    created_at: new Date().toISOString()
  };
  // remove any duplicate slug in fallback
  globalMemoryStore.pages = globalMemoryStore.pages.filter(
    (p) => !(p.workspace_id === workspaceId && p.slug === cleanSlug)
  );
  globalMemoryStore.pages.unshift(newPage);
  await track("page_created", { page_id: newPage.id, slug: cleanSlug }, workspaceId);
  return newPage;
}

/**
 * 5. CREATE WEBINAR: Schedule webinar with Jitsi Meet integration
 */
export async function createWebinar(
  title: string,
  scheduled_at: string,
  landing_page_id?: string,
  plan_id?: string,
  workspaceId: string = WS
): Promise<Webinar> {
  const normalizedDate = new Date(scheduled_at).toISOString();
  const existingWebinar = (await listWebinars(workspaceId)).find(
    (webinar) =>
      webinar.title.trim().toLowerCase() === title.trim().toLowerCase() &&
      new Date(webinar.scheduled_at).toISOString() === normalizedDate
  );
  if (existingWebinar) return existingWebinar;

  const roomClean = title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 32);
  const jitsi_room = `nexus-${roomClean}-${Date.now().toString(36)}`;

  const supabase = await getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("webinars")
        .insert({
          workspace_id: workspaceId,
          title,
          scheduled_at: normalizedDate,
          jitsi_room,
          landing_page_id: landing_page_id || null,
          plan_id: plan_id || null
        })
        .select()
        .single();
      if (!error && data) {
        await track("webinar_created", { webinar_id: data.id, title }, workspaceId);
        return data;
      }
    } catch (err) {
      console.warn("Supabase createWebinar fallback", err);
    }
  }

  const newWebinar: Webinar = {
    id: `webinar-${Date.now()}`,
    workspace_id: workspaceId,
    title,
    scheduled_at: normalizedDate,
    jitsi_room,
    landing_page_id,
    plan_id,
    created_at: new Date().toISOString()
  };
  globalMemoryStore.webinars.unshift(newWebinar);
  await track("webinar_created", { webinar_id: newWebinar.id, title }, workspaceId);
  return newWebinar;
}

/**
 * 6. CREATE PLAN: Set up SaaS or Ticket billing plan
 */
export async function createPlan(
  name: string,
  price_cents: number,
  interval: string = "monthly",
  description: string = "",
  workspaceId: string = WS
): Promise<Plan> {
  const existingPlan = (await listPlans(workspaceId)).find(
    (plan) =>
      plan.name.trim().toLowerCase() === name.trim().toLowerCase() &&
      plan.price_cents === price_cents &&
      plan.interval === interval
  );
  if (existingPlan) return existingPlan;

  const supabase = await getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("plans")
        .insert({
          workspace_id: workspaceId,
          name,
          price_cents,
          interval,
          description
        })
        .select()
        .single();
      if (!error && data) {
        await track("plan_created", { plan_id: data.id, name, price_cents }, workspaceId);
        return data;
      }
    } catch (err) {
      console.warn("Supabase createPlan fallback", err);
    }
  }

  const newPlan: Plan = {
    id: `plan-${Date.now()}`,
    workspace_id: workspaceId,
    name,
    price_cents,
    interval,
    description,
    created_at: new Date().toISOString()
  };
  globalMemoryStore.plans.unshift(newPlan);
  await track("plan_created", { plan_id: newPlan.id, name, price_cents }, workspaceId);
  return newPlan;
}

/**
 * 7. DRAFT CAMPAIGN: Prepare outbound marketing email campaign
 */
export async function draftCampaign(
  segment_id: string,
  subject: string,
  body: string,
  workspaceId: string = WS,
  idempotencyKey?: string
): Promise<Campaign> {
  const existingCampaign = (await listCampaigns(workspaceId)).find(
    (campaign) =>
      (idempotencyKey && campaign.idempotency_key === idempotencyKey) ||
      (campaign.status === "draft" &&
        campaign.segment_id === (segment_id || undefined) &&
        campaign.subject === subject &&
        campaign.body === body)
  );
  if (existingCampaign) return existingCampaign;

  const supabase = await getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .insert({
          workspace_id: workspaceId,
          idempotency_key: idempotencyKey || null,
          segment_id: segment_id || null,
          subject,
          body,
          status: "draft",
          sent_count: 0
        })
        .select()
        .single();
      if (!error && data) {
        await track("campaign_drafted", { campaign_id: data.id, subject }, workspaceId);
        return data;
      }
    } catch (err) {
      console.warn("Supabase draftCampaign fallback", err);
    }
  }

  const newCampaign: Campaign = {
    id: `camp-${Date.now()}`,
    workspace_id: workspaceId,
    idempotency_key: idempotencyKey,
    segment_id,
    subject,
    body,
    status: "draft",
    sent_count: 0,
    created_at: new Date().toISOString()
  };
  globalMemoryStore.campaigns.unshift(newCampaign);
  await track("campaign_drafted", { campaign_id: newCampaign.id, subject }, workspaceId);
  return newCampaign;
}

/**
 * 8. SEND CAMPAIGN: Execute email blast with Nodemailer to Mailtrap sandbox (max 20 recipients)
 */
export async function sendCampaign(
  campaign_id: string,
  workspaceId: string = WS
): Promise<{ success: boolean; sent_count: number; recipients: string[]; note: string }> {
  // Fetch campaign
  const campaigns = await listCampaigns(workspaceId);
  const campaign = campaigns.find((c) => c.id === campaign_id);
  if (!campaign) {
    throw new Error(`Campaign ${campaign_id} not found`);
  }
  const storedCampaign = globalMemoryStore.campaigns.find((item) => item.id === campaign_id);
  const currentStatus = storedCampaign?.status || campaign.status;
  if (currentStatus === "sent") {
    return {
      success: true,
      sent_count: campaign.sent_count,
      recipients: [],
      note: "This campaign was already sent; duplicate delivery was prevented."
    };
  }
  if (currentStatus === "sending") {
    throw new Error("This campaign is already being sent.");
  }
  if (storedCampaign) storedCampaign.status = "sending";

  // Get segment and recipient contacts
  const segments = await listSegments(workspaceId);
  const segment = segments.find((s) => s.id === campaign.segment_id);
  const filterTag = segment?.filter_tag;

  const allContacts = await listContacts(workspaceId);
  let targets = filterTag
    ? allContacts.filter((c) => c.tags && c.tags.includes(filterTag))
    : allContacts;

  // Enforce Max recipients limit
  const maxRecipients = parseInt(process.env.MAX_RECIPIENTS || "20", 10);
  targets = targets.slice(0, maxRecipients);

  const recipientEmails = targets.map((t) => t.email);

  // Setup Mailtrap SMTP transport
  const smtpHost = process.env.SMTP_HOST || "sandbox.smtp.mailtrap.io";
  const smtpPort = parseInt(process.env.SMTP_PORT || "2525", 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const mailFrom = process.env.MAIL_FROM || '"Nexus Platform" <hello@nexus.internal>';

  let deliveryNote = "Sandbox delivered to Mailtrap test inbox";

  if (smtpUser && smtpPass && !smtpUser.includes("your_mailtrap")) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      // Send to Mailtrap sandbox (safe, never reaches real people)
      for (const contact of targets) {
        const personalizedBody = campaign.body.replace(/\{\{name\}\}/g, contact.name);
        await transporter.sendMail({
          from: mailFrom,
          to: contact.email,
          subject: campaign.subject,
          text: personalizedBody
        });
      }
    } catch (err: any) {
      console.warn("SMTP send failed or simulated:", err.message);
      deliveryNote = `Simulated delivery (${targets.length} emails queued for Mailtrap sandbox)`;
    }
  } else {
    deliveryNote = `Mailtrap credentials not configured: Simulated delivery to ${targets.length} sandbox recipients`;
  }

  // Update campaign status
  const supabase = await getSupabase();
  if (supabase) {
    try {
      await supabase
        .from("campaigns")
        .update({
          status: "sent",
          sent_count: targets.length
        })
        .eq("id", campaign_id);
    } catch (err) {
      console.warn("Supabase campaign update error", err);
    }
  }

  // Update in memory
  const memCamp = globalMemoryStore.campaigns.find((c) => c.id === campaign_id);
  if (memCamp) {
    memCamp.status = "sent";
    memCamp.sent_count = targets.length;
  }

  await track(
    "email_sent",
    {
      campaign_id,
      count: targets.length,
      recipients: recipientEmails
    },
    workspaceId
  );

  return {
    success: true,
    sent_count: targets.length,
    recipients: recipientEmails,
    note: deliveryNote
  };
}

/**
 * 9. SUBMIT FORM: Public landing page registration -> CRM contact + webinar registration
 */
export async function submitForm(params: {
  slug: string;
  name: string;
  email: string;
  tag?: string;
  workspaceId?: string;
}): Promise<{ success: boolean; contact_id: string; webinar_id?: string; message: string }> {
  const ws = params.workspaceId || WS;
  const { slug, name, email, tag } = params;

  // 1. Find landing page
  const pages = await listPages(ws);
  const page = pages.find((p) => p.slug === slug && p.is_published);
  if (!page) {
    throw new Error(`Published landing page with slug "${slug}" not found`);
  }
  if (Array.isArray(page.gjs_data) && !page.gjs_data.some((block) => block.type === "registration")) {
    throw new Error("This published page does not currently accept registrations.");
  }

  // 2. Find or create CRM Contact
  let contact: Contact | undefined;
  const supabase = await getSupabase();
  if (supabase) {
    const { data, error } = await supabase.from("contacts")
      .select("*")
      .eq("workspace_id", ws)
      .ilike("email", email)
      .maybeSingle();
    if (error) throw new Error(`Unable to look up registration contact: ${error.message}`);
    if (data) contact = data as Contact;
  } else {
    contact = (await listContacts(ws)).find((c) => c.email.toLowerCase() === email.toLowerCase());
  }

  if (!contact) {
    contact = {
      id: randomUUID(),
      workspace_id: ws,
      name,
      email,
      tags: tag ? [tag.toLowerCase()] : [],
      source: `landing_page:${page.title} (/s/${page.slug})`,
      status: "lead",
      created_at: new Date().toISOString()
    };
    if (supabase) {
      const { data, error } = await supabase.from("contacts").insert(contact).select().single();
      if (error) {
        if (error.code === "23505") {
          const { data: existing, error: lookupError } = await supabase.from("contacts")
            .select("*")
            .eq("workspace_id", ws)
            .ilike("email", email)
            .single();
          if (lookupError || !existing) {
            throw new Error(`Unable to resolve existing registration contact: ${lookupError?.message || error.message}`);
          }
          contact = existing as Contact;
        } else {
          throw new Error(`Unable to create registration contact: ${error.message}`);
        }
      } else if (data) {
        contact = data as Contact;
      }
    } else {
      globalMemoryStore.contacts.unshift(contact);
    }
    await track("lead_created", { contact_id: contact.id, email, slug }, ws);
  } else {
    // Merge the optional interest tag on an existing contact.
    if (tag && !contact.tags.includes(tag.toLowerCase())) {
      contact.tags.push(tag.toLowerCase());
      if (supabase) {
        const { error } = await supabase.from("contacts").update({ tags: contact.tags }).eq("id", contact.id);
        if (error) throw new Error(`Unable to update registration contact: ${error.message}`);
      }
    }
  }

  // 3. Register only for the webinar explicitly linked to this page.
  const webinars = await listWebinars(ws);
  const webinar = webinars.find((w) => w.id === page.linked_webinar_id)
    || webinars.find((w) => w.landing_page_id === page.id);

  let webinarId: string | undefined = undefined;
  if (webinar) {
    webinarId = webinar.id;
    let existingReg: Registration | undefined;
    if (supabase) {
      const { data, error } = await supabase.from("registrations")
        .select("id")
        .eq("webinar_id", webinar.id)
        .eq("contact_id", contact.id)
        .maybeSingle();
      if (error) throw new Error(`Unable to check webinar registration: ${error.message}`);
      if (data) existingReg = data as Registration;
    } else {
      existingReg = globalMemoryStore.registrations.find(
        (r) => r.webinar_id === webinar.id && r.contact_id === contact.id
      );
    }
    if (!existingReg) {
      const reg: Registration = {
        id: randomUUID(),
        workspace_id: ws,
        webinar_id: webinar.id,
        contact_id: contact.id,
        attended: false,
        created_at: new Date().toISOString()
      };
      if (supabase) {
        const { error } = await supabase.from("registrations").insert(reg);
        if (error && error.code !== "23505") {
          throw new Error(`Unable to register for webinar: ${error.message}`);
        }
        if (!error) await track("webinar_registered", { webinar_id: webinar.id, contact_id: contact.id }, ws);
      } else {
        globalMemoryStore.registrations.unshift(reg);
        await track("webinar_registered", { webinar_id: webinar.id, contact_id: contact.id }, ws);
      }
    }
  }

  await trackPageEvent("form_submitted", {
    page_id: page.id,
    slug,
    contact_id: contact.id,
    webinar_id: webinarId
  }, ws);

  return {
    success: true,
    contact_id: contact.id,
    webinar_id: webinarId,
    message: webinarId
      ? "Registration successful! Your webinar seat is reserved."
      : "Your details were sent to the page owner."
  };
}

// ==============================================================================
// READ HELPERS & ACTION APIS
// ==============================================================================

export async function listContacts(
  workspaceId: string = WS,
  search?: string,
  tag?: string
): Promise<Contact[]> {
  let results = globalMemoryStore.contacts.filter((c) => c.workspace_id === workspaceId);

  const supabase = await getSupabase();
  if (supabase) {
    try {
      let query = supabase.from("contacts").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
      if (tag) query = query.contains("tags", [tag]);
      if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
      const { data, error } = await query;
      if (!error && data && data.length > 0) return data;
    } catch (e) {
      console.warn("Supabase listContacts fallback", e);
    }
  }

  if (search) {
    const q = search.toLowerCase();
    results = results.filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
  }
  if (tag) {
    const t = tag.toLowerCase();
    results = results.filter((c) => c.tags && c.tags.includes(t));
  }
  return results;
}

export async function createContact(
  input: Pick<Contact, "name" | "email"> & { tags?: string[]; source?: string },
  role: string,
  workspaceId: string = WS
): Promise<Contact> {
  const email = input.email.trim().toLowerCase();
  const existing = (await listContacts(workspaceId)).find(
    (contact) => contact.email.toLowerCase() === email
  );
  if (existing) throw new Error("A contact with this email already exists.");

  const contact: Contact = {
    id: `cont-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    workspace_id: workspaceId,
    name: input.name.trim(),
    email,
    tags: Array.from(new Set((input.tags || []).map((tag) => tag.trim().toLowerCase()).filter(Boolean))),
    source: input.source || "manual",
    status: "lead",
    created_at: new Date().toISOString()
  };
  const supabase = await getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("contacts")
      .insert(contact)
      .select()
      .single();
    if (error) throw new Error(`Unable to create contact: ${error.message}`);
    if (data) Object.assign(contact, data);
  }
  globalMemoryStore.contacts.unshift(contact);
  await track("lead_created", { contact_id: contact.id, source: contact.source }, workspaceId);
  await createAuditLog({
    workspace_id: workspaceId,
    role,
    tool: "create_contact",
    risk: "low",
    status: "executed",
    args: { email },
    result: { contact_id: contact.id }
  });
  return contact;
}

export async function updateContact(
  contactId: string,
  updates: Partial<Pick<Contact, "name" | "email" | "tags" | "status">>,
  role: string,
  workspaceId: string = WS
): Promise<Contact> {
  const contact = (await listContacts(workspaceId)).find((item) => item.id === contactId);
  if (!contact) throw new Error("Contact not found.");
  const cleanedUpdates = {
    ...updates,
    ...(updates.name ? { name: updates.name.trim() } : {}),
    ...(updates.email ? { email: updates.email.trim().toLowerCase() } : {}),
    ...(updates.tags ? { tags: Array.from(new Set(updates.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))) } : {})
  };
  if (cleanedUpdates.email && cleanedUpdates.email !== contact.email) {
    const duplicate = (await listContacts(workspaceId)).some(
      (item) => item.id !== contactId && item.email.toLowerCase() === cleanedUpdates.email
    );
    if (duplicate) throw new Error("A contact with this email already exists.");
  }

  const supabase = await getSupabase();
  if (supabase) {
    const { error } = await supabase
      .from("contacts")
      .update(cleanedUpdates)
      .eq("workspace_id", workspaceId)
      .eq("id", contactId);
    if (error) throw new Error(`Unable to update contact: ${error.message}`);
  }
  Object.assign(contact, cleanedUpdates);
  const memoryContact = globalMemoryStore.contacts.find((item) => item.id === contactId);
  if (memoryContact) Object.assign(memoryContact, cleanedUpdates);
  await createAuditLog({
    workspace_id: workspaceId,
    role,
    tool: "update_contact",
    risk: "low",
    status: "executed",
    args: { contact_id: contactId, fields: Object.keys(cleanedUpdates) },
    result: { status: contact.status }
  });
  return contact;
}

export async function listSegments(workspaceId: string = WS): Promise<Segment[]> {
  const supabase = await getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("segments").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
      if (!error && data && data.length > 0) return data;
    } catch (e) {}
  }
  return globalMemoryStore.segments.filter((s) => s.workspace_id === workspaceId);
}

export async function listPages(workspaceId: string = WS): Promise<Page[]> {
  const supabase = await getSupabase();
  if (supabase) {
    const { data, error } = await supabase.from("pages").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
    if (error) throw new Error(`Unable to load landing pages: ${error.message}`);
    return (data || []) as Page[];
  }
  return globalMemoryStore.pages.filter((p) => p.workspace_id === workspaceId);
}

export async function getWorkspaceName(workspaceId: string = WS): Promise<string> {
  const supabase = await getSupabase();
  if (supabase) {
    const { data, error } = await supabase.from("workspaces").select("name").eq("id", workspaceId).maybeSingle();
    if (error) throw new Error(`Unable to load workspace name: ${error.message}`);
    if (data?.name) return data.name;
  }
  return "Nexus Demo Workspace";
}

export async function listSiteThemes(workspaceId: string = WS): Promise<SavedSiteTheme[]> {
  const supabase = await getSupabase();
  if (supabase) {
    const { data, error } = await supabase.from("site_themes").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
    if (error) throw new Error(`Unable to load saved themes: ${error.message}`);
    return (data || []).map((row) => ({ ...row.theme_data, workspace_id: row.workspace_id, created_at: row.created_at })) as SavedSiteTheme[];
  }
  return globalMemoryStore.site_themes.filter((theme) => theme.workspace_id === workspaceId);
}

export async function saveSiteTheme(theme: SiteTheme, workspaceId: string = WS): Promise<SavedSiteTheme> {
  const supabase = await getSupabase();
  const saved: SavedSiteTheme = { ...theme, id: randomUUID(), name: "My Theme", workspace_id: workspaceId, created_at: new Date().toISOString() };
  if (supabase) {
    const { data, error } = await supabase.from("site_themes")
      .upsert({ workspace_id: workspaceId, name: "My Theme", theme_data: theme }, { onConflict: "workspace_id,name" })
      .select()
      .single();
    if (error) throw new Error(`Unable to save theme: ${error.message}`);
    if (!data) throw new Error("Unable to save theme: the database returned no record.");
    return { ...data.theme_data, workspace_id: data.workspace_id, created_at: data.created_at } as SavedSiteTheme;
  }
  const index = globalMemoryStore.site_themes.findIndex((item) => item.workspace_id === workspaceId && item.name === "My Theme");
  if (index >= 0) globalMemoryStore.site_themes[index] = saved;
  else globalMemoryStore.site_themes.unshift(saved);
  return saved;
}

export async function listWebinars(workspaceId: string = WS): Promise<Webinar[]> {
  let list = globalMemoryStore.webinars.filter((w) => w.workspace_id === workspaceId);

  const supabase = await getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("webinars").select("*").eq("workspace_id", workspaceId).order("scheduled_at", { ascending: true });
      if (!error && data && data.length > 0) {
        list = data;
      }
    } catch (e) {}
  }

  // Attach registration count
  return list.map((w) => ({
    ...w,
    registrations_count: globalMemoryStore.registrations.filter((r) => r.webinar_id === w.id).length
  }));
}

export async function listRegistrations(webinarId: string, workspaceId: string = WS): Promise<Registration[]> {
  let regs = globalMemoryStore.registrations.filter((r) => r.webinar_id === webinarId && r.workspace_id === workspaceId);
  const supabase = await getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("registrations")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("webinar_id", webinarId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Unable to load webinar registrations: ${error.message}`);
    if (data) regs = data;
  }
  const contacts = await listContacts(workspaceId);
  return regs.map((r) => ({
    ...r,
    contact: contacts.find((c) => c.id === r.contact_id)
  }));
}

export async function toggleRegistrationAttended(registrationId: string, attended: boolean): Promise<boolean> {
  const reg = globalMemoryStore.registrations.find((r) => r.id === registrationId);
  if (reg) {
    reg.attended = attended;
  }
  const supabase = await getSupabase();
  if (supabase) {
    try {
      await supabase.from("registrations").update({ attended }).eq("id", registrationId);
    } catch (e) {}
  }
  return true;
}

export async function listPlans(workspaceId: string = WS): Promise<Plan[]> {
  const supabase = await getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("plans").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
      if (!error && data && data.length > 0) return data;
    } catch (e) {}
  }
  return globalMemoryStore.plans.filter((p) => p.workspace_id === workspaceId);
}

export async function listSubscriptions(workspaceId: string = WS): Promise<Subscription[]> {
  let subs = globalMemoryStore.subscriptions.filter((s) => s.workspace_id === workspaceId);
  const supabase = await getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (!error && data && data.length > 0) subs = data;
    } catch (error) {
      console.warn("Supabase listSubscriptions fallback", error);
    }
  }
  const [contacts, plans] = await Promise.all([
    listContacts(workspaceId),
    listPlans(workspaceId)
  ]);
  return subs.map((s) => {
    const contact = contacts.find((c) => c.id === s.contact_id);
    const plan = plans.find((p) => p.id === s.plan_id);
    return {
      ...s,
      contact_name: contact?.name || "Anonymous Contact",
      plan_name: plan?.name || "Standard Pass"
    };
  });
}

export async function subscribeContact(
  contactId: string,
  planId: string,
  workspaceId: string = WS
): Promise<Subscription> {
  const existingSubscription = (await listSubscriptions(workspaceId)).find(
    (subscription) =>
      subscription.contact_id === contactId &&
      subscription.plan_id === planId &&
      subscription.status === "active"
  );
  if (existingSubscription) return existingSubscription;

  const plan = (await listPlans(workspaceId)).find((p) => p.id === planId);
  if (!plan) throw new Error("Plan not found");

  const newSub: Subscription = {
    id: `sub-${Date.now()}`,
    workspace_id: workspaceId,
    contact_id: contactId,
    plan_id: planId,
    status: "active",
    mrr_cents: plan.interval === "monthly" ? plan.price_cents : 0,
    created_at: new Date().toISOString()
  };
  globalMemoryStore.subscriptions.unshift(newSub);

  // Update contact status to customer
  const contact = globalMemoryStore.contacts.find((c) => c.id === contactId);
  if (contact) contact.status = "customer";

  const supabase = await getSupabase();
  if (supabase) {
    try {
      await supabase.from("subscriptions").insert({
        id: newSub.id,
        workspace_id: workspaceId,
        contact_id: contactId,
        plan_id: planId,
        status: "active",
        mrr_cents: newSub.mrr_cents
      });
      await supabase.from("contacts").update({ status: "customer" }).eq("id", contactId);
    } catch (e) {}
  }

  await track("subscribed", { contact_id: contactId, plan_id: planId, mrr_cents: newSub.mrr_cents }, workspaceId);
  return newSub;
}

export async function listCampaigns(workspaceId: string = WS): Promise<Campaign[]> {
  let campaigns = globalMemoryStore.campaigns.filter((c) => c.workspace_id === workspaceId);
  const supabase = await getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (!error && data && data.length > 0) campaigns = data;
    } catch (error) {
      console.warn("Supabase listCampaigns fallback", error);
    }
  }
  const segments = await listSegments(workspaceId);
  return campaigns.map((c) => {
    const segment = segments.find((s) => s.id === c.segment_id);
    return {
      ...c,
      segment_name: c.segment_name || segment?.name || "All Contacts"
    };
  });
}

export async function updateRecord(
  kind: MutableRecordKind,
  id: string,
  updates: Record<string, unknown>,
  role: string,
  workspaceId: string = WS
): Promise<MutableRecord> {
  const tableByKind = {
    page: "pages",
    webinar: "webinars",
    campaign: "campaigns",
    plan: "plans"
  } as const;
  const supabase = await getSupabase();

  let record: MutableRecord | undefined;
  switch (kind) {
    case "page":
      record = (await listPages(workspaceId)).find((item) => item.id === id);
      break;
    case "webinar":
      record = (await listWebinars(workspaceId)).find((item) => item.id === id);
      break;
    case "campaign":
      record = (await listCampaigns(workspaceId)).find((item) => item.id === id);
      break;
    case "plan":
      record = (await listPlans(workspaceId)).find((item) => item.id === id);
      break;
  }
  if (!record) throw new Error(`${kind} not found.`);
  if (kind === "campaign" && (record as Campaign).status !== "draft") {
    throw new Error("Only draft campaigns can be edited.");
  }

  if (kind === "page" && typeof updates.slug === "string") {
    const duplicate = (await listPages(workspaceId)).some(
      (page) => page.id !== id && page.slug === updates.slug
    );
    if (duplicate) throw new Error(`The page slug "${updates.slug}" is already in use.`);
  }
  if (kind === "webinar" && typeof updates.title === "string" && typeof updates.scheduled_at === "string") {
    const duplicate = (await listWebinars(workspaceId)).some(
      (webinar) =>
        webinar.id !== id &&
        webinar.title.trim().toLowerCase() === updates.title?.toString().trim().toLowerCase() &&
        new Date(webinar.scheduled_at).getTime() === new Date(updates.scheduled_at as string).getTime()
    );
    if (duplicate) throw new Error("A webinar with this title and schedule already exists.");
  }

  if (supabase) {
    const { error } = await supabase
      .from(tableByKind[kind])
      .update(updates)
      .eq("workspace_id", workspaceId)
      .eq("id", id);
    if (error) throw new Error(`Unable to update ${kind}: ${error.message}`);
  }

  Object.assign(record, updates, { updated_at: new Date().toISOString() });
  await createAuditLog({
    workspace_id: workspaceId,
    role,
    tool: `update_${kind}`,
    risk: "medium",
    status: "executed",
    args: { id, updates },
    result: { entity: kind, id }
  });
  return record;
}

export async function deleteRecord(
  kind: MutableRecordKind,
  id: string,
  role: string,
  workspaceId: string = WS
): Promise<void> {
  const tableByKind = {
    page: "pages",
    webinar: "webinars",
    campaign: "campaigns",
    plan: "plans"
  } as const;
  const supabase = await getSupabase();
  const exists = kind === "page"
    ? (await listPages(workspaceId)).some((item) => item.id === id)
    : kind === "webinar"
    ? (await listWebinars(workspaceId)).some((item) => item.id === id)
    : kind === "campaign"
    ? (await listCampaigns(workspaceId)).some((item) => item.id === id)
    : (await listPlans(workspaceId)).some((item) => item.id === id);
  if (!exists) throw new Error(`${kind} not found.`);

  if (supabase) {
    const { error } = await supabase
      .from(tableByKind[kind])
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("id", id);
    if (error) throw new Error(`Unable to delete ${kind}: ${error.message}`);
  }

  let removed = true;
  switch (kind) {
    case "page": {
      const index = globalMemoryStore.pages.findIndex((item) => item.id === id && item.workspace_id === workspaceId);
      if (index !== -1) {
        globalMemoryStore.pages.splice(index, 1);
        for (const webinar of globalMemoryStore.webinars) {
          if (webinar.landing_page_id === id) webinar.landing_page_id = undefined;
        }
        removed = true;
      }
      break;
    }
    case "webinar": {
      const index = globalMemoryStore.webinars.findIndex((item) => item.id === id && item.workspace_id === workspaceId);
      if (index !== -1) {
        globalMemoryStore.webinars.splice(index, 1);
        globalMemoryStore.registrations = globalMemoryStore.registrations.filter((item) => item.webinar_id !== id);
        removed = true;
      }
      break;
    }
    case "campaign": {
      const index = globalMemoryStore.campaigns.findIndex((item) => item.id === id && item.workspace_id === workspaceId);
      if (index !== -1) {
        globalMemoryStore.campaigns.splice(index, 1);
        removed = true;
      }
      break;
    }
    case "plan": {
      const index = globalMemoryStore.plans.findIndex((item) => item.id === id && item.workspace_id === workspaceId);
      if (index !== -1) {
        globalMemoryStore.plans.splice(index, 1);
        globalMemoryStore.subscriptions = globalMemoryStore.subscriptions.filter((item) => item.plan_id !== id);
        for (const webinar of globalMemoryStore.webinars) {
          if (webinar.plan_id === id) webinar.plan_id = undefined;
        }
        removed = true;
      }
      break;
    }
  }
  if (!removed) throw new Error(`${kind} not found.`);

  await createAuditLog({
    workspace_id: workspaceId,
    role,
    tool: `delete_${kind}`,
    risk: "medium",
    status: "executed",
    args: { id },
    result: { entity: kind, id, deleted: true }
  });
}

export async function listAuditLogs(
  workspaceId: string = WS,
  status?: string,
  risk?: string
): Promise<AuditLog[]> {
  let logs = globalMemoryStore.audit_logs.filter((a) => a.workspace_id === workspaceId);

  const supabase = await getSupabase();
  if (supabase) {
    try {
      let q = supabase.from("audit_logs").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
      if (status && status !== "all") q = q.eq("status", status);
      if (risk && risk !== "all") q = q.eq("risk", risk);
      const { data, error } = await q;
      if (!error && data && data.length > 0) return data;
    } catch (e) {}
  }

  if (status && status !== "all") logs = logs.filter((l) => l.status === status);
  if (risk && risk !== "all") logs = logs.filter((l) => l.risk === risk);
  return logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function createAuditLog(
  log: Omit<AuditLog, "id" | "created_at">
): Promise<AuditLog> {
  const { getOptionalIdentity } = await import("@/lib/auth");
  const identity = await getOptionalIdentity();
  const newLog: AuditLog = {
    id: randomUUID(),
    ...log,
    args: identity
      ? {
          ...log.args,
          actor_id: identity.userId,
          actor_email: identity.email,
          real_role: identity.realRole,
          effective_role: identity.role,
          impersonating: identity.isImpersonating
        }
      : log.args,
    created_at: new Date().toISOString()
  };
  globalMemoryStore.audit_logs.unshift(newLog);

  const supabase = await getSupabase();
  if (supabase) {
    const { error } = await supabase.from("audit_logs").insert(newLog);
    if (error) throw new Error(`Unable to persist audit log: ${error.message}`);
  }
  return newLog;
}

export async function createApprovalRequest(
    action: ApprovalRequest["action"],
    args: Record<string, string>,
    requestedBy: string,
    workspaceId: string = WS
  ): Promise<ApprovalRequest> {
    const idempotencyKey = `${action}:${Object.values(args).join(":")}:${requestedBy}`;
    const existing = globalMemoryStore.approvals.find(
      (item) =>
        item.workspace_id === workspaceId &&
        item.status === "pending" &&
        `${item.action}:${Object.values(item.args).join(":")}:${item.requested_by}` === idempotencyKey
    );
    if (existing) return existing;

    const approval: ApprovalRequest = {
      id: `approval-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      workspace_id: workspaceId,
      action,
      args,
      requested_by: requestedBy,
      status: "pending",
      created_at: new Date().toISOString()
    };
    globalMemoryStore.approvals.unshift(approval);
    const supabase = await getSupabase();
    if (supabase) {
      const { error } = await supabase.from("approvals").insert({
        id: approval.id,
        workspace_id: workspaceId,
        tool: action,
        args,
        requested_by: requestedBy,
        status: "pending"
      });
      if (error) throw new Error(`Unable to save approval request: ${error.message}`);
    }
    await createAuditLog({
      workspace_id: workspaceId,
      role: requestedBy,
      tool: `request_${action}`,
      risk: "high",
      status: "pending_approval",
      args,
      result: { approval_id: approval.id }
    });
    return approval;
  }

export async function listApprovalRequests(workspaceId: string = WS): Promise<ApprovalRequest[]> {
    let requests = globalMemoryStore.approvals.filter((item) => item.workspace_id === workspaceId);
    const supabase = await getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from("approvals")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(`Unable to load approval requests: ${error.message}`);
      if (data) {
        requests = data.map((item) => ({
          id: item.id,
          workspace_id: item.workspace_id,
          action: item.tool,
          args: item.args || {},
          requested_by: item.requested_by || "marketer",
          status: item.status,
          reason: item.reason,
          created_at: item.created_at
        }));
      }
    }
    return requests;
  }

export async function decideApprovalRequest(
    approvalId: string,
    approved: boolean,
    decidedBy: string,
    reason?: string,
    workspaceId: string = WS
  ): Promise<ApprovalRequest> {
    const approval = (await listApprovalRequests(workspaceId)).find((item) => item.id === approvalId);
    if (!approval) throw new Error("Approval request not found.");
    if (approval.status !== "pending") throw new Error("This approval request has already been decided.");

    if (approved) {
      if (approval.action === "subscribe_contact") {
        await subscribeContact(approval.args.contactId, approval.args.planId, workspaceId);
      } else if (approval.action === "send_campaign") {
        await sendCampaign(approval.args.campaignId, workspaceId);
      }
    }

    approval.status = approved ? "approved" : "rejected";
    approval.reason = reason?.trim() || undefined;
    const supabase = await getSupabase();
    if (supabase) {
      const { error } = await supabase
        .from("approvals")
        .update({
          status: approval.status,
          reason: approval.reason || null,
          decided_by: decidedBy,
          decided_at: new Date().toISOString()
        })
        .eq("id", approvalId)
        .eq("workspace_id", workspaceId)
        .eq("status", "pending");
      if (error) throw new Error(`Unable to save approval decision: ${error.message}`);
    }
    await createAuditLog({
      workspace_id: workspaceId,
      role: decidedBy,
      tool: approved ? "approve_request" : "reject_request",
      risk: "high",
      status: approved ? "executed" : "rejected",
      args: { approval_id: approvalId, reason: reason || "" },
      result: { action: approval.action }
    });
    return approval;
}

export async function getAgentRun(runId: string): Promise<AgentRun | null> {
  const run = globalMemoryStore.agent_runs.find((r) => r.id === runId);
  return run || null;
}

export async function saveAgentRun(run: AgentRun): Promise<void> {
  const idx = globalMemoryStore.agent_runs.findIndex((r) => r.id === run.id);
  if (idx >= 0) {
    globalMemoryStore.agent_runs[idx] = run;
  } else {
    globalMemoryStore.agent_runs.unshift(run);
  }

  const supabase = await getSupabase();
  if (supabase) {
    try {
      await supabase.from("agent_runs").upsert(run);
    } catch (e) {}
  }
}
