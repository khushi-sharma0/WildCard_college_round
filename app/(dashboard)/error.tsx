"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard module error:", error);
  }, [error]);

  return (
    <section
      role="alert"
      className="border border-[#FCA5A5] bg-white p-8 shadow-[3px_3px_0px_0px_#1C1917]"
    >
      <p className="font-mono text-xs uppercase tracking-widest text-[#991B1B]">
        Module unavailable
      </p>
      <h1 className="mt-2 font-serif text-2xl font-bold">This module could not load.</h1>
      <p className="mt-2 text-sm text-stone-600">
        The rest of your workspace is still available. Retry the module or navigate elsewhere.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 flex items-center gap-2 border border-stone-900 bg-white px-4 py-2 text-xs font-mono uppercase shadow-[2px_2px_0px_0px_#1C1917]"
      >
        <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
        Retry module
      </button>
    </section>
  );
}
