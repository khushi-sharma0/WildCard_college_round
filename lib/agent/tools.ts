import { z } from "zod";
import {
  createSegment,
  createPage,
  createWebinar,
  createPlan,
  draftCampaign,
  sendCampaign,
  queryAnalytics,
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
      if (!Date.parse(date)) {
        // Calculate next Friday if string matches
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
      const page = await createPage(
        args.title,
        args.slug,
        args.content,
        undefined,
        undefined,
        context.workspaceId || WS,
        true
      );
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
        context.workspaceId || WS,
        `agent:${context.workspaceId || WS}:${args.segment_id}:${args.subject.trim().toLowerCase()}`
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
