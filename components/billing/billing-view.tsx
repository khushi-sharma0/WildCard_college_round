"use client";

import { useState } from "react";
import { Plan, Subscription } from "@/lib/services";
import {
  CreditCard,
  Download,
  Lock,
  Loader2,
  Zap
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function BillingView({
  initialPlans,
  initialSubscriptions,
  initialPayments,
  role,
  workspaces,
}: {
  initialPlans: Plan[];
  initialSubscriptions: Subscription[];
  initialPayments: any[];
  role: string;
  workspaces: any[];
}) {
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(initialSubscriptions);
  const [payments, setPayments] = useState(initialPayments || []);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<Plan | null>(null);
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Demo bar state
  const [mockCompanies] = useState<any[]>(workspaces);
  const [selectedCompanyId, setSelectedCompanyId] = useState(mockCompanies[0]?.id ?? "");
  const [forceFailPayment, setForceFailPayment] = useState(false);
  const [cycleLoading, setCycleLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const isAdmin = role === "owner" || role === "admin";

  // Find current sub for this workspace
  const currentSub = subscriptions.find((s) => s.workspace_id === selectedCompanyId) || null;
  const currentPlan = currentSub ? plans.find((p) => p.id === currentSub.plan_id) : null;

  async function handleRunCycle() {
    if (!isAdmin) return;
    setCycleLoading(true);
    try {
      const res = await fetch("/api/billing/cycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceFailPayment })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert(`Cycle completed! Processed ${data.processed.length} subscriptions.`);
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCycleLoading(false);
    }
  }

  async function handleSubscribeOrUpgrade(plan: Plan) {
    setCheckoutPlan(plan);
    setCardNumber("");
    setCardExpiry("");
    setCardCvc("");
    setCheckoutError(null);
    setShowCheckoutModal(true);
  }

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    const expiryMatch = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(cardExpiry);
    const expiryMonth = expiryMatch ? Number(expiryMatch[1]) : 0;
    const expiryYear = expiryMatch ? 2000 + Number(expiryMatch[2]) : 0;
    const now = new Date();
    const isExpired =
      expiryYear < now.getFullYear() ||
      (expiryYear === now.getFullYear() && expiryMonth < now.getMonth() + 1);

    if (!/^\d{16}$/.test(cardNumber)) {
      setCheckoutError("Enter a valid 16-digit card number.");
      return;
    }
    if (!expiryMatch) {
      setCheckoutError("Enter a valid expiry date in MM/YY format.");
      return;
    }
    if (isExpired) {
      setCheckoutError("The card has expired. Enter a current expiry date.");
      return;
    }
    if (!/^\d{3}$/.test(cardCvc)) {
      setCheckoutError("Enter a valid 3-digit CVV.");
      return;
    }

    setCheckoutError(null);
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: "contact-1",
          planId: checkoutPlan?.id,
          workspaceId: selectedCompanyId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.status === "pending_approval") {
        alert(data.note);
      } else {
        alert("Payment successful! Subscription updated.");
        setSubscriptions((prev) => {
          const existing = prev.find((s) => s.id === data.id);
          if (existing) return prev.map((s) => (s.id === data.id ? data : s));
          return [data, ...prev];
        });
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCheckoutLoading(false);
      setShowCheckoutModal(false);
    }
  }

  async function handleCancel() {
    if (!isAdmin) {
      alert("Only owners and admins can cancel subscriptions.");
      return;
    }
    if (!confirm("Are you sure you want to cancel this subscription?")) return;

    try {
      const res = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: currentSub?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert("Subscription canceled successfully.");
      setSubscriptions((prev) => prev.map((s) => (s.id === data.id ? data : s)));
    } catch (err: any) {
      alert(err.message);
    }
  }

  return (
    <div className="space-y-6">
      {/* Demo Simulation Bar */}
      <div className="bg-[#FAF8F5] border border-stone-300 p-4 shadow-[2px_2px_0px_0px_#1C1917] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <label className="text-[10px] uppercase font-bold font-mono text-stone-500">Simulate Workspace</label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              disabled={mockCompanies.length === 0}
              className="block w-48 mt-1 px-2 py-1 bg-white border border-stone-300 text-xs font-mono font-bold"
            >
              {mockCompanies.length === 0 ? (
                <option value="">No workspaces available</option>
              ) : (
                mockCompanies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="pl-4 border-l border-stone-300 flex items-center gap-3">
            <label className="text-[10px] uppercase font-bold font-mono text-stone-500">Force Next Payment Fail</label>
            <input
              type="checkbox"
              checked={forceFailPayment}
              onChange={(e) => setForceFailPayment(e.target.checked)}
              className="w-4 h-4 text-red-600 focus:ring-red-500 border-stone-300 rounded"
            />
          </div>
        </div>

        <div>
          <button
            onClick={handleRunCycle}
            disabled={cycleLoading || !isAdmin}
            className="bg-stone-900 text-white px-4 py-2 text-xs font-mono font-bold uppercase disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {cycleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-yellow-400" />}
            Run Billing Cycle Now
          </button>
          {!isAdmin && <div className="text-[9px] text-stone-500 text-right mt-1 font-mono">Owner/Admin only</div>}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-300">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-stone-900">
            SaaS Billing & Plans
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Subscription lifecycle, recurring renewals, and payment history.
          </p>
        </div>
      </div>

      {/* Current Subscription Banner */}
      <div className="p-6 rounded-none bg-white border border-stone-300 shadow-[3px_3px_0px_0px_#1C1917]">
        <h2 className="text-sm uppercase tracking-widest font-mono font-bold text-stone-500 mb-4">Current Subscription</h2>

        {currentSub ? (
          <div className="flex items-center justify-between">
            <div>
              <div className="font-serif text-2xl font-bold">{currentPlan?.name || "Unknown Plan"}</div>
              <div className="text-xs font-mono mt-1 text-stone-600">
                Status:
                <span
                  className={`ml-2 px-2 py-0.5 uppercase tracking-wider font-bold ${
                    currentSub.status === "active"
                      ? "bg-green-100 text-green-800 border border-green-300"
                      : currentSub.status === "trialing"
                      ? "bg-blue-100 text-blue-800 border border-blue-300"
                      : currentSub.status === "past_due"
                      ? "bg-red-100 text-red-800 border border-red-300"
                      : "bg-stone-200 text-stone-800"
                  }`}
                >
                  {currentSub.status}
                </span>
              </div>
            </div>

            {currentSub.status !== "canceled" && (
              <button
                onClick={handleCancel}
                className="text-xs font-bold font-mono text-red-600 uppercase underline hover:text-red-800 cursor-pointer"
              >
                Cancel Subscription
              </button>
            )}
          </div>
        ) : (
          <div className="text-sm font-mono text-stone-600">No active subscription.</div>
        )}
      </div>

      {/* Plans Pricing */}
      <div>
        <h2 className="text-sm uppercase tracking-widest font-mono font-bold text-stone-500 mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = currentSub && currentSub.status !== "canceled" && currentPlan?.id === plan.id;
            const isUpgrade =
              currentSub && currentSub.status !== "canceled" && currentPlan
                ? plan.price_cents > currentPlan.price_cents
                : false;
            const isDowngrade =
              currentSub && currentSub.status !== "canceled" && currentPlan
                ? plan.price_cents < currentPlan.price_cents
                : false;

            let btnText = "Subscribe";
            if (isCurrent) btnText = "Current Plan";
            else if (isUpgrade) btnText = "Upgrade Plan";
            else if (isDowngrade) btnText = "Downgrade Plan";
            else if (plan.name === "Pro" && (!currentSub || currentSub.status === "canceled"))
              btnText = "Start 14-Day Free Trial";

            return (
              <div
                key={plan.id}
                className={`p-6 bg-white border ${
                  isCurrent
                    ? "border-green-600 shadow-[3px_3px_0px_0px_#16a34a]"
                    : "border-stone-300 shadow-[3px_3px_0px_0px_#1C1917]"
                } flex flex-col justify-between space-y-4`}
              >
                <div className="space-y-2">
                  <h3 className="font-serif text-xl font-bold text-stone-900">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 pt-1">
                    <span className="font-serif text-3xl font-bold text-stone-900">
                      {formatCurrency(plan.price_cents)}
                    </span>
                    <span className="text-xs text-stone-500 font-mono">/mo</span>
                  </div>
                  <p className="text-xs text-stone-600 pt-2">{plan.description}</p>
                </div>

                <div className="pt-4 border-t border-stone-200">
                  <button
                    onClick={() => handleSubscribeOrUpgrade(plan)}
                    disabled={!!isCurrent}
                    className={`w-full py-2.5 text-xs font-bold uppercase font-mono tracking-wider transition-all cursor-pointer ${
                      isCurrent
                        ? "bg-stone-100 text-stone-400 cursor-not-allowed"
                        : isUpgrade
                        ? "bg-[#C85A32] text-white hover:bg-[#B94A26]"
                        : "bg-stone-900 text-white hover:bg-stone-800"
                    }`}
                  >
                    {btnText}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payments Table */}
      <div className="mt-8">
        <h2 className="text-sm uppercase tracking-widest font-mono font-bold text-stone-500 mb-4">Payment History</h2>
        <div className="bg-white border border-stone-300 shadow-[3px_3px_0px_0px_#1C1917] overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5F2EB] border-b border-stone-300 text-stone-600 uppercase font-mono tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-5">Date</th>
                <th className="py-3 px-5">Invoice ID</th>
                <th className="py-3 px-5">Amount</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 text-stone-800 font-mono">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-stone-400">
                    No payments yet.
                  </td>
                </tr>
              ) : (
                payments.map((p, i) => (
                  <tr key={i} className="hover:bg-stone-50">
                    <td className="py-3 px-5">{formatDate(p.timestamp)}</td>
                    <td className="py-3 px-5">{p.invoice_id}</td>
                    <td className="py-3 px-5 font-bold">{formatCurrency(p.amount)}</td>
                    <td className="py-3 px-5">
                      <span
                        className={`px-2 py-0.5 text-[10px] uppercase font-bold border ${
                          p.status === "succeeded"
                            ? "bg-green-100 text-green-800 border-green-300"
                            : "bg-red-100 text-red-800 border-red-300"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right">
                      <a
                        href={`/api/billing/invoice?id=${p.id}`}
                        target="_blank"
                        className="text-blue-600 hover:underline inline-flex items-center gap-1 justify-end ml-auto"
                      >
                        <Download className="w-3 h-3" /> PDF
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mock Checkout Modal */}
      {showCheckoutModal && checkoutPlan && (
        <div className="fixed inset-0 bg-stone-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 shadow-xl max-w-sm w-full space-y-4 border border-stone-900 shadow-[6px_6px_0px_0px_#1C1917]">
            <div className="flex justify-between items-center border-b border-stone-200 pb-2">
              <h3 className="font-serif text-xl font-bold">Secure Checkout</h3>
              <Lock className="w-4 h-4 text-stone-400" />
            </div>

            <div className="text-sm">
              Subscribe to <span className="font-bold">{checkoutPlan.name}</span> for{" "}
              {formatCurrency(checkoutPlan.price_cents)}/mo.
            </div>

            <form onSubmit={handleCheckout} className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase font-mono font-bold text-stone-500 mb-1">
                  Card Number
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    placeholder="16-digit card number"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, "").slice(0, 16))}
                    maxLength={16}
                    pattern="\d{16}"
                    title="Enter exactly 16 digits"
                    required
                    className="w-full pl-9 pr-3 py-2 border border-stone-300 text-xs font-mono bg-stone-50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-mono font-bold text-stone-500 mb-1">Expiry</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    placeholder="MM/YY"
                    value={cardExpiry}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setCardExpiry(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits);
                    }}
                    maxLength={5}
                    pattern="(0[1-9]|1[0-2])/\d{2}"
                    title="Enter a valid expiry date in MM/YY format"
                    required
                    className="w-full px-3 py-2 border border-stone-300 text-xs font-mono bg-stone-50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-mono font-bold text-stone-500 mb-1">CVC</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    placeholder="3-digit CVV"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, "").slice(0, 3))}
                    maxLength={3}
                    pattern="\d{3}"
                    title="Enter exactly 3 digits"
                    required
                    className="w-full px-3 py-2 border border-stone-300 text-xs font-mono bg-stone-50"
                  />
                </div>
              </div>
              {checkoutError && <p role="alert" className="text-xs text-red-700">{checkoutError}</p>}

              <div className="flex justify-end gap-3 pt-4 border-t border-stone-200 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCheckoutModal(false);
                    setCheckoutError(null);
                  }}
                  className="text-xs uppercase font-mono px-3 py-2 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={checkoutLoading}
                  className="bg-[#C85A32] text-white px-4 py-2 text-xs uppercase font-bold cursor-pointer"
                >
                  {checkoutLoading ? "Processing..." : `Pay ${formatCurrency(checkoutPlan.price_cents)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
