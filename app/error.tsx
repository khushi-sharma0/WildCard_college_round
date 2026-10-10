"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application rendering error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#FAF8F5] text-stone-900">
        <main className="mx-auto flex min-h-screen max-w-xl flex-col items-start justify-center gap-4 px-6">
          <p className="font-mono text-xs uppercase tracking-widest text-[#C85A32]">
            Nexus application error
          </p>
          <h1 className="font-serif text-3xl font-bold">This view could not load.</h1>
          <p className="text-sm text-stone-600">
            Your workspace data is unchanged. Try the view again, or return to the dashboard.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={reset}
              className="flex items-center gap-2 border border-stone-900 bg-white px-4 py-2 text-xs font-mono uppercase shadow-[2px_2px_0px_0px_#1C1917]"
            >
              <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
              Try again
            </button>
            <a
              href="/"
              className="border border-stone-300 bg-white px-4 py-2 text-xs font-mono uppercase"
            >
              Dashboard
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
