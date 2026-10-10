import { queryAnalytics } from "@/lib/services";
import DashboardCharts from "@/components/dashboard/dashboard-charts";
import Link from "next/link";
import {
  Users,
  Eye,
  Video,
  Mail,
  DollarSign,
  Bot,
  Clock,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export const revalidate = 0;

export default async function DashboardPage() {
  const analytics = await queryAnalytics();
  const { kpis, funnel, eventsOverTime } = analytics;

  return (
    <div className="space-y-8">
      {/* Editorial Overview Banner */}
      <div className="p-8 border border-stone-300 bg-white shadow-[3px_3px_0px_0px_#1C1917] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="max-w-2xl space-y-2">
          <div className="text-[11px] font-mono uppercase tracking-widest text-[#C85A32] font-semibold">
            Unified Enterprise Infrastructure
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-stone-900">
            Nexus Business Operating Platform
          </h1>
          <p className="text-sm text-stone-600 leading-relaxed">
            Consolidated management for website landing pages, CRM records, SaaS billing tiers, marketing automation, and webinar stages under an autonomous agent governance protocol.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/agent"
            className="flex items-center gap-2 px-6 py-3 rounded-none bg-[#C85A32] hover:bg-[#B94A26] text-white font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_#1C1917] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#1C1917]"
          >
            <Bot className="w-4 h-4" />
            Open Agent Studio
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* KPI Metric Boxes Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* 1. Total Contacts */}
        <div className="p-5 rounded-none bg-white border border-stone-300 shadow-[2px_2px_0px_0px_#1C1917]">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-widest font-semibold">Contacts</span>
            <Users className="w-3.5 h-3.5 text-stone-700" />
          </div>
          <div className="font-serif text-3xl font-bold text-stone-900">{kpis.totalContacts}</div>
          <div className="text-[11px] text-stone-500 mt-1 font-mono">
            <span className="text-[#C85A32] font-bold">{kpis.leadsCount} leads</span> in active pipeline
          </div>
        </div>

        {/* 2. Page Views */}
        <div className="p-5 rounded-none bg-white border border-stone-300 shadow-[2px_2px_0px_0px_#1C1917]">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-widest font-semibold">Page Traffic</span>
            <Eye className="w-3.5 h-3.5 text-stone-700" />
          </div>
          <div className="font-serif text-3xl font-bold text-stone-900">{kpis.pageViews}</div>
          <div className="text-[11px] text-stone-500 mt-1 font-mono">
            Across live landing sites
          </div>
        </div>

        {/* 3. Webinar Registrations */}
        <div className="p-5 rounded-none bg-white border border-stone-300 shadow-[2px_2px_0px_0px_#1C1917]">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-widest font-semibold">Registrations</span>
            <Video className="w-3.5 h-3.5 text-stone-700" />
          </div>
          <div className="font-serif text-3xl font-bold text-stone-900">{kpis.totalRegistrations}</div>
          <div className="text-[11px] text-stone-500 mt-1 font-mono">
            Jitsi Meet room allocations
          </div>
        </div>

        {/* 4. Emails Sent */}
        <div className="p-5 rounded-none bg-white border border-stone-300 shadow-[2px_2px_0px_0px_#1C1917]">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-widest font-semibold">Emails Dispatched</span>
            <Mail className="w-3.5 h-3.5 text-stone-700" />
          </div>
          <div className="font-serif text-3xl font-bold text-stone-900">{kpis.emailsSent}</div>
          <div className="text-[11px] text-[#92400E] mt-1 font-mono">
            Mailtrap sandbox delivered
          </div>
        </div>

        {/* 5. Monthly Recurring Revenue (MRR) */}
        <div className="p-5 rounded-none bg-white border border-stone-300 shadow-[2px_2px_0px_0px_#1C1917]">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-widest font-semibold">Monthly MRR</span>
            <DollarSign className="w-3.5 h-3.5 text-[#4A5D4E]" />
          </div>
          <div className="font-serif text-3xl font-bold text-[#4A5D4E]">
            {formatCurrency(kpis.mrrCents)}
          </div>
          <div className="text-[11px] text-stone-500 mt-1 font-mono">
            <span className="text-stone-900 font-bold">{kpis.customersCount} active</span> accounts
          </div>
        </div>

        {/* 6. Leads Created */}
        <div className="p-5 rounded-none bg-white border border-stone-300 shadow-[2px_2px_0px_0px_#1C1917]">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-widest font-semibold">Qualified Leads</span>
            <TrendingUp className="w-3.5 h-3.5 text-stone-700" />
          </div>
          <div className="font-serif text-3xl font-bold text-stone-900">{kpis.leadsCount}</div>
          <div className="text-[11px] text-stone-500 mt-1 font-mono">
            Retail, SaaS & Edu cohorts
          </div>
        </div>

        {/* 7. Agent Actions Executed */}
        <div className="p-5 rounded-none bg-[#FDF5F1] border border-[#E8C2B3] shadow-[2px_2px_0px_0px_#1C1917]">
          <div className="flex items-center justify-between text-[#C85A32] mb-1">
            <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Agent Executions</span>
            <Bot className="w-3.5 h-3.5 text-[#C85A32]" />
          </div>
          <div className="font-serif text-3xl font-bold text-stone-900">{kpis.executedAgentActions}</div>
          <div className="text-[11px] text-[#C85A32] mt-1 font-mono">
            Autonomous logged actions
          </div>
        </div>

        {/* 8. Estimated Hours Saved */}
        <div className="p-5 rounded-none bg-[#EDF2EE] border border-[#CCD8CD] shadow-[2px_2px_0px_0px_#1C1917]">
          <div className="flex items-center justify-between text-[#4A5D4E] mb-1">
            <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Hours Saved</span>
            <Clock className="w-3.5 h-3.5 text-[#4A5D4E]" />
          </div>
          <div className="font-serif text-3xl font-bold text-[#4A5D4E]">
            {kpis.estimatedHoursSaved} hrs
          </div>
          <div className="text-[11px] text-[#4A5D4E] mt-1 font-mono">
            ~6 mins per workflow step
          </div>
        </div>
      </div>

      {/* Visual Analytics */}
      <DashboardCharts funnel={funnel} eventsOverTime={eventsOverTime} />
    </div>
  );
}
