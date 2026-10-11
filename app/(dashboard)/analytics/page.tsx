import AnalyticsEditor from "@/components/audit/analytics-editor";
import { getRole } from "@/lib/auth";
import { applyAnalyticsOverrides, getAnalyticsOverrides } from "@/lib/analytics-overrides";

import Link from "next/link";
import { queryAnalytics, listAuditLogs, listAgentRuns, WS } from "@/lib/services";
import DashboardCharts from "@/components/dashboard/dashboard-charts";
import { formatCurrency } from "@/lib/utils";
import { Activity, ArrowUpRight, Bot, CheckCircle2, Clock3, Mail, ShieldAlert, Users, Video, Eye } from "lucide-react";

export const revalidate = 0;

export default async function AnalyticsPage() {
  const [rawAnalytics, auditLogs, runs, overrides] = await Promise.all([
    queryAnalytics(WS),
    listAuditLogs(WS),
    listAgentRuns(WS),
    getAnalyticsOverrides(),
  ]);
  const analytics = applyAnalyticsOverrides(rawAnalytics, overrides);
  const { kpis, funnel, eventsOverTime } = analytics;
  const role = await getRole();
  const pending = runs.filter((run) => run.status === "awaiting_approval").length;
  const rejected = auditLogs.filter((log) => log.status === "rejected").length;
  const failed = auditLogs.filter((log) => log.status === "error").length;
  const metrics = [
    { key: "totalContacts", label: "Total contacts", value: kpis.totalContacts, sourceValue: rawAnalytics.kpis.totalContacts, note: `${kpis.leadsCount} leads`, icon: Users },
    { key: "pageViews", label: "Page traffic", value: kpis.pageViews, sourceValue: rawAnalytics.kpis.pageViews, note: "Across landing sites", icon: Eye },
    { key: "totalRegistrations", label: "Webinar registrations", value: kpis.totalRegistrations, sourceValue: rawAnalytics.kpis.totalRegistrations, note: "Registration records", icon: Video },
    { key: "emailsSent", label: "Emails sent", value: kpis.emailsSent, sourceValue: rawAnalytics.kpis.emailsSent, note: "Campaign activity", icon: Mail },
    { key: "mrrCents", label: "Monthly recurring revenue", value: formatCurrency(kpis.mrrCents), sourceValue: rawAnalytics.kpis.mrrCents, note: `${kpis.customersCount} customer accounts`, icon: ArrowUpRight },
    { key: "executedAgentActions", label: "Agent executions", value: kpis.executedAgentActions, sourceValue: rawAnalytics.kpis.executedAgentActions, note: `${kpis.estimatedHoursSaved} estimated hours saved`, icon: Bot },
    { key: "pendingApprovals", label: "Pending approvals", value: overrides.pendingApprovals ?? pending, sourceValue: pending, note: "Awaiting Marketer review", icon: Clock3 },
    { key: "rejectedErrorEvents", label: "Rejected / error events", value: overrides.rejectedErrorEvents ?? rejected + failed, sourceValue: rejected + failed, note: `${rejected} rejected · ${failed} errors`, icon: ShieldAlert },
  ];
  const editableMetrics = [
    { key: "totalContacts", label: "Total contacts", value: kpis.totalContacts, sourceValue: rawAnalytics.kpis.totalContacts, note: "Total contacts in workspace CRM." },
    { key: "pageViews", label: "Page traffic", value: kpis.pageViews, sourceValue: rawAnalytics.kpis.pageViews, note: "Total views across landing sites." },
    { key: "totalRegistrations", label: "Webinar registrations", value: kpis.totalRegistrations, sourceValue: rawAnalytics.kpis.totalRegistrations, note: "Registration records across webinars." },
    { key: "emailsSent", label: "Emails sent", value: kpis.emailsSent, sourceValue: rawAnalytics.kpis.emailsSent, note: "Marketing campaign delivery count." },
    { key: "mrrCents", label: "Monthly recurring revenue (cents)", value: kpis.mrrCents, sourceValue: rawAnalytics.kpis.mrrCents, note: `Stored in cents (${formatCurrency(kpis.mrrCents)}).` },
    { key: "executedAgentActions", label: "Agent executions", value: kpis.executedAgentActions, sourceValue: rawAnalytics.kpis.executedAgentActions, note: "Completed autonomous agent operations." },
    { key: "pendingApprovals", label: "Pending approvals", value: overrides.pendingApprovals ?? pending, sourceValue: pending, note: "Actions awaiting Marketer/Admin review." },
    { key: "rejectedErrorEvents", label: "Rejected / error events", value: overrides.rejectedErrorEvents ?? rejected + failed, sourceValue: rejected + failed, note: "Rejected actions and failure events." },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-4 border-b border-stone-300 pb-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#C85A32]"><Activity className="h-4 w-4" /> Business intelligence / Workspace</div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-stone-900 md:text-4xl">Integrated Analytics</h1>
          <p className="mt-2 max-w-2xl text-sm text-stone-600">A consolidated view of CRM, website activity, campaigns, webinars, subscriptions, and agent governance using Nexus workspace data.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 border border-stone-300 bg-white px-3 py-2 text-xs font-mono uppercase"><CheckCircle2 className="h-4 w-4 text-[#4A5D4E]" /> Workspace data</div>
          <AnalyticsEditor role={role} metrics={editableMetrics} initialOverrides={overrides} />
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const isOverridden = overrides[metric.key as keyof typeof overrides] !== undefined;
          return (
            <article key={metric.label} className="border border-stone-300 bg-white p-4 shadow-[2px_2px_0px_0px_#1C1917]">
              <div className="flex items-center justify-between gap-3 text-[10px] font-mono font-semibold uppercase tracking-wider text-stone-500">
                <span className="flex items-center gap-1.5">
                  {metric.label}
                  {isOverridden && (
                    <span className="bg-amber-100 text-amber-900 border border-amber-300 px-1 py-0.2 text-[9px]" title="Manual override active from Supabase">
                      OVERRIDE
                    </span>
                  )}
                </span>
                <Icon className="h-4 w-4 shrink-0 text-[#C85A32]" />
              </div>
              <div className="mt-3 break-words font-serif text-3xl font-bold text-stone-900">{metric.value}</div>
              <p className="mt-1 text-xs text-stone-500">{metric.note}</p>
            </article>
          );
        })}
      </section>

      <section className="border border-stone-300 bg-[#F5F2EB] p-4 md:p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="font-serif text-xl font-bold">Conversion and activity trends</h2><p className="mt-1 text-xs text-stone-600">Existing 14-day activity series and funnel aggregation from the Nexus analytics service.</p></div><Link href="/" className="inline-flex items-center gap-2 self-start border border-stone-900 bg-white px-3 py-2 text-xs font-mono font-bold uppercase hover:bg-stone-100">Main dashboard <ArrowUpRight className="h-3.5 w-3.5" /></Link></div></section>
      <DashboardCharts funnel={funnel} eventsOverTime={eventsOverTime} />

      <section className="grid gap-4 md:grid-cols-3">
        <article className="border border-stone-300 bg-white p-5"><div className="text-[10px] font-mono font-bold uppercase tracking-widest text-stone-500">Lead conversion</div><div className="mt-2 font-serif text-2xl font-bold">{kpis.totalContacts ? `${Math.round((kpis.customersCount / kpis.totalContacts) * 100)}%` : "0%"}</div><p className="mt-1 text-xs text-stone-500">Customer accounts as a share of all contacts.</p></article>
        <article className="border border-stone-300 bg-white p-5"><div className="text-[10px] font-mono font-bold uppercase tracking-widest text-stone-500">Webinar attendance</div><div className="mt-2 font-serif text-2xl font-bold">{funnel.find((item) => item.stage === "Webinar Registrations")?.count ?? 0}</div><p className="mt-1 text-xs text-stone-500">Registrations counted across scheduled webinars.</p></article>
        <article className="border border-stone-300 bg-white p-5"><div className="text-[10px] font-mono font-bold uppercase tracking-widest text-stone-500">Governance coverage</div><div className="mt-2 font-serif text-2xl font-bold">{auditLogs.length}</div><p className="mt-1 text-xs text-stone-500">Audit records available for this workspace.</p>{role !== "viewer" && <Link href="/security" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#C85A32] hover:underline">Review workflow security <ArrowUpRight className="h-3 w-3" /></Link>}</article>
      </section>
      <p className="text-[11px] text-stone-500">Metrics are derived from the current Nexus service and its configured Supabase or in-memory data source. Values that the existing service estimates or falls back to are not represented as independently verified production telemetry.</p>
    </div>
  );
}
