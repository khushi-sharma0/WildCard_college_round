"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";
import type { ToastKind } from "@/lib/toast";

type Toast = { id: number; kind: ToastKind; message: string };

export default function ToastViewport() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handleToast = (event: Event) => {
      const detail = (event as CustomEvent<{ kind: ToastKind; message: string }>).detail;
      if (!detail?.message) return;
      const id = Date.now() + Math.random();
      setToasts((current) => [...current, { ...detail, id }]);
      window.setTimeout(
        () => setToasts((current) => current.filter((toast) => toast.id !== id)),
        5000
      );
    };

    window.addEventListener("nexus:toast", handleToast);
    return () => window.removeEventListener("nexus:toast", handleToast);
  }, []);

  return (
    <div
      aria-live="polite"
      className="fixed right-4 top-20 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.kind === "error" ? "alert" : "status"}
          className={`flex items-start gap-2 border bg-white px-4 py-3 text-xs shadow-[3px_3px_0px_0px_#1C1917] ${
            toast.kind === "success"
              ? "border-[#CCD8CD] text-[#4A5D4E]"
              : "border-[#FCA5A5] text-[#991B1B]"
          }`}
        >
          {toast.kind === "success" ? (
            <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0" />
          ) : (
            <XCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
          )}
          <span className="flex-1">{toast.message}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() =>
              setToasts((current) => current.filter((item) => item.id !== toast.id))
            }
            className="text-stone-500 hover:text-stone-900"
          >
            <X aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
