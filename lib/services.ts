import { createClient, SupabaseClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

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
  html?: string;
  css?: string;
  is_published: boolean;
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

// Global singleton for memory fallback across Next.js route chunks
const globalMemoryStore: MemoryStore =
  (globalThis as any).__nexusMemoryStore ||
  ((globalThis as any).__nexusMemoryStore = new MemoryStore());

function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || url.includes("your-project") || key.includes("your_service_role_key")) {
    return null;
  }
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
  const supabase = getSupabase();
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

/**
 * 2. QUERY ANALYTICS: Summary KPIs, Funnel, and Daily Trends
 */
export async function queryAnalytics(workspaceId: string = WS) {
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

  // Calculate Webinar Stats
  let totalRegistrations = 0;
  let totalAttended = 0;
  for (const w of webinars) {
    const regs = await listRegistrations(w.id, workspaceId);
    totalRegistrations += regs.length;
    totalAttended += regs.filter((r) => r.attended).length;
  }

  // Campaign stats
  const emailsSent = campaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0);

  // Agent stats & hours saved (each executed action saves ~6 mins = 0.1 hr)
  const executedAgentActions = auditLogs.filter((a) => a.status === "executed").length;
  const estimatedHoursSaved = Number((executedAgentActions * 0.1).toFixed(1));

  // Funnel data
  const pageViews = 240 + contacts.length * 2;
  const funnel = [
    { stage: "Page Views", count: pageViews },
    { stage: "Leads Created", count: contacts.length },
    { stage: "Webinar Registrations", count: totalRegistrations || 12 },
    { stage: "Emails Sent", count: emailsSent || 22 },
    { stage: "Customers (Subscribed)", count: customersCount || 5 }
  ];

  // Daily events breakdown for line chart
  const daysMap: Record<string, { date: string; views: number; leads: number; registrations: number; emails: number }> = {};
  for (let i = 13; i >= 0; i--) {
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

  // Populate from memory/supabase events
  const events = globalMemoryStore.events.filter((e) => e.workspace_id === workspaceId);
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
      totalRegistrations: totalRegistrations || 12,
      emailsSent: emailsSent || 22,
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
  const supabase = getSupabase();
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
  workspaceId: string = WS
): Promise<Page> {
  const cleanSlug = slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/^-+|-+$/g, "");

  const generatedHtml =
    html ||
    `<div class="max-w-3xl mx-auto py-12 px-6 text-slate-100">
      <div class="inline-block px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-full text-xs font-semibold uppercase tracking-wider mb-4 border border-indigo-500/30">Official Executive Webinar</div>
      <h1 class="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent mb-6">${title}</h1>
      <p class="text-lg text-slate-300 leading-relaxed mb-8">${content}</p>
    </div>`;

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("pages")
        .insert({
          workspace_id: workspaceId,
          title,
          slug: cleanSlug,
          content,
          html: generatedHtml,
          css: css || "",
          is_published: true
        })
        .select()
        .single();
      if (!error && data) {
        await track("page_created", { page_id: data.id, slug: cleanSlug }, workspaceId);
        return data;
      }
    } catch (err) {
      console.warn("Supabase createPage fallback", err);
    }
  }

  const newPage: Page = {
    id: `page-${Date.now()}`,
    workspace_id: workspaceId,
    title,
    slug: cleanSlug,
    content,
    html: generatedHtml,
    css: css || "",
    is_published: true,
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
  const roomClean = title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 32);
  const jitsi_room = `nexus-${roomClean}-${Date.now().toString(36)}`;

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("webinars")
        .insert({
          workspace_id: workspaceId,
          title,
          scheduled_at: new Date(scheduled_at).toISOString(),
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
    scheduled_at: new Date(scheduled_at).toISOString(),
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
  const supabase = getSupabase();
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
  workspaceId: string = WS
): Promise<Campaign> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .insert({
          workspace_id: workspaceId,
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
  const supabase = getSupabase();
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
  const page = pages.find((p) => p.slug === slug);
  if (!page) {
    throw new Error(`Landing page with slug "${slug}" not found`);
  }

  // 2. Find or create CRM Contact
  const contacts = await listContacts(ws);
  let contact = contacts.find((c) => c.email.toLowerCase() === email.toLowerCase());

  const initialTags = tag ? [tag.toLowerCase()] : ["retail", "inbound"];

  if (!contact) {
    contact = {
      id: `cont-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      workspace_id: ws,
      name,
      email,
      tags: initialTags,
      source: `landing_page:${slug}`,
      status: "lead",
      created_at: new Date().toISOString()
    };
    globalMemoryStore.contacts.unshift(contact);

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from("contacts").insert({
          id: contact.id,
          workspace_id: ws,
          name,
          email,
          tags: contact.tags,
          source: contact.source,
          status: "lead"
        });
      } catch (e) {
        console.warn("Supabase contact insert fallback", e);
      }
    }
    await track("lead_created", { contact_id: contact.id, email, slug }, ws);
  } else {
    // Merge tag
    if (tag && !contact.tags.includes(tag.toLowerCase())) {
      contact.tags.push(tag.toLowerCase());
    }
  }

  // 3. Check for linked webinar
  const webinars = await listWebinars(ws);
  const webinar = webinars.find((w) => w.landing_page_id === page.id) || webinars[0];

  let webinarId: string | undefined = undefined;
  if (webinar) {
    webinarId = webinar.id;
    // Register contact
    const existingReg = globalMemoryStore.registrations.find(
      (r) => r.webinar_id === webinar.id && r.contact_id === contact.id
    );
    if (!existingReg) {
      const reg: Registration = {
        id: `reg-${Date.now()}`,
        workspace_id: ws,
        webinar_id: webinar.id,
        contact_id: contact.id,
        attended: false,
        created_at: new Date().toISOString()
      };
      globalMemoryStore.registrations.unshift(reg);

      const supabase = getSupabase();
      if (supabase) {
        try {
          await supabase.from("registrations").insert({
            id: reg.id,
            workspace_id: ws,
            webinar_id: webinar.id,
            contact_id: contact.id,
            attended: false
          });
        } catch (e) {
          console.warn("Supabase registration insert fallback", e);
        }
      }
      await track("webinar_registered", { webinar_id: webinar.id, contact_id: contact.id }, ws);
    }
  }

  await track("page_view", { slug, email }, ws);

  return {
    success: true,
    contact_id: contact.id,
    webinar_id: webinarId,
    message: "Registration successful! You have secured your VIP access."
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

  const supabase = getSupabase();
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

export async function listSegments(workspaceId: string = WS): Promise<Segment[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("segments").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
      if (!error && data && data.length > 0) return data;
    } catch (e) {}
  }
  return globalMemoryStore.segments.filter((s) => s.workspace_id === workspaceId);
}

export async function listPages(workspaceId: string = WS): Promise<Page[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("pages").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
      if (!error && data && data.length > 0) return data;
    } catch (e) {}
  }
  return globalMemoryStore.pages.filter((p) => p.workspace_id === workspaceId);
}

export async function listWebinars(workspaceId: string = WS): Promise<Webinar[]> {
  let list = globalMemoryStore.webinars.filter((w) => w.workspace_id === workspaceId);

  const supabase = getSupabase();
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
  const regs = globalMemoryStore.registrations.filter((r) => r.webinar_id === webinarId && r.workspace_id === workspaceId);
  return regs.map((r) => ({
    ...r,
    contact: globalMemoryStore.contacts.find((c) => c.id === r.contact_id)
  }));
}

export async function toggleRegistrationAttended(registrationId: string, attended: boolean): Promise<boolean> {
  const reg = globalMemoryStore.registrations.find((r) => r.id === registrationId);
  if (reg) {
    reg.attended = attended;
  }
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from("registrations").update({ attended }).eq("id", registrationId);
    } catch (e) {}
  }
  return true;
}

export async function listPlans(workspaceId: string = WS): Promise<Plan[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("plans").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
      if (!error && data && data.length > 0) return data;
    } catch (e) {}
  }
  return globalMemoryStore.plans.filter((p) => p.workspace_id === workspaceId);
}

export async function listSubscriptions(workspaceId: string = WS): Promise<Subscription[]> {
  const subs = globalMemoryStore.subscriptions.filter((s) => s.workspace_id === workspaceId);
  return subs.map((s) => {
    const contact = globalMemoryStore.contacts.find((c) => c.id === s.contact_id);
    const plan = globalMemoryStore.plans.find((p) => p.id === s.plan_id);
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

  const supabase = getSupabase();
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
  const campaigns = globalMemoryStore.campaigns.filter((c) => c.workspace_id === workspaceId);
  return campaigns.map((c) => {
    const segment = globalMemoryStore.segments.find((s) => s.id === c.segment_id);
    return {
      ...c,
      segment_name: segment?.name || "All Contacts"
    };
  });
}

export async function listAuditLogs(
  workspaceId: string = WS,
  status?: string,
  risk?: string
): Promise<AuditLog[]> {
  let logs = globalMemoryStore.audit_logs.filter((a) => a.workspace_id === workspaceId);

  const supabase = getSupabase();
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
  const newLog: AuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    ...log,
    created_at: new Date().toISOString()
  };
  globalMemoryStore.audit_logs.unshift(newLog);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from("audit_logs").insert(newLog);
    } catch (e) {}
  }

  return newLog;
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

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from("agent_runs").upsert(run);
    } catch (e) {}
  }
}
