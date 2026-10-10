"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  Users,
  Globe,
  Video,
  Mail,
  CreditCard,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agent", label: "Agent Studio", icon: Bot, isAgent: true },
  { href: "/crm", label: "CRM & Leads", icon: Users },
  { href: "/sites", label: "Landing Sites", icon: Globe },
  { href: "/webinars", label: "Webinars", icon: Video },
  { href: "/marketing", label: "Marketing", icon: Mail },
  { href: "/billing", label: "SaaS Billing", icon: CreditCard },
  { href: "/audit", label: "Audit Log", icon: ShieldAlert, adminOnly: true },
];

export default function Sidebar({ role }: { role?: UserRole }) {
  const pathname = usePathname();
  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || !role || role === "admin");

  return (
    <aside className="w-64 flex-shrink-0 border-r border-stone-300 bg-[#F5F2EB] flex flex-col h-screen sticky top-0">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-stone-300 bg-[#F5F2EB]">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-none bg-stone-900 text-stone-50 flex items-center justify-center font-serif font-bold text-sm shadow-[1px_1px_0px_0px_#78716C]">
            N
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-serif font-bold text-base text-stone-900 tracking-tight">NEXUS</span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500 bg-stone-200/70 px-1 py-0.2 border border-stone-300">
                v1.0
              </span>
            </div>
            <p className="text-[10px] font-mono tracking-wider text-stone-500 uppercase">Operating Platform</p>
          </div>
        </div>
      </div>

      {/* Nav List */}
      <div className="flex-1 py-5 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-mono font-semibold uppercase tracking-widest text-stone-500">
          Core Workflows
        </div>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between px-3 py-2 rounded-none text-xs transition-all border",
                isActive
                  ? "bg-white text-stone-900 font-semibold border-stone-900 shadow-[2px_2px_0px_0px_#1C1917]"
                  : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/50 border-transparent hover:border-stone-300"
              )}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={cn(
                    "w-4 h-4",
                    isActive ? "text-[#C85A32]" : "text-stone-500",
                    item.isAgent && !isActive && "text-[#C85A32]"
                  )}
                />
                <span className="tracking-tight">{item.label}</span>
              </div>
              {item.isAgent && (
                <span className={cn(
                  "text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 border",
                  isActive
                    ? "bg-[#FDF5F1] text-[#C85A32] border-[#E8C2B3]"
                    : "bg-stone-200/60 text-stone-600 border-stone-300"
                )}>
                  Agent
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Workspace Footer */}
      <div className="p-4 border-t border-stone-300 bg-[#EFECE4]">
        <div className="border border-stone-300 bg-white p-2.5 shadow-[1px_1px_0px_0px_#D6D3D1]">
          <div className="text-[10px] font-mono uppercase tracking-wider text-stone-500">Workspace</div>
          <div className="text-xs font-semibold text-stone-900 truncate">Default Retail Entity</div>
          <div className="text-[10px] font-mono text-stone-500 truncate pt-0.5">ID: 00000000-0001</div>
        </div>
      </div>
    </aside>
  );
}
