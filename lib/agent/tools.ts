import { z } from "zod";
import {
  createSegment,
  createPage,
  createWebinar,
  createPlan,
  draftCampaign,
  sendCampaign,
  queryAnalytics,
  listContacts,
  listWebinars,
  listCampaigns,
  listSegments,
  listPlans,
  listSubscriptions,
  listAuditLogs,
  WS
} from "../services";
import { UserRole } from "../auth";

export type RiskTier = "low" | "medium" | "high";

export interface ToolContext {
  role: UserRole;
  workspaceId: string;
}

export interface AgentTool<TParams extends z.ZodTypeAny = any> {
  name: string;
  description: string;
  riskTier: RiskTier;
  allowedRoles: UserRole[];
  schema: TParams;
  execute: (args: z.infer<TParams>, context: ToolContext) => Promise<any>;
}

export const tools: Record<string, AgentTool> = {
  submit_plan: {
    name: "submit_plan",
    description: "Submit a step-by-step checklist of operations the AI agent intends to execute to fulfill the user's objective.",
    riskTier: "low",
    allowedRoles: ["admin", "marketer", "viewer"],
    schema: z.object({
      steps: z.array(z.string()).describe("List of human-readable planned steps in execution order")
    }),
    execute: async (args) => {
      return {
        acknowledged: true,
        steps: args.steps,
        count: args.steps.length
      };
    }
  },

  get_crm_summary: {
    name: "get_crm_summary",
    description: "Retrieve comprehensive CRM contact metrics: total contacts, lead counts, status breakdowns (lead, qualified, customer, lost), tag distributions (retail, saas, edu), and sample leads.",
    riskTier: "low",
    allowedRoles: ["admin", "marketer", "viewer"],
    schema: z.object({
      tag: z.string().optional().describe("Optional filter tag e.g. 'retail', 'saas', 'edu'"),
      search: z.string().optional().describe("Optional keyword search")
    }),
    execute: async (args, context) => {
      const contacts = await listContacts(context.workspaceId || WS, args.search, args.tag);
      const total = contacts.length;
      const byStatus = {
        lead: contacts.filter((c) => c.status === "lead").length,
        qualified: contacts.filter((c) => c.status === "qualified").length,
        customer: contacts.filter((c) => c.status === "customer").length,
        lost: contacts.filter((c) => c.status === "lost").length
      };

      const byTag: Record<string, number> = {};
      for (const c of contacts) {
        if (c.tags) {
          for (const t of c.tags) {
            byTag[t] = (byTag[t] || 0) + 1;
          }
        }
      }

      const conversionRate = total > 0 ? Number(((byStatus.customer / total) * 100).toFixed(1)) : 0;

      return {
        total_contacts: total,
        by_status: byStatus,
        by_tag: byTag,
        conversion_rate_percent: conversionRate,
        sample_contacts: contacts.slice(0, 8).map((c) => ({
          name: c.name,
          email: c.email,
          tags: c.tags,
          status: c.status
        }))
      };
    }
  },

  query_analytics: {
    name: "query_analytics",
    description: "Fetch real-time analytics KPIs, conversion funnel, campaign performance, and recent activity metrics.",
    riskTier: "low",
    allowedRoles: ["admin", "marketer", "viewer"],
    schema: z.object({
      focus: z.string().optional().describe("Optional focus area: overview, funnel, webinars, mrr")
    }),
    execute: async (_args, context) => {
      const data = await queryAnalytics(context.workspaceId || WS);
      return data;
    }
  },

  get_audit_summary: {
    name: "get_audit_summary",
    description: "Retrieve comprehensive audit logs, governance events, risk levels, and execution statuses across the platform.",
    riskTier: "low",
    allowedRoles: ["admin", "marketer", "viewer"],
    schema: z.object({
      limit: z.number().optional().describe("Maximum number of recent audit logs to retrieve")
    }),
    execute: async (args, context) => {
      const logs = await listAuditLogs(context.workspaceId || WS);
      const total = logs.length;
      const byRisk = {
        low: logs.filter((l) => l.risk === "low").length,
        medium: logs.filter((l) => l.risk === "medium").length,
        high: logs.filter((l) => l.risk === "high").length
      };
      const byStatus = {
        executed: logs.filter((l) => l.status === "executed").length,
        pending_approval: logs.filter((l) => l.status === "pending_approval").length,
        blocked: logs.filter((l) => l.status === "blocked").length,
        rejected: logs.filter((l) => l.status === "rejected").length,
        error: logs.filter((l) => l.status === "error").length
      };
      return {
        total_logs: total,
        by_risk: byRisk,
        by_status: byStatus,
        recent_logs: logs.slice(0, args.limit || 8).map((l) => ({
          id: l.id,
          tool: l.tool,
          role: l.role,
          risk: l.risk,
          status: l.status,
          created_at: l.created_at
        }))
      };
    }
  },

  list_webinars_data: {
    name: "list_webinars_data",
    description: "Retrieve current webinars, scheduled dates, Jitsi room identifiers, and attendee registration counts.",
    riskTier: "low",
    allowedRoles: ["admin", "marketer", "viewer"],
    schema: z.object({}),
    execute: async (_args, context) => {
      const list = await listWebinars(context.workspaceId || WS);
      return {
        total_webinars: list.length,
        webinars: list.map((w) => ({
          id: w.id,
          title: w.title,
          scheduled_at: w.scheduled_at,
          jitsi_room: w.jitsi_room,
          registrations_count: w.registrations_count || 0
        }))
      };
    }
  },

  list_marketing_data: {
    name: "list_marketing_data",
    description: "Retrieve current marketing email campaigns, drafts, delivery statistics, and target segments.",
    riskTier: "low",
    allowedRoles: ["admin", "marketer", "viewer"],
    schema: z.object({}),
    execute: async (_args, context) => {
      const camps = await listCampaigns(context.workspaceId || WS);
      const segs = await listSegments(context.workspaceId || WS);
      return {
        total_campaigns: camps.length,
        campaigns: camps.map((c) => ({
          id: c.id,
          subject: c.subject,
          status: c.status,
          sent_count: c.sent_count,
          created_at: c.created_at
        })),
        segments: segs.map((s) => ({
          id: s.id,
          name: s.name,
          filter_tag: s.filter_tag
        }))
      };
    }
  },

  list_billing_data: {
    name: "list_billing_data",
    description: "Retrieve available SaaS subscription plans, ticket tiers, active subscriptions, and MRR.",
    riskTier: "low",
    allowedRoles: ["admin", "marketer", "viewer"],
    schema: z.object({}),
    execute: async (_args, context) => {
      const plans = await listPlans(context.workspaceId || WS);
      const subs = await listSubscriptions(context.workspaceId || WS);
      const activeSubs = subs.filter((s) => s.status === "active");
      const mrrCents = activeSubs.reduce((acc, s) => acc + (s.mrr_cents || 0), 0);
      return {
        total_plans: plans.length,
        plans: plans.map((p) => ({
          id: p.id,
          name: p.name,
          price_cents: p.price_cents,
          interval: p.interval
        })),
        active_subscriptions_count: activeSubs.length,
        mrr_usd: (mrrCents / 100).toFixed(2)
      };
    }
  },

  create_segment: {
    name: "create_segment",
    description: "Create an audience segment to group CRM contacts by industry or behavior tag (e.g. 'retail', 'saas', 'edu').",
    riskTier: "low",
    allowedRoles: ["admin", "marketer"],
    schema: z.object({
      name: z.string().describe("Descriptive name for the segment"),
      filter_tag: z.string().describe("Contact tag to filter by, e.g. 'retail'")
    }),
    execute: async (args, context) => {
      const seg = await createSegment(args.name, args.filter_tag, context.workspaceId || WS);
      return {
        segment_id: seg.id,
        name: seg.name,
        filter_tag: seg.filter_tag
      };
    }
  },

  create_webinar: {
    name: "create_webinar",
    description: "Schedule a live webinar room with instant Jitsi Meet video conferencing room and optional ticket/landing page linkages.",
    riskTier: "medium",
    allowedRoles: ["admin", "marketer"],
    schema: z.object({
      title: z.string().describe("Webinar title"),
      scheduled_at: z.string().describe("ISO datetime string or human readable date like 'next Friday 2:00 PM'"),
      landing_page_id: z.string().optional().describe("Associated landing page ID"),
      plan_id: z.string().optional().describe("Associated ticket or plan ID")
    }),
    execute: async (args, context) => {
      let date = args.scheduled_at;
      if (!date || date.toLowerCase() === "now" || date.toLowerCase() === "instant") {
        date = new Date().toISOString();
      } else if (!Date.parse(date)) {
        const nextFri = new Date();
        nextFri.setDate(nextFri.getDate() + ((7 + 5 - nextFri.getDay()) % 7 || 7));
        nextFri.setHours(14, 0, 0, 0);
        date = nextFri.toISOString();
      }
      const webinar = await createWebinar(
        args.title,
        date,
        args.landing_page_id,
        args.plan_id,
        context.workspaceId || WS
      );
      return {
        webinar_id: webinar.id,
        title: webinar.title,
        jitsi_room: webinar.jitsi_room,
        jitsi_url: `https://meet.jit.si/${webinar.jitsi_room}`,
        scheduled_at: webinar.scheduled_at
      };
    }
  },

  create_page: {
    name: "create_page",
    description: "Generate and publish an interactive landing page with registration form and conversion messaging.",
    riskTier: "medium",
    allowedRoles: ["admin", "marketer"],
    schema: z.object({
      title: z.string().describe("Landing page headline/title"),
      slug: z.string().describe("URL friendly slug e.g. 'ai-in-retail-masterclass'"),
      content: z.string().describe("Engaging copy explaining the webinar value proposition")
    }),
    execute: async (args, context) => {
      const page = await createPage(args.title, args.slug, args.content, undefined, undefined, context.workspaceId || WS);
      return {
        page_id: page.id,
        title: page.title,
        slug: page.slug,
        url: `/s/${page.slug}`
      };
    }
  },

  create_plan: {
    name: "create_plan",
    description: "Create a SaaS subscription or paid webinar ticket plan. (Admin role required)",
    riskTier: "medium",
    allowedRoles: ["admin"],
    schema: z.object({
      name: z.string().describe("Plan name, e.g. 'AI in Retail VIP Pass'"),
      price_cents: z.number().int().positive().describe("Price in cents (e.g. 4900 for $49)"),
      interval: z.enum(["monthly", "yearly", "one_time"]).default("one_time"),
      description: z.string().optional().describe("Benefits included in the plan")
    }),
    execute: async (args, context) => {
      const plan = await createPlan(
        args.name,
        args.price_cents,
        args.interval,
        args.description || "Access to live session, Q&A, and exclusive retail benchmark materials",
        context.workspaceId || WS
      );
      return {
        plan_id: plan.id,
        name: plan.name,
        price_cents: plan.price_cents,
        interval: plan.interval
      };
    }
  },

  draft_campaign: {
    name: "draft_campaign",
    description: "Draft an outbound email marketing campaign tailored to a target segment.",
    riskTier: "low",
    allowedRoles: ["admin", "marketer"],
    schema: z.object({
      segment_id: z.string().describe("Target audience segment ID"),
      subject: z.string().describe("Compelling email subject line"),
      body: z.string().describe("Email body with optional {{name}} personalization tags")
    }),
    execute: async (args, context) => {
      const camp = await draftCampaign(
        args.segment_id,
        args.subject,
        args.body,
        context.workspaceId || WS
      );
      return {
        campaign_id: camp.id,
        subject: camp.subject,
        status: camp.status
      };
    }
  },

  send_campaign: {
    name: "send_campaign",
    description: "HIGH RISK: Deliver email blast to all contacts in target segment via Mailtrap sandbox. Requires Admin approval checkpoint before execution.",
    riskTier: "high",
    allowedRoles: ["admin"], // Marketer can draft, but only Admin can approve and execute
    schema: z.object({
      campaign_id: z.string().describe("ID of the campaign to send")
    }),
    execute: async (args, context) => {
      const result = await sendCampaign(args.campaign_id, context.workspaceId || WS);
      return result;
    }
  }
};
