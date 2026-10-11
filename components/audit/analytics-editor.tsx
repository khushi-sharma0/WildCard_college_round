"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Save, X, AlertCircle, CheckCircle2, RotateCcw } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export type MetricItem = {
  key: string;
  label: string;
  value: number;
  sourceValue?: number;
  note: string;
};

type Props = {
  metrics: MetricItem[];
  role: "admin" | "marketer" | "viewer";
  initialOverrides?: Record<string, number>;
};

export default function AnalyticsEditor({ metrics, role, initialOverrides = {} }: Props) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, number>>(initialOverrides);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Initialize form values from current metrics and overrides
  useEffect(() => {
    fetch("/api/analytics-overrides", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json();
        if (data.overrides) {
          setOverrides(data.overrides);
        }
      })
      .catch(() => {
        // Fallback to initialOverrides on network hiccups
      });
  }, []);

  function openEditor() {
    setError("");
    setSuccess("");
    const values: Record<string, string> = {};
    for (const metric of metrics) {
      const activeValue = overrides[metric.key] !== undefined ? overrides[metric.key] : metric.value;
      values[metric.key] = String(activeValue);
    }
    setFormValues(values);
    setModalOpen(true);
  }

  function handleInputChange(key: string, val: string) {
    setFormValues((prev) => ({ ...prev, [key]: val }));
    if (error) setError("");
  }

  function resetToTelemetry() {
    const values: Record<string, string> = {};
    for (const metric of metrics) {
      const src = metric.sourceValue !== undefined ? metric.sourceValue : metric.value;
      values[metric.key] = String(src);
    }
    setFormValues(values);
    setError("");
  }

  async function handleSave() {
    setError("");
    setSuccess("");

    // Validate all 8 metrics before sending
    const validatedBatch: Record<string, number> = {};
    for (const metric of metrics) {
      const raw = formValues[metric.key];
      if (raw === undefined || raw.trim() === "") {
        setError(`Please enter a valid value for "${metric.label}".`);
        return;
      }
      const num = Number(raw);
      if (!Number.isFinite(num) || num < 0) {
        setError(`"${metric.label}" must be a non-negative finite number.`);
        return;
      }
      validatedBatch[metric.key] = num;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/analytics-overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrides: validatedBatch }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save metric overrides.");
      }

      setOverrides(validatedBatch);
      setSuccess("All metrics saved successfully to Supabase.");
      router.refresh();

      setTimeout(() => {
        setModalOpen(false);
        setSuccess("");
      }, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save metrics to Supabase.");
    } finally {
      setSaving(false);
    }
  }

  if (role === "viewer") {
    return (
      <div className="inline-flex items-center gap-1.5 border border-stone-300 bg-stone-100 px-3 py-1.5 text-[10px] font-mono uppercase text-stone-500 cursor-not-allowed">
        <Pencil className="h-3 w-3 opacity-50" />
        <span>Read-Only (Viewer)</span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={openEditor}
        className="inline-flex items-center gap-2 border border-stone-900 bg-stone-900 px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider text-white shadow-[2px_2px_0px_0px_#1C1917] hover:bg-stone-800 hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer"
        aria-label="Edit KPI Metrics"
      >
        <Pencil className="h-3.5 w-3.5 text-[#E8C2B3]" />
        Edit Metrics
      </button>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="metrics-editor-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !saving) setModalOpen(false);
          }}
        >
          <div className="relative w-full max-w-2xl border border-stone-900 bg-[#FAF8F5] p-6 shadow-[6px_6px_0px_0px_#1C1917] my-8 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-stone-300 pb-4">
              <div>
                <div className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#C85A32]">
                  Workspace Governance • KPI Overrides
                </div>
                <h2 id="metrics-editor-title" className="mt-1 font-serif text-2xl font-bold text-stone-900">
                  Edit Integrated Analytics Metrics
                </h2>
                <p className="mt-1 text-xs text-stone-600">
                  Configure manual metric values persisted in Supabase. These override raw telemetry across all sessions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="border border-stone-300 bg-white p-1.5 hover:bg-stone-100 disabled:opacity-50"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Notification messages */}
            {error && (
              <div
                role="alert"
                className="mt-4 flex items-center gap-2 border border-red-300 bg-red-50 p-3 text-xs text-red-800"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div
                role="status"
                className="mt-4 flex items-center gap-2 border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-800"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{success}</span>
              </div>
            )}

            {/* Metrics List */}
            <div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {metrics.map((metric) => {
                  const currentValue = formValues[metric.key] ?? "";
                  const isOverridden = overrides[metric.key] !== undefined;
                  const isMrr = metric.key === "mrrCents";

                  return (
                    <div
                      key={metric.key}
                      className="border border-stone-300 bg-white p-3 shadow-[1px_1px_0px_0px_#1C1917]"
                    >
                      <div className="flex items-center justify-between gap-1 text-[10px] font-mono font-semibold uppercase text-stone-600">
                        <span className="truncate">{metric.label}</span>
                        {isOverridden ? (
                          <span className="shrink-0 bg-amber-100 text-amber-900 border border-amber-300 px-1 text-[9px]">
                            OVERRIDE
                          </span>
                        ) : (
                          <span className="shrink-0 bg-stone-100 text-stone-500 border border-stone-200 px-1 text-[9px]">
                            SOURCE
                          </span>
                        )}
                      </div>

                      <div className="mt-2">
                        <label className="block text-[10px] font-mono uppercase text-stone-500 mb-1">
                          Value:
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={currentValue}
                            onChange={(e) => handleInputChange(metric.key, e.target.value)}
                            disabled={saving}
                            className="mt-1 block w-full border border-stone-300 bg-[#F5F2EB] px-2.5 py-1.5 text-sm font-sans font-medium text-stone-900 focus:border-stone-900 focus:outline-none"
                            placeholder="Enter value"
                          />
                        </label>
                      </div>

                      {isMrr && (
                        <div className="mt-1.5 text-[11px] font-mono text-[#C85A32]">
                          Preview: {formatCurrency(Number(currentValue) || 0)}
                        </div>
                      )}

                      <div className="mt-1 flex items-center justify-between text-[10px] text-stone-500">
                        <span className="truncate">{metric.note}</span>
                        {metric.sourceValue !== undefined && (
                          <span className="shrink-0 font-mono">Telemetry: {metric.sourceValue}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-5 pt-4 border-t border-stone-300 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={resetToTelemetry}
                disabled={saving}
                className="inline-flex items-center gap-1.5 text-[11px] font-mono text-stone-600 hover:text-stone-900 underline disabled:opacity-50"
              >
                <RotateCcw className="h-3 w-3" />
                Reset all to telemetry
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  className="border border-stone-300 bg-white px-4 py-2 text-xs font-mono font-bold uppercase hover:bg-stone-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 border border-stone-900 bg-[#C85A32] px-5 py-2 text-xs font-mono font-bold uppercase text-white shadow-[2px_2px_0px_0px_#1C1917] hover:bg-[#B34E2A] disabled:opacity-50 transition-all cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  {saving ? "Saving to Supabase..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
