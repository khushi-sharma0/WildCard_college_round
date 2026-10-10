"use client";

import React, { useState } from "react";
import { AuditLog } from "@/lib/services";
import {
  Search,
  Check,
  X,
  Clock,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function AuditView({
  initialLogs,
}: {
  initialLogs: AuditLog[];
}) {
  const [logs, setLogs] = useState<AuditLog[]>(initialLogs);
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredLogs = logs.filter((log) => {
    const matchesRisk = riskFilter === "all" || log.risk === riskFilter;
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    const matchesSearch =
      search === "" ||
      log.tool.toLowerCase().includes(search.toLowerCase()) ||
      log.role.toLowerCase().includes(search.toLowerCase());
    return matchesRisk && matchesStatus && matchesSearch;
  });

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case "high":
        return (
          <span className="px-2 py-0.5 rounded-none text-[10px] font-mono font-bold uppercase tracking-wider bg-[#FDF2F2] text-[#B91C1C] border border-[#FCA5A5]">
            HIGH RISK
          </span>
        );
      case "medium":
        return (
          <span className="px-2 py-0.5 rounded-none text-[10px] font-mono font-bold uppercase tracking-wider bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
            MEDIUM RISK
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-none text-[10px] font-mono font-bold uppercase tracking-wider bg-[#EDF2EE] text-[#4A5D4E] border border-[#CCD8CD]">
            LOW RISK
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "executed":
        return (
          <span className="px-2 py-0.5 rounded-none text-[10px] font-mono font-bold uppercase tracking-wider bg-stone-100 text-stone-800 border border-stone-300 flex items-center gap-1">
            <Check className="w-3 h-3 text-[#4A5D4E]" /> EXECUTED
          </span>
        );
      case "blocked":
        return (
          <span className="px-2 py-0.5 rounded-none text-[10px] font-mono font-bold uppercase tracking-wider bg-stone-200 text-stone-700 border border-stone-400 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" /> BLOCKED
          </span>
        );
      case "pending_approval":
        return (
          <span className="px-2 py-0.5 rounded-none text-[10px] font-mono font-bold uppercase tracking-wider bg-[#FDF5F1] text-[#C85A32] border border-[#E8C2B3] flex items-center gap-1 animate-pulse">
            <Clock className="w-3 h-3" /> PENDING
          </span>
        );
      case "rejected":
        return (
          <span className="px-2 py-0.5 rounded-none text-[10px] font-mono font-bold uppercase tracking-wider bg-stone-100 text-stone-500 border border-stone-300 flex items-center gap-1">
            <X className="w-3 h-3" /> REJECTED
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-none text-[10px] font-mono uppercase tracking-wider bg-stone-100 text-stone-700 border border-stone-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-300">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#C85A32] font-semibold mb-1">
            Immutable Governance Ledger
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-stone-900">
            Audit Trail
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Chronological compliance record of every autonomous tool execution, authorization checkpoint, and result.
          </p>
        </div>

        <div className="text-xs font-mono text-stone-600 bg-white px-3.5 py-1.5 rounded-none border border-stone-300 shadow-[1px_1px_0px_0px_#1C1917]">
          Logged Actions: <span className="text-stone-900 font-bold">{logs.length}</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 p-4 rounded-none bg-white border border-stone-300 shadow-[2px_2px_0px_0px_#1C1917]">
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tool name or role..."
            className="w-full pl-9 pr-3 py-2 bg-[#FAF8F5] border border-stone-300 rounded-none text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900 font-mono"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Risk Filter */}
          <div className="flex items-center gap-1 text-xs font-mono text-stone-500 uppercase tracking-wider">
            <span>Risk:</span>
            {["all", "low", "medium", "high"].map((r) => (
              <button
                key={r}
                onClick={() => setRiskFilter(r)}
                className={`px-2.5 py-1 rounded-none text-[11px] font-mono uppercase tracking-wider font-semibold transition-all cursor-pointer border ${
                  riskFilter === r
                    ? "bg-stone-900 text-white border-stone-900 shadow-[1px_1px_0px_0px_#1C1917]"
                    : "bg-white text-stone-600 border-stone-300 hover:border-stone-900"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="h-4 w-[1px] bg-stone-300 hidden sm:block" />

          {/* Status Filter */}
          <div className="flex items-center gap-1 text-xs font-mono text-stone-500 uppercase tracking-wider">
            <span>Status:</span>
            {["all", "executed", "blocked", "pending_approval", "rejected"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded-none text-[11px] font-mono uppercase tracking-wider font-semibold transition-all cursor-pointer border ${
                  statusFilter === s
                    ? "bg-[#C85A32] text-white border-[#C85A32] shadow-[1px_1px_0px_0px_#1C1917]"
                    : "bg-white text-stone-600 border-stone-300 hover:border-stone-900"
                }`}
              >
                {s.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-none bg-white border border-stone-300 shadow-[3px_3px_0px_0px_#1C1917] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5F2EB] border-b border-stone-300 text-stone-600 uppercase font-mono tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-5">Timestamp</th>
                <th className="py-3 px-5">Role</th>
                <th className="py-3 px-5">Tool Operation</th>
                <th className="py-3 px-5">Risk Tier</th>
                <th className="py-3 px-5">Outcome</th>
                <th className="py-3 px-5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 text-stone-800">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-400 font-mono">
                    No audit records match the current filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isExpanded = expandedId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                        className="hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-5 text-stone-500 font-mono text-[11px]">
                          {formatDate(log.created_at)}
                        </td>
                        <td className="py-3 px-5">
                          <span className="px-2 py-0.5 rounded-none text-[10px] font-mono font-bold uppercase bg-stone-100 text-stone-700 border border-stone-300">
                            {log.role}
                          </span>
                        </td>
                        <td className="py-3 px-5 font-mono font-bold text-stone-900">
                          {log.tool}
                        </td>
                        <td className="py-3 px-5">{getRiskBadge(log.risk)}</td>
                        <td className="py-3 px-5">{getStatusBadge(log.status)}</td>
                        <td className="py-3 px-5 text-right text-stone-400">
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 ml-auto text-stone-800" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 ml-auto text-stone-400" />
                          )}
                        </td>
                      </tr>

                      {/* Expandable JSON details */}
                      {isExpanded && (
                        <tr className="bg-[#FAF8F5]">
                          <td colSpan={6} className="p-4 border-t border-stone-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
                              <div>
                                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500 mb-1">
                                  Arguments (args)
                                </div>
                                <pre className="p-3 rounded-none bg-white border border-stone-300 text-stone-900 font-mono overflow-x-auto shadow-[1px_1px_0px_0px_#D6D3D1]">
                                  {JSON.stringify(log.args, null, 2)}
                                </pre>
                              </div>
                              <div>
                                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500 mb-1">
                                  Execution Result (result)
                                </div>
                                <pre className="p-3 rounded-none bg-white border border-stone-300 text-stone-900 font-mono overflow-x-auto shadow-[1px_1px_0px_0px_#D6D3D1]">
                                  {JSON.stringify(log.result, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
