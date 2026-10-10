"use client";

import { useState } from "react";
import { Page } from "@/lib/services";
import Link from "next/link";
import {
  Plus,
  ExternalLink,
  CheckCircle2,
  Lock,
  Loader2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function SitesView({
  initialPages,
  role,
}: {
  initialPages: Page[];
  role: string;
}) {
  const [pages, setPages] = useState<Page[]>(initialPages);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isViewer = role === "viewer";

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (isViewer) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, slug, content }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create page");
      }

      setPages([data, ...pages]);
      setShowModal(false);
      setTitle("");
      setSlug("");
      setContent("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-300">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#C85A32] font-semibold mb-1">
            Web & Conversion Endpoints
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-stone-900">
            Landing Sites
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Published standalone landing pages integrated directly with the CRM and webinar rooms.
          </p>
        </div>

        <div>
          <button
            onClick={() => !isViewer && setShowModal(true)}
            disabled={isViewer}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-none font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_#1C1917] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#1C1917] cursor-pointer ${
              isViewer
                ? "bg-stone-200 text-stone-500 cursor-not-allowed border border-stone-300"
                : "bg-[#C85A32] hover:bg-[#B94A26] text-white"
            }`}
          >
            {isViewer ? <Lock className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {isViewer ? "Create Page (Admin/Marketer Only)" : "New Landing Page"}
          </button>
        </div>
      </div>

      {/* Pages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pages.map((page) => (
          <div
            key={page.id}
            className="p-6 rounded-none bg-white border border-stone-300 shadow-[3px_3px_0px_0px_#1C1917] hover:border-stone-900 transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <span className="px-2 py-0.5 rounded-none text-[10px] font-mono font-bold uppercase tracking-wider bg-[#EDF2EE] text-[#4A5D4E] border border-[#CCD8CD]">
                  PUBLISHED
                </span>
                <span className="text-[10px] font-mono text-stone-500">
                  {formatDate(page.created_at)}
                </span>
              </div>

              <h3 className="font-serif text-lg font-bold text-stone-900 leading-snug">
                {page.title}
              </h3>

              <p className="text-xs text-stone-600 line-clamp-3 leading-relaxed">
                {page.content}
              </p>
            </div>

            <div className="pt-4 border-t border-stone-200 flex items-center justify-between">
              <div className="text-xs font-mono text-stone-600 truncate max-w-[150px]">
                /s/{page.slug}
              </div>

              <Link
                href={`/s/${page.slug}`}
                target="_blank"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-none bg-[#FAF8F5] hover:bg-stone-100 text-stone-900 text-xs font-mono font-bold uppercase tracking-wider border border-stone-900 shadow-[1px_1px_0px_0px_#1C1917] transition-all"
              >
                <span>View</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Create Page Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-stone-900 rounded-none p-6 shadow-[6px_6px_0px_0px_#1C1917] space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="font-serif text-xl font-bold text-stone-900">Publish Landing Page</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-stone-500 hover:text-stone-900 font-mono text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 text-xs bg-[#FDF2F2] border border-[#FCA5A5] text-[#991B1B] rounded-none font-mono">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Page Headline
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (!slug) {
                      setSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]/g, "-")
                          .replace(/-+/g, "-")
                      );
                    }
                  }}
                  placeholder="e.g. AI in Retail Executive Summit"
                  className="w-full px-3 py-2 rounded-none bg-[#FAF8F5] border border-stone-300 text-stone-900 text-xs focus:outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-stone-600 mb-1">
                  URL Route Slug
                </label>
                <div className="flex items-center rounded-none bg-[#FAF8F5] border border-stone-300 px-3 py-2 text-xs">
                  <span className="text-stone-400 font-mono mr-1">/s/</span>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="ai-in-retail-summit"
                    className="w-full bg-transparent text-stone-900 font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Executive Pitch / Content
                </label>
                <textarea
                  rows={4}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Detail the value proposition and core takeaways..."
                  className="w-full px-3 py-2 rounded-none bg-[#FAF8F5] border border-stone-300 text-stone-900 text-xs focus:outline-none focus:border-stone-900 resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-none text-xs font-mono text-stone-600 hover:text-stone-900 uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-none bg-[#C85A32] hover:bg-[#B94A26] text-white font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_#1C1917] flex items-center gap-2 cursor-pointer"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Publish Page
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
