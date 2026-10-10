"use client";

import { useState } from "react";
import { Plan, Subscription, Contact } from "@/lib/services";
import {
  DollarSign,
  Plus,
  Lock,
  Loader2,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { notifyToast } from "@/lib/toast";

export default function BillingView({
  initialPlans,
  initialSubscriptions,
  contacts,
  role,
}: {
  initialPlans: Plan[];
  initialSubscriptions: Subscription[];
  contacts: Contact[];
  role: string;
}) {
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(initialSubscriptions);
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [subscribeTargetPlan, setSubscribeTargetPlan] = useState<Plan | null>(null);

  // Create Plan Form states
  const [name, setName] = useState("");
  const [priceDollars, setPriceDollars] = useState("49");
  const [interval, setInterval] = useState("monthly");
  const [description, setDescription] = useState("");
  const [planLoading, setPlanLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe Contact Form state
  const [selectedContactId, setSelectedContactId] = useState(contacts[0]?.id || "");
  const [subscribeLoading, setSubscribeLoading] = useState(false);

  const isAdmin = role === "admin";
  const isViewer = role === "viewer";

  // Total MRR
  const totalMRR = subscriptions
    .filter((s) => s.status === "active")
    .reduce((acc, s) => acc + (s.mrr_cents || 0), 0);

  async function handleCreatePlan(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;

    setPlanLoading(true);
    setError(null);

    try {
      const price_cents = Math.round(parseFloat(priceDollars) * 100);
      const res = await fetch("/api/billing/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, price_cents, interval, description }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create plan");

      setPlans([data, ...plans]);
      setShowCreatePlanModal(false);
      setName("");
      setPriceDollars("49");
      setDescription("");
      notifyToast("success", "Billing plan created.");
    } catch (err: any) {
      setError(err.message);
      notifyToast("error", err.message || "Failed to create billing plan.");
    } finally {
      setPlanLoading(false);
    }
  }

  async function handleSubscribeContact(e: React.FormEvent) {
    e.preventDefault();
    if (isViewer || !subscribeTargetPlan || !selectedContactId) return;

    setSubscribeLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: selectedContactId,
          planId: subscribeTargetPlan.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to subscribe contact");
      if (data.pendingApproval) {
        setSubscribeTargetPlan(null);
        notifyToast("success", "Subscription request sent to Admin for approval.");
        return;
      }

      const contact = contacts.find((c) => c.id === selectedContactId);
      const newSub: Subscription = {
        ...data,
        contact_name: contact?.name || "Subscriber",
        plan_name: subscribeTargetPlan.name,
      };

      setSubscriptions([newSub, ...subscriptions]);
      setSubscribeTargetPlan(null);
      notifyToast("success", `Subscription created for ${contact?.name || "customer"}.`);
    } catch (err: any) {
      setError(err.message);
      notifyToast("error", err.message || "Failed to create subscription.");
    } finally {
      setSubscribeLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-300">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#C85A32] font-semibold mb-1">
            Product Revenue & Subscription Architecture
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-stone-900">
            SaaS Billing & Plans
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Product tier configurations, simulated customer subscriptions, and live recurring revenue tracking.
          </p>
        </div>

        <div>
          <button
            onClick={() => isAdmin && setShowCreatePlanModal(true)}
            disabled={!isAdmin}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-none font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_#1C1917] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#1C1917] cursor-pointer ${
              !isAdmin
                ? "bg-stone-200 text-stone-500 cursor-not-allowed border border-stone-300"
                : "bg-[#C85A32] hover:bg-[#B94A26] text-white"
            }`}
          >
            {!isAdmin ? <Lock className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {!isAdmin ? "Create Plan (Admin Only)" : "New Billing Plan"}
          </button>
        </div>
      </div>

      {/* MRR Banner */}
      <div className="p-6 rounded-none bg-[#EDF2EE] border border-[#CCD8CD] shadow-[3px_3px_0px_0px_#1C1917] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono font-bold text-[#4A5D4E] uppercase tracking-widest flex items-center gap-1.5">
            <DollarSign className="w-4 h-4" /> Live Monthly Recurring Revenue
          </div>
          <div className="font-serif text-4xl font-bold text-stone-900 mt-1">
            {formatCurrency(totalMRR)}
          </div>
          <div className="text-xs text-stone-600 mt-0.5 font-mono">
            Across {subscriptions.filter((s) => s.status === "active").length} active customer billing accounts
          </div>
        </div>

        <div className="text-xs font-mono text-stone-600 max-w-sm sm:text-right">
          <span className="font-bold text-stone-900 uppercase">Simulated Checkout:</span> Plan creation and subscriptions are tracked in Postgres without requiring real credit cards.
        </div>
      </div>

      {/* Plans List */}
      <div>
        <h2 className="font-serif text-xl font-bold text-stone-900 mb-4">Configured Product Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.length === 0 && (
            <p className="col-span-full border border-dashed border-stone-400 bg-white p-8 text-center text-sm text-stone-500">
              No billing plans configured yet.
            </p>
          )}
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="p-6 rounded-none bg-white border border-stone-300 shadow-[3px_3px_0px_0px_#1C1917] hover:border-stone-900 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#C85A32]">
                    {plan.interval.replace(/_/g, " ")}
                  </span>
                  <span className="text-[10px] font-mono text-stone-400">ID: {plan.id.slice(0, 8)}</span>
                </div>
                <h3 className="font-serif text-xl font-bold text-stone-900">{plan.name}</h3>
                <div className="flex items-baseline gap-1 pt-1">
                  <span className="font-serif text-3xl font-bold text-stone-900">
                    {formatCurrency(plan.price_cents)}
                  </span>
                  <span className="text-xs text-stone-500 font-mono">/{plan.interval === "one_time" ? "pass" : "mo"}</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed pt-1">
                  {plan.description || "Includes platform access and priority operational support."}
                </p>
              </div>

              <div className="pt-4 border-t border-stone-200">
                <button
                  onClick={() => !isViewer && setSubscribeTargetPlan(plan)}
                  disabled={isViewer || contacts.length === 0}
                  title={contacts.length === 0 ? "Add a CRM contact before subscribing." : isViewer ? "Read-only access" : undefined}
                  className={`w-full py-2.5 px-4 rounded-none font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_#1C1917] flex items-center justify-center gap-1.5 cursor-pointer ${
                    isViewer
                      ? "bg-stone-200 text-stone-500 cursor-not-allowed border border-stone-300 shadow-none"
                      : "bg-stone-900 hover:bg-stone-800 text-white hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#1C1917]"
                  }`}
                >
                  {isViewer ? (
                    <Lock className="w-3.5 h-3.5" />
                  ) : null}
                  {isViewer ? "Subscribe (Restricted)" : "Subscribe Contact"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="space-y-4">
        <h2 className="font-serif text-xl font-bold text-stone-900">Active Customer Subscriptions</h2>
        <div className="rounded-none bg-white border border-stone-300 shadow-[3px_3px_0px_0px_#1C1917] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F2EB] border-b border-stone-300 text-stone-600 uppercase font-mono tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-5">Customer Account</th>
                  <th className="py-3 px-5">Plan Tier</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Monthly Value</th>
                  <th className="py-3 px-5">Subscribed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-stone-800">
                {subscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-stone-400 font-mono">
                      No customer subscriptions registered.
                    </td>
                  </tr>
                ) : (
                  subscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-[#FAF8F5] transition-colors">
                      <td className="py-3 px-5 font-bold text-stone-900 font-serif text-sm">
                        {sub.contact_name}
                      </td>
                      <td className="py-3 px-5 font-medium text-stone-700">
                        {sub.plan_name}
                      </td>
                      <td className="py-3 px-5">
                        <span className="px-2 py-0.5 rounded-none text-[10px] font-mono font-bold uppercase tracking-wider bg-[#EDF2EE] text-[#4A5D4E] border border-[#CCD8CD]">
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-3 px-5 font-bold text-stone-900 font-mono">
                        {formatCurrency(sub.mrr_cents)}
                      </td>
                      <td className="py-3 px-5 text-stone-500 font-mono text-[11px]">
                        {formatDate(sub.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Subscribe Contact Modal */}
      {subscribeTargetPlan && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-stone-900 rounded-none p-6 shadow-[6px_6px_0px_0px_#1C1917] space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div>
                <h3 className="font-serif text-xl font-bold text-stone-900">Subscribe Contact</h3>
                <p className="text-xs text-[#C85A32] font-mono font-bold mt-0.5">{subscribeTargetPlan.name}</p>
              </div>
              <button
                onClick={() => setSubscribeTargetPlan(null)}
                className="text-stone-500 hover:text-stone-900 font-mono text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Enroll a CRM contact into this plan. A subscription entry and MRR record will be generated in the database.
            </p>

            <form onSubmit={handleSubscribeContact} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Target Contact
                </label>
                <select
                  value={selectedContactId}
                  onChange={(e) => setSelectedContactId(e.target.value)}
                  className="w-full px-3 py-2 rounded-none bg-[#FAF8F5] border border-stone-300 text-stone-900 text-xs focus:outline-none focus:border-stone-900 font-mono"
                >
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSubscribeTargetPlan(null)}
                  className="px-4 py-2 rounded-none text-xs font-mono text-stone-600 hover:text-stone-900 uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={subscribeLoading}
                  className="px-5 py-2 rounded-none bg-[#4A5D4E] hover:bg-[#3B4A3E] text-white font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_#1C1917] flex items-center gap-2 cursor-pointer"
                >
                  {subscribeLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Enrollment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Plan Modal (Admin only) */}
      {showCreatePlanModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-stone-900 rounded-none p-6 shadow-[6px_6px_0px_0px_#1C1917] space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="font-serif text-xl font-bold text-stone-900">Define Product Plan</h3>
              <button
                onClick={() => setShowCreatePlanModal(false)}
                className="text-stone-500 hover:text-stone-900 font-mono text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 text-xs bg-[#FDF2F2] border border-[#FCA5A5] text-[#991B1B] font-mono">
                {error}
              </div>
            )}

            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Plan Name
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Retail Growth Pass"
                  className="w-full px-3 py-2 rounded-none bg-[#FAF8F5] border border-stone-300 text-stone-900 text-xs focus:outline-none focus:border-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-stone-600 mb-1">
                    Price (USD $)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    value={priceDollars}
                    onChange={(e) => setPriceDollars(e.target.value)}
                    className="w-full px-3 py-2 rounded-none bg-[#FAF8F5] border border-stone-300 text-stone-900 text-xs focus:outline-none focus:border-stone-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-stone-600 mb-1">
                    Cadence / Interval
                  </label>
                  <select
                    value={interval}
                    onChange={(e) => setInterval(e.target.value)}
                    className="w-full px-3 py-2 rounded-none bg-[#FAF8F5] border border-stone-300 text-stone-900 text-xs focus:outline-none focus:border-stone-900 font-mono"
                  >
                    <option value="monthly">Monthly Recurring</option>
                    <option value="one_time">One-Time Ticket</option>
                    <option value="yearly">Yearly Recurring</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Plan Description & Features
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail included benefits and support commitments..."
                  className="w-full px-3 py-2 rounded-none bg-[#FAF8F5] border border-stone-300 text-stone-900 text-xs focus:outline-none focus:border-stone-900 resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreatePlanModal(false)}
                  className="px-4 py-2 rounded-none text-xs font-mono text-stone-600 hover:text-stone-900 uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={planLoading}
                  className="px-5 py-2 rounded-none bg-[#C85A32] hover:bg-[#B94A26] text-white font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_#1C1917] flex items-center gap-2 cursor-pointer"
                >
                  {planLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Create Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
