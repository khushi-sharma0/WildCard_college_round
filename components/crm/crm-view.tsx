"use client";

import { useState } from "react";
import { Contact, Segment } from "@/lib/services";
import {
  Users,
  Search,
  Filter,
  Layers,
  Kanban,
  Table as TableIcon,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

export default function CRMView({
  initialContacts,
  segments,
}: {
  initialContacts: Contact[];
  segments: Segment[];
}) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "pipeline">("table");

  // Filtering
  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      search === "" ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    const matchesTag =
      selectedTag === "all" || (c.tags && c.tags.includes(selectedTag));
    return matchesSearch && matchesTag;
  });

  // Unique tags
  const allTags = Array.from(new Set(contacts.flatMap((c) => c.tags || [])));

  // Grouped for pipeline
  const pipelineStatuses: Array<{ key: Contact["status"]; label: string; tagClass: string }> = [
    { key: "lead", label: "New Leads", tagClass: "border-stone-400 bg-stone-100 text-stone-800" },
    { key: "qualified", label: "Qualified", tagClass: "border-[#FDE68A] bg-[#FEF3C7] text-[#92400E]" },
    { key: "customer", label: "Customers", tagClass: "border-[#CCD8CD] bg-[#EDF2EE] text-[#4A5D4E]" },
    { key: "lost", label: "Closed / Lost", tagClass: "border-stone-300 bg-stone-200/50 text-stone-600" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-300">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#C85A32] font-semibold mb-1">
            Audience Intelligence & Stage Management
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-stone-900">
            CRM Directory & Pipeline
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Segment customer cohorts, inspect contact touchpoints, and advance deal progression.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 p-1 bg-stone-200 border border-stone-300 rounded-none">
          <button
            onClick={() => setViewMode("table")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-mono uppercase tracking-wider font-semibold transition-all cursor-pointer",
              viewMode === "table"
                ? "bg-white text-stone-900 shadow-[1px_1px_0px_0px_#1C1917] border border-stone-900"
                : "text-stone-600 hover:text-stone-900 border border-transparent"
            )}
          >
            <TableIcon className="w-3.5 h-3.5" />
            Table
          </button>
          <button
            onClick={() => setViewMode("pipeline")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-mono uppercase tracking-wider font-semibold transition-all cursor-pointer",
              viewMode === "pipeline"
                ? "bg-white text-stone-900 shadow-[1px_1px_0px_0px_#1C1917] border border-stone-900"
                : "text-stone-600 hover:text-stone-900 border border-transparent"
            )}
          >
            <Kanban className="w-3.5 h-3.5" />
            Pipeline
          </button>
        </div>
      </div>

      {/* Segments Cards Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {segments.map((seg) => {
          const matchCount = contacts.filter((c) => c.tags?.includes(seg.filter_tag)).length;
          const isSelected = selectedTag === seg.filter_tag;
          return (
            <div
              key={seg.id}
              onClick={() => setSelectedTag(isSelected ? "all" : seg.filter_tag)}
              className={cn(
                "p-4 rounded-none border transition-all cursor-pointer flex items-center justify-between",
                isSelected
                  ? "bg-[#FDF5F1] border-stone-900 shadow-[3px_3px_0px_0px_#1C1917]"
                  : "bg-white border-stone-300 hover:border-stone-900 shadow-[2px_2px_0px_0px_#1C1917]"
              )}
            >
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-[#C85A32]" /> Segment
                </div>
                <div className="font-serif text-base font-bold text-stone-900 mt-0.5">{seg.name}</div>
                <div className="text-[10px] font-mono text-stone-500 mt-0.5">
                  Tag filter: <span className="text-stone-900 font-bold font-mono">[{seg.filter_tag}]</span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-serif text-2xl font-bold text-stone-900">{matchCount}</span>
                <div className="text-[9px] font-mono uppercase text-stone-500">Records</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls: Search & Tag Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-none bg-white border border-stone-300 shadow-[2px_2px_0px_0px_#1C1917]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contact name or email..."
            className="w-full pl-9 pr-3 py-2 bg-[#FAF8F5] border border-stone-300 rounded-none text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-mono text-stone-500 flex items-center gap-1 uppercase tracking-wider">
            <Filter className="w-3 h-3" /> Tag:
          </span>
          <button
            onClick={() => setSelectedTag("all")}
            className={cn(
              "px-2.5 py-1 rounded-none text-xs font-mono uppercase tracking-wider transition-all cursor-pointer border",
              selectedTag === "all"
                ? "bg-stone-900 text-white border-stone-900 shadow-[1px_1px_0px_0px_#1C1917]"
                : "bg-white text-stone-600 border-stone-300 hover:border-stone-900"
            )}
          >
            All ({contacts.length})
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={cn(
                "px-2.5 py-1 rounded-none text-xs font-mono uppercase tracking-wider transition-all cursor-pointer border",
                selectedTag === tag
                  ? "bg-[#C85A32] text-white border-[#C85A32] shadow-[1px_1px_0px_0px_#1C1917]"
                  : "bg-white text-stone-600 border-stone-300 hover:border-stone-900"
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Main View Mode: Table vs Pipeline */}
      {viewMode === "table" ? (
        <div className="rounded-none bg-white border border-stone-300 shadow-[3px_3px_0px_0px_#1C1917] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F2EB] border-b border-stone-300 text-stone-600 uppercase font-mono tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-5">Contact</th>
                  <th className="py-3 px-5">Email</th>
                  <th className="py-3 px-5">Tags</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Source</th>
                  <th className="py-3 px-5">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-stone-800">
                {filteredContacts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-stone-400 font-mono">
                      No contacts found matching the criteria.
                    </td>
                  </tr>
                ) : (
                  filteredContacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-[#FAF8F5] transition-colors">
                      <td className="py-3 px-5 font-bold text-stone-900 font-serif text-sm">
                        {contact.name}
                      </td>
                      <td className="py-3 px-5 text-stone-600 font-mono text-[11px]">
                        {contact.email}
                      </td>
                      <td className="py-3 px-5">
                        <div className="flex flex-wrap gap-1">
                          {contact.tags?.map((t) => (
                            <span
                              key={t}
                              className="px-1.5 py-0.5 rounded-none text-[9px] font-mono uppercase bg-stone-100 text-stone-700 border border-stone-300"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-5">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-none text-[10px] font-mono font-bold uppercase tracking-wider border",
                            contact.status === "customer" && "bg-[#EDF2EE] text-[#4A5D4E] border-[#CCD8CD]",
                            contact.status === "qualified" && "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]",
                            contact.status === "lead" && "bg-stone-100 text-stone-800 border-stone-300",
                            contact.status === "lost" && "bg-stone-200 text-stone-600 border-stone-300"
                          )}
                        >
                          {contact.status}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-stone-500 font-mono text-[11px] capitalize">
                        {contact.source.replace(/_/g, " ")}
                      </td>
                      <td className="py-3 px-5 text-stone-500 font-mono text-[11px]">
                        {formatDate(contact.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Pipeline Kanban Board */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {pipelineStatuses.map((stage) => {
            const stageContacts = filteredContacts.filter((c) => c.status === stage.key);
            return (
              <div
                key={stage.key}
                className="p-4 rounded-none bg-white border border-stone-300 shadow-[2px_2px_0px_0px_#1C1917] flex flex-col h-[600px]"
              >
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-200">
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-sm font-bold text-stone-900">
                      {stage.label}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold bg-stone-100 text-stone-800 px-2 py-0.5 border border-stone-300">
                    {stageContacts.length}
                  </span>
                </div>

                <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
                  {stageContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="p-3 rounded-none bg-[#FAF8F5] border border-stone-300 hover:border-stone-900 shadow-[1px_1px_0px_0px_#D6D3D1] space-y-1.5 transition-all"
                    >
                      <div className="font-serif text-xs font-bold text-stone-900">{contact.name}</div>
                      <div className="text-[11px] text-stone-500 font-mono truncate">
                        {contact.email}
                      </div>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {contact.tags?.map((t) => (
                          <span
                            key={t}
                            className="px-1 py-0.2 rounded-none text-[8px] font-mono uppercase bg-white text-stone-600 border border-stone-300"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
