"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";

interface FunnelItem {
  stage: string;
  count: number;
}

interface EventTrendItem {
  date: string;
  views: number;
  leads: number;
  registrations: number;
  emails: number;
}

export default function DashboardCharts({
  funnel,
  eventsOverTime,
}: {
  funnel: FunnelItem[];
  eventsOverTime: EventTrendItem[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Funnel Chart */}
      <div className="lg:col-span-5 p-6 rounded-none bg-white border border-stone-300 shadow-[3px_3px_0px_0px_#1C1917] space-y-4">
        <div className="border-b border-stone-200 pb-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#C85A32] font-semibold">Conversion Architecture</div>
          <h3 className="font-serif text-lg font-bold text-stone-900 tracking-tight">Stage Funnel</h3>
          <p className="text-xs text-stone-500">
            Visitor journey across published pages, leads, webinars & campaigns
          </p>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={funnel}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="2 2" stroke="#E7E5E4" horizontal={false} />
              <XAxis type="number" stroke="#78716C" fontSize={11} tickLine={false} />
              <YAxis
                type="category"
                dataKey="stage"
                stroke="#44403C"
                fontSize={11}
                width={125}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "#F5F2EB" }}
                contentStyle={{
                  backgroundColor: "#FAF8F5",
                  borderColor: "#1C1917",
                  borderWidth: "1px",
                  borderRadius: "0px",
                  boxShadow: "2px 2px 0px 0px #1C1917",
                  color: "#1C1917",
                  fontSize: "12px",
                  fontFamily: "monospace",
                }}
              />
              <Bar dataKey="count" fill="#C85A32" radius={[0, 0, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Events Over Time Line/Area Chart */}
      <div className="lg:col-span-7 p-6 rounded-none bg-white border border-stone-300 shadow-[3px_3px_0px_0px_#1C1917] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-200 gap-2">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#4A5D4E] font-semibold">Telemetry & Flow</div>
            <h3 className="font-serif text-lg font-bold text-stone-900 tracking-tight">
              Activity Over 14 Days
            </h3>
            <p className="text-xs text-stone-500">
              Aggregated daily business actions & touchpoints
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono text-stone-600">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#C85A32]" /> Views
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#4A5D4E]" /> Leads
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#92400E]" /> Webinars
            </span>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={eventsOverTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="warmViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C85A32" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#C85A32" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="warmLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4A5D4E" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#4A5D4E" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 2" stroke="#E7E5E4" />
              <XAxis dataKey="date" stroke="#78716C" fontSize={11} tickLine={false} />
              <YAxis stroke="#78716C" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#FAF8F5",
                  borderColor: "#1C1917",
                  borderWidth: "1px",
                  borderRadius: "0px",
                  boxShadow: "2px 2px 0px 0px #1C1917",
                  color: "#1C1917",
                  fontSize: "12px",
                  fontFamily: "monospace",
                }}
              />
              <Area
                type="monotone"
                dataKey="views"
                stroke="#C85A32"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#warmViews)"
              />
              <Area
                type="monotone"
                dataKey="leads"
                stroke="#4A5D4E"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#warmLeads)"
              />
              <Area
                type="monotone"
                dataKey="registrations"
                stroke="#92400E"
                strokeWidth={2}
                fill="none"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
