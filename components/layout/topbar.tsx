"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, UserCheck, Eye, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Topbar({ initialRole }: { initialRole: string }) {
  const [role, setRole] = useState(initialRole || "viewer");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const match = document.cookie.match(/(^|;)\s*role\s*=\s*([^;]+)/);
    if (match && match[2]) {
      setRole(match[2].toLowerCase());
    }
  }, []);

  function handleRoleChange(newRole: "admin" | "marketer" | "viewer") {
    document.cookie = `role=${newRole}; path=/; max-age=31536000; SameSite=Lax`;
    setRole(newRole);
    setMenuOpen(false);
    window.location.reload();
  }

  const roleConfig = {
    admin: {
      label: "Admin",
      desc: "Full Root Authority • Approval Privilege",
      badgeClass: "bg-[#FDF5F1] text-[#C85A32] border-[#E8C2B3]",
      icon: ShieldCheck,
    },
    marketer: {
      label: "Marketer",
      desc: "Campaign & Webinar Lead • No Billing",
      badgeClass: "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]",
      icon: UserCheck,
    },
    viewer: {
      label: "Viewer",
      desc: "Read-Only • Safe Inspection",
      badgeClass: "bg-stone-200/60 text-stone-700 border-stone-300",
      icon: Eye,
    },
  }[role] || {
    label: "Viewer",
    desc: "Read-Only",
    badgeClass: "bg-stone-200/60 text-stone-700 border-stone-300",
    icon: Eye,
  };

  const CurrentIcon = roleConfig.icon;

  return (
    <header className="h-16 px-8 border-b border-stone-300 bg-[#FAF8F5] flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-6">
        <div className="font-serif italic text-base text-stone-800">
          Autonomous Enterprise Execution
        </div>
      </div>

      {/* Role Switcher */}
      <div className="relative">
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] font-mono uppercase tracking-wider text-stone-500">Active Identity</div>
            <div className="text-xs text-stone-700 font-medium">{roleConfig.desc}</div>
          </div>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-none border text-xs font-mono font-medium transition-all bg-white shadow-[2px_2px_0px_0px_#1C1917] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#1C1917] cursor-pointer",
              roleConfig.badgeClass
            )}
          >
            <CurrentIcon className="w-3.5 h-3.5" />
            <span className="uppercase tracking-wider">Role: {roleConfig.label}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
          </button>
        </div>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-72 bg-white border border-stone-900 rounded-none shadow-[4px_4px_0px_0px_#1C1917] p-2 z-50">
            <div className="px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-widest text-stone-500 border-b border-stone-200 mb-1.5">
              Select Operator Role
            </div>

            <button
              onClick={() => handleRoleChange("admin")}
              className={cn(
                "w-full text-left p-2.5 rounded-none transition-all flex items-start gap-2.5 border mb-1 cursor-pointer",
                role === "admin"
                  ? "bg-[#FDF5F1] border-[#C85A32] text-stone-900"
                  : "border-transparent hover:border-stone-300 hover:bg-stone-50 text-stone-700"
              )}
            >
              <ShieldCheck className="w-4 h-4 text-[#C85A32] mt-0.5" />
              <div>
                <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5 font-serif">
                  Admin
                  {role === "admin" && (
                    <span className="text-[9px] font-mono bg-[#C85A32] text-white px-1 py-0.2">ACTIVE</span>
                  )}
                </div>
                <div className="text-[11px] text-stone-500 leading-tight pt-0.5">
                  Approve high-risk marketing sends & modify billing plans
                </div>
              </div>
            </button>

            <button
              onClick={() => handleRoleChange("marketer")}
              className={cn(
                "w-full text-left p-2.5 rounded-none transition-all flex items-start gap-2.5 border mb-1 cursor-pointer",
                role === "marketer"
                  ? "bg-[#FEF3C7] border-[#92400E] text-stone-900"
                  : "border-transparent hover:border-stone-300 hover:bg-stone-50 text-stone-700"
              )}
            >
              <UserCheck className="w-4 h-4 text-[#92400E] mt-0.5" />
              <div>
                <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5 font-serif">
                  Marketer
                  {role === "marketer" && (
                    <span className="text-[9px] font-mono bg-[#92400E] text-white px-1 py-0.2">ACTIVE</span>
                  )}
                </div>
                <div className="text-[11px] text-stone-500 leading-tight pt-0.5">
                  Author pages, webinars & drafts; cannot approve sends
                </div>
              </div>
            </button>

            <button
              onClick={() => handleRoleChange("viewer")}
              className={cn(
                "w-full text-left p-2.5 rounded-none transition-all flex items-start gap-2.5 border cursor-pointer",
                role === "viewer"
                  ? "bg-stone-100 border-stone-800 text-stone-900"
                  : "border-transparent hover:border-stone-300 hover:bg-stone-50 text-stone-700"
              )}
            >
              <Eye className="w-4 h-4 text-stone-600 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5 font-serif">
                  Viewer
                  {role === "viewer" && (
                    <span className="text-[9px] font-mono bg-stone-800 text-white px-1 py-0.2">ACTIVE</span>
                  )}
                </div>
                <div className="text-[11px] text-stone-500 leading-tight pt-0.5">
                  Read-only audit inspection; all mutations blocked
                </div>
              </div>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
