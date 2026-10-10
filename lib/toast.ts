"use client";

export type ToastKind = "success" | "error";

export function notifyToast(kind: ToastKind, message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("nexus:toast", { detail: { kind, message } })
  );
}
