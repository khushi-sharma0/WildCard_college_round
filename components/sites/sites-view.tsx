"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Copy, ExternalLink, Eye, EyeOff, Loader2, Lock, Pencil, Plus, Redo2, Save, Trash2, Undo2, X } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { notifyToast } from "@/lib/toast";
import { Page, PageBlock, PageBlockType, Plan, SavedSiteTheme, Webinar } from "@/lib/services";
import PageRenderer from "@/components/sites/page-renderer";
import { DEFAULT_BUILDER_SETTINGS, FONT_PAIRINGS, SITE_THEMES, SiteBuilderSettings, SiteTheme, THEME_TEMPLATES } from "@/lib/site-themes";

const blockTypes: { type: PageBlockType; label: string }[] = [
  { type: "hero", label: "Hero" }, { type: "text", label: "About / Text" }, { type: "features", label: "Features" },
  { type: "gallery", label: "Gallery" }, { type: "pricing", label: "Pricing" }, { type: "registration", label: "Webinar registration form" },
  { type: "testimonials", label: "Testimonials" }, { type: "faq", label: "FAQ" }, { type: "cta", label: "CTA" },
  { type: "image", label: "Image" }, { type: "footer", label: "Footer" }
];

const variants: Partial<Record<PageBlockType, string[]>> = {
  hero: ["centered", "split", "split-reversed", "full-image", "minimal"],
  features: ["2-column", "3-column", "4-column", "list", "alternating"],
  pricing: ["1-card", "2-cards", "3-cards", "horizontal", "stacked"],
  footer: ["simple", "multi-column"],
  gallery: ["grid", "masonry", "carousel"],
  testimonials: ["cards", "quotes", "featured"],
  faq: ["list", "two-column", "accordion"]
};

type PreviewSize = "desktop" | "tablet" | "mobile";
type Snapshot = { blocks: PageBlock[]; builder: SiteBuilderSettings; title: string; slug: string; content: string; linkedWebinarId: string };

function makeBlock(type: PageBlockType, title = ""): PageBlock {
  const content = type === "hero" ? title
    : type === "registration" ? "Register for the webinar"
    : type === "cta" ? "Register now"
    : type === "faq" ? "Frequently asked questions"
    : type === "footer" ? "{Business name}"
    : "";
  const items = type === "features" ? ["Add a feature", "Add another feature", "Add a third feature"]
    : type === "faq" ? ["Question? | Add an answer."]
    : type === "testimonials" ? ["Add a testimonial."]
    : type === "gallery" ? []
    : undefined;
  return {
    id: crypto.randomUUID(),
    type,
    content,
    items,
    variant: variants[type]?.[0],
    settings: { alignment: "left", contentWidth: "standard", spacing: "normal", mobileStack: "image-above", columnCount: 3 }
  };
}

function defaultBlocks(title = "", content = ""): PageBlock[] {
  const hero = makeBlock("hero", title);
  const text = makeBlock("text");
  text.content = content;
  const registration = makeBlock("registration");
  return [hero, text, registration];
}

function templateBlocks(templateId: string, webinar?: Webinar, title = "", workspaceName = "Your workspace"): PageBlock[] {
  const selected = THEME_TEMPLATES.find((template) => template.id === templateId);
  if (!selected) return defaultBlocks();
  return selected.types.map((type) => {
    const block = makeBlock(type as PageBlockType, title);
    if (type === "hero") {
      block.content = webinar ? `Join us for ${webinar.title}` : title || "Your page headline";
      block.items = ["", "Learn more"];
      block.variant = templateId === "product" ? "split" : "centered";
    } else if (type === "text") {
      block.content = webinar
        ? `${workspaceName} invites you to ${webinar.title} on ${new Date(webinar.scheduled_at).toLocaleDateString()}.`
        : "Add details about your offering, event, or organization.";
    } else if (type === "registration") {
      block.content = webinar ? `Register for ${webinar.title}` : "Register for updates";
    } else if (type === "features") {
      block.content = templateId === "agenda" ? "Event agenda" : "What to expect";
      block.items = webinar ? [`${webinar.title}`, `Date: ${new Date(webinar.scheduled_at).toLocaleDateString()}`, "Add another detail"] : ["Add a feature", "Add another feature", "Add a third feature"];
    } else if (type === "pricing") {
      block.content = "Choose an option";
    } else if (type === "faq") {
      block.content = "Frequently asked questions";
      block.items = ["When is it? | Add the event date and time.", "Who is it for? | Add your audience details."];
    } else if (type === "testimonials") {
      block.content = "What people say";
      block.items = ["Add a customer testimonial.", "Add another testimonial."];
    } else if (type === "footer") {
      block.content = workspaceName;
    }
    return block;
  });
}

function Viewport({ size, children }: { size: PreviewSize; children: React.ReactNode }) {
  const width = size === "mobile" ? "w-[375px]" : size === "tablet" ? "w-[768px]" : "w-full";
  return <div className={`mx-auto max-w-full overflow-auto border border-stone-300 bg-white shadow-sm ${width}`} style={{ height: 600 }}>{children}</div>;
}

function ThemeSwatch({ theme }: { theme: SiteTheme }) {
  return <div className="flex h-12 overflow-hidden rounded border" style={{ background: theme.colors.background, borderColor: theme.colors.border }}><span className="w-1/3" style={{ background: theme.colors.primary }} /><span className="w-1/3" style={{ background: theme.colors.accent }} /><span className="w-1/3" style={{ background: theme.colors.surface }} /></div>;
}

export default function SitesView({
  initialPages, role, webinars, plans, pageEventCounts, workspaceName
}: {
  initialPages: Page[];
  role: string;
  webinars: Webinar[];
  plans: Plan[];
  pageEventCounts: Record<string, { views: number; submissions: number }>;
  workspaceName: string;
}) {
  const [pages, setPages] = useState(initialPages);
  const [showEditor, setShowEditor] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [editingPage, setEditingPage] = useState<Page | null>(null);
  const [previewPage, setPreviewPage] = useState<Page | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [content, setContent] = useState("");
  const [blocks, setBlocks] = useState<PageBlock[]>([]);
  const [builder, setBuilder] = useState<SiteBuilderSettings>(DEFAULT_BUILDER_SETTINGS);
  const [linkedWebinarId, setLinkedWebinarId] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewSize, setPreviewSize] = useState<PreviewSize>("desktop");
  const [savedThemes, setSavedThemes] = useState<SavedSiteTheme[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingPageId, setDeletingPageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [undoStack, setUndoStack] = useState<Snapshot[]>([]);
  const [redoStack, setRedoStack] = useState<Snapshot[]>([]);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaving = useRef(false);
  const canEdit = role === "admin" || role === "marketer";
  const selectedBlock = blocks.find((block) => block.id === selectedId) || null;
  const linkedWebinar = webinars.find((webinar) => webinar.id === linkedWebinarId);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/sites/themes").then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load saved themes.");
      if (!cancelled) setSavedThemes(data);
    }).catch((loadError) => {
      if (!cancelled) notifyToast("error", loadError instanceof Error ? loadError.message : "Unable to load saved themes.");
    });
    return () => { cancelled = true; };
  }, []);

  function markChanged() {
    setDirty(true);
    setError(null);
  }

  function snapshot(): Snapshot {
    return { blocks: structuredClone(blocks), builder: structuredClone(builder), title, slug, content, linkedWebinarId };
  }

  function checkpoint() {
    setUndoStack((history) => [...history.slice(-49), snapshot()]);
    setRedoStack([]);
  }

  function updateBlocks(next: PageBlock[]) {
    checkpoint();
    setBlocks(next);
    markChanged();
  }

  function updateBuilder(next: SiteBuilderSettings) {
    checkpoint();
    setBuilder(next);
    markChanged();
  }

  function undo() {
    const previous = undoStack[undoStack.length - 1];
    if (!previous) return;
    setRedoStack((history) => [...history, snapshot()]);
    setBlocks(previous.blocks);
    setBuilder(previous.builder);
    setTitle(previous.title);
    setSlug(previous.slug);
    setContent(previous.content);
    setLinkedWebinarId(previous.linkedWebinarId);
    setUndoStack((history) => history.slice(0, -1));
    setDirty(true);
  }

  function redo() {
    const next = redoStack[redoStack.length - 1];
    if (!next) return;
    setUndoStack((history) => [...history, snapshot()]);
    setBlocks(next.blocks);
    setBuilder(next.builder);
    setTitle(next.title);
    setSlug(next.slug);
    setContent(next.content);
    setLinkedWebinarId(next.linkedWebinarId);
    setRedoStack((history) => history.slice(0, -1));
    setDirty(true);
  }

  function startNewPage() {
    setShowEditor(true);
    setShowTemplates(true);
    setEditingPage(null);
    setTitle("");
    setSlug("");
    setSlugEdited(false);
    setContent("");
    setBlocks([]);
    setBuilder(DEFAULT_BUILDER_SETTINGS);
    setLinkedWebinarId(webinars[0]?.id || "");
    setSelectedId(null);
    setError(null);
    setSlugError(null);
    setDirty(false);
    setUndoStack([]);
    setRedoStack([]);
  }

  function selectTemplate(templateId: string) {
    checkpoint();
    const linked = webinars.find((webinar) => webinar.id === linkedWebinarId);
    const startingTitle = linked ? `Join us for ${linked.title}`.slice(0, 120) : "";
    const startingContent = linked
      ? `${workspaceName} invites you to ${linked.title} on ${new Date(linked.scheduled_at).toLocaleDateString()}.`
      : "";
    const headline = startingTitle.length >= 10 ? startingTitle : templateId === "blank" ? "" : "Your new landing page";
    setTitle(headline);
    setContent(startingContent.length >= 20 ? startingContent : templateId === "blank" ? "" : "Add a description for visitors to this page.");
    setSlug(headline.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""));
    const nextBlocks = templateBlocks(templateId, linked, headline, workspaceName);
    setBlocks(nextBlocks);
    setSelectedId(nextBlocks[0]?.id || null);
    setShowTemplates(false);
    setDirty(true);
  }

  function openEdit(page: Page) {
    setShowEditor(true);
    setShowTemplates(false);
    setEditingPage(page);
    setTitle(page.title);
    setSlug(page.slug);
    setSlugEdited(true);
    setContent(page.content);
    const nextBlocks = Array.isArray(page.gjs_data) ? structuredClone(page.gjs_data) : defaultBlocks(page.title, page.content);
    setBlocks(nextBlocks);
    setBuilder(page.builder_data || { ...DEFAULT_BUILDER_SETTINGS, theme: { ...DEFAULT_BUILDER_SETTINGS.theme, colors: { ...DEFAULT_BUILDER_SETTINGS.theme.colors, primary: page.theme_color || DEFAULT_BUILDER_SETTINGS.theme.colors.primary } } });
    setLinkedWebinarId(page.linked_webinar_id || webinars.find((item) => item.landing_page_id === page.id)?.id || "");
    setSelectedId(nextBlocks[0]?.id || null);
    setError(null);
    setSlugError(null);
    setDirty(false);
    setUndoStack([]);
    setRedoStack([]);
  }

  function updateBlock(id: string, updates: Partial<PageBlock>) {
    updateBlocks(blocks.map((block) => block.id === id ? { ...block, ...updates } : block));
  }

  function addBlock(type: PageBlockType) {
    const block = makeBlock(type, title);
    updateBlocks([...blocks, block]);
    setSelectedId(block.id);
  }

  function moveBlock(from: number, to: number) {
    if (to < 0 || to >= blocks.length) return;
    const next = [...blocks];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    updateBlocks(next);
  }

  function duplicateBlock(block: PageBlock) {
    const copy = { ...structuredClone(block), id: crypto.randomUUID() };
    const index = blocks.findIndex((item) => item.id === block.id);
    const next = [...blocks];
    next.splice(index + 1, 0, copy);
    updateBlocks(next);
    setSelectedId(copy.id);
  }

  function updateTheme(updates: Partial<SiteTheme>) {
    const switchingTo = updates.mode;
    const modeColors = switchingTo && switchingTo !== builder.theme.mode
      ? switchingTo === "dark"
        ? { background: "#111318", surface: "#1d2028", text: "#f8fafc", muted: "#a3aab8", border: "#343844" }
        : { background: "#ffffff", surface: "#f7f8fa", text: "#172033", muted: "#647084", border: "#e2e8f0" }
      : {};
    updateBuilder({ ...builder, theme: { ...builder.theme, ...updates, colors: { ...builder.theme.colors, ...modeColors, ...(updates.colors || {}) } } });
  }

  function updateColors(updates: Partial<SiteTheme["colors"]>) {
    updateTheme({ colors: { ...builder.theme.colors, ...updates } });
  }

  async function saveCustomTheme() {
    try {
      const theme = { ...builder.theme, id: "my-theme", name: "My Theme" };
      const response = await fetch("/api/sites/themes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(theme) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save custom theme.");
      setSavedThemes((current) => [data, ...current.filter((item) => item.name !== data.name)]);
      notifyToast("success", "My Theme saved for reuse.");
    } catch (saveError) {
      notifyToast("error", saveError instanceof Error ? saveError.message : "Unable to save custom theme.");
    }
  }

  async function postPage(publish: boolean, autosave = false) {
    if (!canEdit) return;
    if (autosave && autoSaving.current) return;
    if (!title.trim() || title.trim().length < 10 || title.trim().length > 120) {
      if (!autosave) setError("Headline must be between 10 and 120 characters.");
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      if (!autosave) setSlugError("Use lowercase letters and numbers separated by single hyphens.");
      return;
    }
    if (pages.some((page) => page.id !== editingPage?.id && page.slug === slug)) {
      if (!autosave) setSlugError("This slug is already in use.");
      return;
    }
    if (content.trim().length < 20) {
      if (!autosave) setError("Page description must be at least 20 characters.");
      return;
    }
    const hasUnsafeImage = blocks.some((block) => {
      const invalidUrl = (value: string) => {
        try {
          const url = new URL(value);
          return url.protocol !== "https:" && url.protocol !== "http:";
        } catch {
          return true;
        }
      };
      if (block.type === "image" && block.content && invalidUrl(block.content)) return true;
      if (block.type === "hero" && block.items?.[0] && invalidUrl(block.items[0])) return true;
      if (block.type === "gallery" && block.items?.some((item) => item && invalidUrl(item))) return true;
      return block.settings?.background?.kind === "image" && !!block.settings.background.value && invalidUrl(block.settings.background.value);
    });
    if (hasUnsafeImage) {
      if (!autosave) setError("Image blocks must use a valid http or https URL.");
      return;
    }
    const payload = {
      title: title.trim(),
      slug,
      content: content.trim(),
      gjs_data: blocks,
      builder_data: builder,
      theme_color: builder.theme.colors.primary,
      linked_webinar_id: linkedWebinarId || null,
      is_published: publish
    };
    const previousPageId = editingPage?.id;
    if (!autosave) setLoading(true);
    if (autosave) autoSaving.current = true;
    try {
      const response = await fetch(editingPage ? `/api/records/page/${editingPage.id}` : "/api/sites", {
        method: editingPage ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
        if (String(data.error).toLowerCase().includes("slug")) setSlugError(data.error);
        else setError(data.error || "Unable to save page.");
        throw new Error(data.error || "Unable to save page.");
      }
      setPages((current) => editingPage ? current.map((page) => page.id === editingPage.id ? data : page) : [data, ...current]);
      setEditingPage(data);
      const latestSnapshot = JSON.stringify([{
        title: title.trim(), slug, content: content.trim(), gjs_data: blocks, builder_data: builder,
        theme_color: builder.theme.colors.primary, linked_webinar_id: linkedWebinarId || null, is_published: publish
      }, data.id]);
      if (JSON.stringify([payload, previousPageId || data.id]) === latestSnapshot) setDirty(false);
      if (!autosave) {
        setShowEditor(false);
        notifyToast("success", publish ? `Page published at /s/${data.slug}.` : "Draft saved.");
      }
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to save page.";
      if (!autosave) {
        setError(message);
        notifyToast("error", message);
      } else notifyToast("error", `Autosave failed: ${message}`);
    } finally {
      if (!autosave) setLoading(false);
      if (autosave) autoSaving.current = false;
    }
  }

  useEffect(() => {
    if (!showEditor || editingPage?.is_published || !dirty || loading) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => { void postPage(false, true); }, 1200);
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
  }, [showEditor, editingPage, title, slug, content, blocks, builder, linkedWebinarId, dirty, loading]);

  async function setPublished(page: Page, isPublished: boolean) {
    try {
      const response = await fetch(`/api/records/page/${page.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: page.title, slug: page.slug, content: page.content,
          gjs_data: page.gjs_data || [], builder_data: page.builder_data || DEFAULT_BUILDER_SETTINGS,
          theme_color: page.theme_color || DEFAULT_BUILDER_SETTINGS.theme.colors.primary,
          linked_webinar_id: page.linked_webinar_id || null, is_published: isPublished
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update page status.");
      setPages((current) => current.map((item) => item.id === page.id ? data : item));
      notifyToast("success", isPublished ? "Page published." : "Page unpublished.");
    } catch (statusError) {
      notifyToast("error", statusError instanceof Error ? statusError.message : "Unable to update page status.");
    }
  }

  async function duplicatePage(page: Page) {
    const base = `${page.slug}-copy`;
    let newSlug = base;
    let suffix = 2;
    while (pages.some((item) => item.slug === newSlug)) newSlug = `${base}-${suffix++}`;
    const payload = {
      title: `${page.title.slice(0, 113)} (copy)`, slug: newSlug, content: page.content,
      gjs_data: page.gjs_data || [], builder_data: page.builder_data || DEFAULT_BUILDER_SETTINGS,
      theme_color: page.theme_color || DEFAULT_BUILDER_SETTINGS.theme.colors.primary,
      linked_webinar_id: page.linked_webinar_id || null, is_published: false
    };
    try {
      const response = await fetch("/api/sites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to duplicate page.");
      setPages((current) => [data, ...current]);
      notifyToast("success", `Page duplicated as /s/${data.slug}.`);
    } catch (duplicateError) {
      notifyToast("error", duplicateError instanceof Error ? duplicateError.message : "Unable to duplicate page.");
    }
  }

  async function handleDelete(page: Page) {
    if (!window.confirm(`Delete "${page.title}"? This cannot be undone.`)) return;
    setDeletingPageId(page.id);
    try {
      const response = await fetch(`/api/records/page/${page.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to delete landing page.");
      setPages((current) => current.filter((item) => item.id !== page.id));
      notifyToast("success", "Landing page deleted.");
    } catch (deleteError) {
      notifyToast("error", deleteError instanceof Error ? deleteError.message : "Unable to delete landing page.");
    } finally {
      setDeletingPageId(null);
    }
  }

  function closeEditor() {
    setShowEditor(false);
    setEditingPage(null);
    setBlocks([]);
    setDirty(false);
  }

  function builderForPage(page: Page): SiteBuilderSettings {
    return page.builder_data || { ...DEFAULT_BUILDER_SETTINGS, theme: { ...DEFAULT_BUILDER_SETTINGS.theme, colors: { ...DEFAULT_BUILDER_SETTINGS.theme.colors, primary: page.theme_color || DEFAULT_BUILDER_SETTINGS.theme.colors.primary } } };
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 border-b border-stone-300 pb-4 sm:flex-row sm:items-center">
        <div><div className="mb-1 text-[10px] font-mono font-semibold uppercase tracking-widest text-[#C85A32]">Web & Conversion Endpoints</div><h1 className="font-serif text-3xl font-bold tracking-tight text-stone-900 md:text-4xl">Landing Sites</h1><p className="mt-1 text-sm text-stone-600">Build, customize, preview, and publish responsive pages at /s/&lt;slug&gt;.</p></div>
        <button type="button" onClick={startNewPage} disabled={!canEdit} title={!canEdit ? "Read-only access" : "Create a landing page"} className="flex items-center gap-2 border border-stone-900 bg-[#C85A32] px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:border-stone-300 disabled:bg-stone-200 disabled:text-stone-500">{!canEdit ? <Lock className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />} New Page</button>
      </div>

      {!pages.length ? <div className="border border-dashed border-stone-400 bg-white p-10 text-center"><h2 className="font-serif text-xl font-bold">No landing pages yet</h2><p className="mt-2 text-sm text-stone-600">Create a page from a template or start with a blank canvas.</p></div> : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => <article key={page.id} className="flex flex-col justify-between space-y-4 border border-stone-300 bg-white p-6 shadow-[3px_3px_0px_0px_#1C1917]">
            <div className="space-y-3"><div className="flex items-center justify-between border-b border-stone-200 pb-2"><span className={`border px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${page.is_published ? "border-[#CCD8CD] bg-[#EDF2EE] text-[#4A5D4E]" : "border-amber-300 bg-amber-50 text-amber-800"}`}>{page.is_published ? "Published" : "Draft"}</span><span className="text-[10px] font-mono text-stone-500">{formatDate(page.created_at)}</span></div>
              <h2 className="font-serif text-lg font-bold leading-snug text-stone-900">{page.title}</h2><p className="line-clamp-3 text-xs leading-relaxed text-stone-600">{page.content}</p><div className="text-xs font-mono text-stone-500">/s/{page.slug}</div>
              <div className="flex gap-4 text-[10px] font-mono uppercase text-stone-500"><span>{pageEventCounts[page.id]?.views || 0} views</span><span>{pageEventCounts[page.id]?.submissions || 0} form submissions</span></div></div>
            <div className="flex flex-wrap items-center gap-2 border-t border-stone-200 pt-4">
              <button type="button" onClick={() => setPreviewPage(page)} className="flex items-center gap-1.5 border border-stone-900 bg-[#FAF8F5] px-3 py-1.5 text-xs font-mono font-bold uppercase"><Eye className="h-3 w-3" /> Preview</button>
              {page.is_published && <a href={`/s/${page.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 border border-stone-300 px-3 py-1.5 text-xs font-mono font-bold uppercase"><ExternalLink className="h-3 w-3" /> Live</a>}
              {canEdit && <><button type="button" onClick={() => openEdit(page)} aria-label={`Edit ${page.title}`} className="border border-stone-300 bg-white p-1.5"><Pencil className="h-3.5 w-3.5" /></button><button type="button" onClick={() => void duplicatePage(page)} title="Duplicate page" className="border border-stone-300 bg-white p-1.5"><Copy className="h-3.5 w-3.5" /></button><button type="button" onClick={() => void setPublished(page, !page.is_published)} className="border border-stone-300 px-2 py-1.5 text-[10px] font-mono font-bold uppercase">{page.is_published ? "Unpublish" : "Publish"}</button><button type="button" aria-label={`Delete ${page.title}`} disabled={deletingPageId === page.id} onClick={() => void handleDelete(page)} className="border border-stone-300 bg-white p-1.5 text-[#991B1B] disabled:opacity-50">{deletingPageId === page.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}</button></>}
            </div>
          </article>)}
        </div>
      )}

      {showEditor && canEdit && <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-stone-900/70 p-2 md:p-5">
        <div className="my-3 w-full max-w-[1600px] border border-stone-900 bg-[#FAF8F5] shadow-[6px_6px_0px_0px_#1C1917]">
          <div className="sticky top-0 z-30 flex items-center justify-between border-b border-stone-300 bg-white px-4 py-3"><div><div className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#C85A32]">Website Builder · {dirty ? "Unsaved changes" : "Saved"}</div><h2 className="font-serif text-xl font-bold">{editingPage ? "Edit landing page" : "Create landing page"}</h2></div><div className="flex items-center gap-2"><button type="button" onClick={undo} disabled={!undoStack.length} aria-label="Undo" className="border p-2 disabled:opacity-40"><Undo2 className="h-4 w-4" /></button><button type="button" onClick={redo} disabled={!redoStack.length} aria-label="Redo" className="border p-2 disabled:opacity-40"><Redo2 className="h-4 w-4" /></button><button type="button" onClick={closeEditor} aria-label="Close editor" className="border border-stone-300 p-2"><X className="h-4 w-4" /></button></div></div>

          {showTemplates ? <section className="p-6"><h3 className="font-serif text-2xl font-bold">Choose a starting template</h3><p className="mb-5 mt-1 text-sm text-stone-600">Template text uses linked webinar details and editable workspace placeholders.</p><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{THEME_TEMPLATES.map((template) => <button key={template.id} type="button" onClick={() => selectTemplate(template.id)} className="border border-stone-300 bg-white p-5 text-left hover:border-stone-900"><div className="mb-3 grid h-20 grid-cols-4 gap-1">{template.types.slice(0, 4).map((type, index) => <span key={`${type}-${index}`} className="border border-stone-200 bg-[#FAF8F5]" />)}</div><span className="font-serif text-lg font-bold">{template.name}</span><span className="mt-1 block text-xs text-stone-600">{template.types.length ? `${template.types.length} pre-arranged sections` : "Start with an empty page"}</span></button>)}</div><div className="mt-5 flex justify-end"><button type="button" onClick={closeEditor} className="border px-4 py-2 text-xs font-mono font-bold uppercase">Cancel</button></div></section> : (
            <div className="grid gap-4 p-4 xl:grid-cols-[minmax(260px,0.8fr)_minmax(320px,1.25fr)_minmax(280px,0.9fr)]">
              <section className="space-y-4">
                {error && <p role="alert" className="border border-red-300 bg-red-50 p-3 text-xs text-red-800">{error}</p>}
                <div className="space-y-3 border border-stone-300 bg-white p-3">
                  <label className="block text-[10px] font-mono font-bold uppercase text-stone-600">Page headline<input required minLength={10} maxLength={120} value={title} onChange={(event) => { checkpoint(); const value = event.target.value; setTitle(value); if (!slugEdited) setSlug(value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")); markChanged(); }} className="mt-1 w-full border border-stone-300 px-2 py-2 text-sm normal-case tracking-normal text-stone-900" />{error?.startsWith("Headline") && <span role="alert" className="mt-1 block text-[11px] normal-case text-red-700">{error}</span>}</label>
                  <label className="block text-[10px] font-mono font-bold uppercase text-stone-600">Page route<div className="mt-1 flex border border-stone-300 px-2 py-2 text-sm normal-case"><span className="font-mono text-stone-400">/s/</span><input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={slug} onChange={(event) => { checkpoint(); setSlugEdited(true); setSlug(event.target.value); setSlugError(null); markChanged(); }} className="min-w-0 flex-1 bg-transparent font-mono text-stone-900 outline-none" /></div>{slugError && <span role="alert" className="mt-1 block text-[11px] normal-case text-red-700">{slugError}</span>}</label>
                  <label className="block text-[10px] font-mono font-bold uppercase text-stone-600">Description<textarea required minLength={20} maxLength={5000} rows={3} value={content} onChange={(event) => { checkpoint(); setContent(event.target.value); markChanged(); }} className="mt-1 w-full border border-stone-300 px-2 py-2 text-sm normal-case tracking-normal text-stone-900" /></label>
                  <label className="block text-[10px] font-mono font-bold uppercase text-stone-600">Linked webinar<select value={linkedWebinarId} onChange={(event) => { checkpoint(); setLinkedWebinarId(event.target.value); markChanged(); }} className="mt-1 w-full border border-stone-300 bg-white px-2 py-2 text-sm normal-case">{webinars.map((webinar) => <option key={webinar.id} value={webinar.id}>{webinar.title} · {new Date(webinar.scheduled_at).toLocaleDateString()}</option>)}<option value="">No webinar</option></select></label>
                </div>

                <div className="border border-stone-300 bg-white p-3"><h3 className="mb-2 font-serif text-lg font-bold">Themes</h3><div className="grid grid-cols-2 gap-2">{SITE_THEMES.map((theme) => <button key={theme.id} type="button" onClick={() => updateTheme({ ...theme })} aria-pressed={builder.theme.id === theme.id} className={`border p-2 text-left ${builder.theme.id === theme.id ? "border-stone-900 ring-1 ring-stone-900" : "border-stone-200"}`}><ThemeSwatch theme={theme} /><span className="mt-1 block text-[10px] font-mono">{theme.name}</span></button>)}
                  {savedThemes.map((theme) => <button key={`${theme.id}-${theme.created_at}`} type="button" onClick={() => updateTheme({ ...theme, id: "my-theme", name: "My Theme" })} className="border border-stone-300 p-2 text-left"><ThemeSwatch theme={theme} /><span className="mt-1 block text-[10px] font-mono">My Theme</span></button>)}</div>
                  <div className="mt-3 space-y-2 border-t border-stone-200 pt-3">
                    <div className="grid grid-cols-2 gap-2"><label className="text-[10px] font-mono uppercase">Primary color<input aria-label="Primary color" type="color" value={builder.theme.colors.primary} onChange={(event) => updateColors({ primary: event.target.value })} className="mt-1 h-8 w-full" /></label><label className="text-[10px] font-mono uppercase">Accent color<input aria-label="Accent color" type="color" value={builder.theme.colors.accent} onChange={(event) => updateColors({ accent: event.target.value })} className="mt-1 h-8 w-full" /></label></div>
                    <label className="block text-[10px] font-mono uppercase">Font pairing<select value={FONT_PAIRINGS.find((pair) => pair.heading === builder.theme.fonts.heading && pair.body === builder.theme.fonts.body)?.id || "system"} onChange={(event) => { const pair = FONT_PAIRINGS.find((item) => item.id === event.target.value)!; updateTheme({ fonts: { heading: pair.heading, body: pair.body, label: pair.body } }); }} className="mt-1 w-full border bg-white p-2 text-xs normal-case">{FONT_PAIRINGS.map((pair) => <option key={pair.id} value={pair.id}>{pair.name}</option>)}</select></label>
                    <div className="grid grid-cols-2 gap-2"><label className="text-[10px] font-mono uppercase">Corners<select value={builder.theme.radius} onChange={(event) => updateTheme({ radius: event.target.value as SiteTheme["radius"] })} className="mt-1 w-full border bg-white p-2 text-xs normal-case"><option value="sharp">Sharp</option><option value="rounded">Rounded</option><option value="pill">Pill</option></select></label><label className="text-[10px] font-mono uppercase">Mode<select value={builder.theme.mode} onChange={(event) => updateTheme({ mode: event.target.value as SiteTheme["mode"] })} className="mt-1 w-full border bg-white p-2 text-xs normal-case"><option value="light">Light</option><option value="dark">Dark</option></select></label></div>
                    <button type="button" onClick={() => void saveCustomTheme()} className="w-full border border-stone-900 bg-white px-3 py-2 text-[10px] font-mono font-bold uppercase">Save as My Theme</button>
                  </div>
                </div>

                <div className="border border-stone-300 bg-white p-3"><h3 className="font-serif text-lg font-bold">Page layout</h3><div className="mt-2 grid grid-cols-2 gap-2 text-[10px] font-mono uppercase">
                  <label>Header style<select value={builder.headerStyle} onChange={(event) => updateBuilder({ ...builder, headerStyle: event.target.value as SiteBuilderSettings["headerStyle"] })} className="mt-1 w-full border bg-white p-2 text-xs normal-case"><option value="logo-left">Logo left</option><option value="logo-center">Logo center</option><option value="minimal">Minimal</option></select></label>
                  <label>Page width<select value={builder.pageWidth} onChange={(event) => updateBuilder({ ...builder, pageWidth: event.target.value as SiteBuilderSettings["pageWidth"] })} className="mt-1 w-full border bg-white p-2 text-xs normal-case"><option value="standard">Standard</option><option value="wide">Wide</option><option value="full">Full</option></select></label>
                </div><label className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={builder.stickyNavigation} onChange={(event) => updateBuilder({ ...builder, stickyNavigation: event.target.checked })} />Sticky navigation</label></div>

                <div className="border border-stone-300 bg-white p-3"><div className="mb-2 flex items-center justify-between"><h3 className="font-serif text-lg font-bold">Sections</h3><span className="text-[10px] text-stone-500">{blocks.length}/30</span></div><div className="mb-3 flex flex-wrap gap-1">{blockTypes.map((item) => <button key={item.type} type="button" disabled={blocks.length >= 30} onClick={() => addBlock(item.type)} className="inline-flex items-center gap-1 border border-stone-300 px-2 py-1 text-[9px] font-mono font-bold uppercase disabled:opacity-40"><Plus className="h-3 w-3" />{item.label}</button>)}</div><div className="space-y-2">
                  {blocks.map((block, index) => <article key={block.id} draggable onDragStart={() => setDraggingIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggingIndex !== null && draggingIndex !== index) moveBlock(draggingIndex, index); setDraggingIndex(null); }} className={`border p-2 ${selectedId === block.id ? "border-stone-900 bg-[#FAF8F5]" : "border-stone-200"} ${block.hidden ? "opacity-60" : ""}`}>
                    <button type="button" onClick={() => setSelectedId(block.id)} className="w-full text-left text-xs font-semibold">{index + 1}. {blockTypes.find((type) => type.type === block.type)?.label}{block.hidden ? " (hidden)" : ""}</button>
                    <div className="mt-2 flex justify-end gap-1"><button type="button" aria-label={`Move section ${index + 1} up`} disabled={!index} onClick={() => moveBlock(index, index - 1)} className="border p-1 disabled:opacity-40"><ArrowUp className="h-3 w-3" /></button><button type="button" aria-label={`Move section ${index + 1} down`} disabled={index === blocks.length - 1} onClick={() => moveBlock(index, index + 1)} className="border p-1 disabled:opacity-40"><ArrowDown className="h-3 w-3" /></button><button type="button" aria-label="Duplicate section" onClick={() => duplicateBlock(block)} className="border p-1"><Copy className="h-3 w-3" /></button><button type="button" aria-label={block.hidden ? "Show section" : "Hide section"} onClick={() => updateBlock(block.id, { hidden: !block.hidden })} className="border p-1">{block.hidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}</button><button type="button" aria-label="Remove section" onClick={() => { updateBlocks(blocks.filter((item) => item.id !== block.id)); if (selectedId === block.id) setSelectedId(null); }} className="border p-1 text-red-700"><Trash2 className="h-3 w-3" /></button></div>
                  </article>)}
                  {!blocks.length && <p className="border border-dashed p-4 text-center text-xs text-stone-500">No sections yet. Add one above or use a template.</p>}
                </div></div>
              </section>

              <section className="min-w-0 border border-stone-300 bg-white p-3"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="font-serif text-lg font-bold">Live preview</h3><div className="flex gap-1">{(["desktop", "tablet", "mobile"] as PreviewSize[]).map((size) => <button key={size} type="button" aria-pressed={previewSize === size} onClick={() => setPreviewSize(size)} className={`border px-2 py-1 text-[9px] font-mono font-bold uppercase ${previewSize === size ? "border-stone-900 bg-[#FAF8F5]" : "border-stone-300"}`}>{size}</button>)}</div></div><Viewport size={previewSize}><PageRenderer title={title} content={content} blocks={blocks} builderData={builder} themeColor={builder.theme.colors.primary} plans={plans} slug={slug} room={linkedWebinar?.jitsi_room} preview /></Viewport>
                <div className="mt-3 flex flex-wrap justify-end gap-2 border-t pt-3"><button type="button" onClick={closeEditor} className="border px-3 py-2 text-[10px] font-mono font-bold uppercase">Cancel</button><button type="button" disabled={loading} onClick={() => void postPage(false)} className="inline-flex items-center gap-1 border px-3 py-2 text-[10px] font-mono font-bold uppercase disabled:opacity-50"><Save className="h-3 w-3" />Save draft</button><button type="button" disabled={loading} onClick={() => void postPage(true)} className="inline-flex items-center gap-1 border border-stone-900 bg-[#C85A32] px-3 py-2 text-[10px] font-mono font-bold uppercase text-white disabled:opacity-50">{loading && <Loader2 className="h-3 w-3 animate-spin" />}Publish</button></div>
              </section>

              <aside className="min-h-[300px] border border-stone-300 bg-white p-3">
                <h3 className="font-serif text-lg font-bold">Section settings</h3>
                {!selectedBlock ? <p className="mt-3 text-xs text-stone-500">Select a section to edit its content, layout variant, and responsive settings.</p> : <div className="mt-3 space-y-3">
                  <label className="block text-[10px] font-mono font-bold uppercase">Section content<textarea rows={3} value={selectedBlock.content} onChange={(event) => updateBlock(selectedBlock.id, { content: event.target.value })} className="mt-1 w-full border p-2 text-sm normal-case tracking-normal" /></label>
                  {selectedBlock.type === "pricing" && <label className="block text-[10px] font-mono uppercase">Plan<select value={selectedBlock.target_id || ""} onChange={(event) => updateBlock(selectedBlock.id, { target_id: event.target.value || undefined })} className="mt-1 w-full border bg-white p-2 text-xs normal-case"><option value="">No plan linked</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label>}
                  {["features", "gallery", "testimonials", "faq", "footer"].includes(selectedBlock.type) && <label className="block text-[10px] font-mono uppercase">Items (one per line){selectedBlock.type === "faq" && " · question | answer"}<textarea rows={4} value={(selectedBlock.items || []).join("\n")} onChange={(event) => updateBlock(selectedBlock.id, { items: event.target.value.split("\n").slice(0, 20) })} className="mt-1 w-full border p-2 text-xs normal-case tracking-normal" placeholder={selectedBlock.type === "gallery" ? "https://example.com/image.jpg" : "One item per line"} /></label>}
                  {["hero", "image"].includes(selectedBlock.type) && <label className="block text-[10px] font-mono uppercase">{selectedBlock.type === "hero" ? "Image URL (first line)" : "Image URL"}{selectedBlock.type === "hero" ? <input value={selectedBlock.items?.[0] || ""} onChange={(event) => updateBlock(selectedBlock.id, { items: [event.target.value, selectedBlock.items?.[1] || ""] })} className="mt-1 w-full border p-2 text-xs normal-case" placeholder="https://example.com/image.jpg" /> : <input value={selectedBlock.content} onChange={(event) => updateBlock(selectedBlock.id, { content: event.target.value })} className="mt-1 w-full border p-2 text-xs normal-case" placeholder="https://example.com/image.jpg" />}</label>}
                  {variants[selectedBlock.type] && <fieldset><legend className="mb-1 text-[10px] font-mono font-bold uppercase">Layout variant</legend><div className="grid grid-cols-2 gap-1">{variants[selectedBlock.type]!.map((variant) => <button key={variant} type="button" aria-pressed={(selectedBlock.variant || variants[selectedBlock.type]![0]) === variant} onClick={() => updateBlock(selectedBlock.id, { variant })} className={`border p-2 text-[10px] capitalize ${selectedBlock.variant === variant ? "border-stone-900 bg-[#FAF8F5]" : "border-stone-200"}`}><span className="mb-1 flex h-6 items-center justify-center gap-1">{variant.includes("split") ? <><span className="h-4 w-5 bg-stone-300" /><span className="h-4 w-5 bg-stone-600" /></> : variant.includes("column") || variant.includes("card") ? <span className="grid grid-cols-3 gap-0.5">{[1, 2, 3].map((n) => <i key={n} className="h-4 w-3 bg-stone-400" />)}</span> : <span className="h-3 w-10 border-b-2 border-stone-500" />}</span>{variant.replace("-", " ")}</button>)}</div></fieldset>}
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-[10px] font-mono uppercase">Alignment<select value={selectedBlock.settings?.alignment || "left"} onChange={(event) => updateBlock(selectedBlock.id, { settings: { ...selectedBlock.settings, alignment: event.target.value as "left" | "center" | "right" } })} className="mt-1 w-full border bg-white p-2 text-xs normal-case"><option>left</option><option>center</option><option>right</option></select></label>
                    <label className="text-[10px] font-mono uppercase">Content width<select value={selectedBlock.settings?.contentWidth || "standard"} onChange={(event) => updateBlock(selectedBlock.id, { settings: { ...selectedBlock.settings, contentWidth: event.target.value as NonNullable<PageBlock["settings"]>["contentWidth"] } })} className="mt-1 w-full border bg-white p-2 text-xs normal-case"><option value="narrow">Narrow</option><option value="standard">Standard</option><option value="wide">Wide</option><option value="full">Full</option></select></label>
                    <label className="text-[10px] font-mono uppercase">Spacing<select value={selectedBlock.settings?.spacing || "normal"} onChange={(event) => updateBlock(selectedBlock.id, { settings: { ...selectedBlock.settings, spacing: event.target.value as NonNullable<PageBlock["settings"]>["spacing"] } })} className="mt-1 w-full border bg-white p-2 text-xs normal-case"><option value="compact">Compact</option><option value="normal">Normal</option><option value="spacious">Spacious</option></select></label>
                    {selectedBlock.type === "features" && <label className="text-[10px] font-mono uppercase">Columns<select value={selectedBlock.settings?.columnCount || 3} onChange={(event) => updateBlock(selectedBlock.id, { settings: { ...selectedBlock.settings, columnCount: Number(event.target.value) } })} className="mt-1 w-full border bg-white p-2 text-xs normal-case"><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option></select></label>}
                  </div>
                  <fieldset><legend className="mb-1 text-[10px] font-mono font-bold uppercase">Section background</legend><div className="grid grid-cols-3 gap-1"><button type="button" onClick={() => updateBlock(selectedBlock.id, { settings: { ...selectedBlock.settings, background: { kind: "solid", value: "#ffffff" } } })} className="border p-1 text-[9px] uppercase">Solid</button><button type="button" onClick={() => updateBlock(selectedBlock.id, { settings: { ...selectedBlock.settings, background: { kind: "gradient", value: `linear-gradient(135deg, ${builder.theme.colors.primary}, ${builder.theme.colors.accent})` } } })} className="border p-1 text-[9px] uppercase">Gradient</button><button type="button" onClick={() => updateBlock(selectedBlock.id, { settings: { ...selectedBlock.settings, background: { kind: "image", value: "" } } })} className="border p-1 text-[9px] uppercase">Image</button></div>{selectedBlock.settings?.background?.kind === "solid" && <input aria-label="Section background color" type="color" value={/^#[0-9a-fA-F]{6}$/.test(selectedBlock.settings.background.value) ? selectedBlock.settings.background.value : "#ffffff"} onChange={(event) => updateBlock(selectedBlock.id, { settings: { ...selectedBlock.settings, background: { kind: "solid", value: event.target.value } } })} className="mt-2 h-8 w-full" />}{selectedBlock.settings?.background?.kind === "image" && <input value={selectedBlock.settings.background.value} onChange={(event) => updateBlock(selectedBlock.id, { settings: { ...selectedBlock.settings, background: { kind: "image", value: event.target.value } } })} placeholder="https://example.com/background.jpg" className="mt-2 w-full border p-2 text-xs" />}</fieldset>
                  {selectedBlock.type === "hero" && <label className="block text-[10px] font-mono uppercase">Mobile image order<select value={selectedBlock.settings?.mobileStack || "image-above"} onChange={(event) => updateBlock(selectedBlock.id, { settings: { ...selectedBlock.settings, mobileStack: event.target.value as "image-above" | "image-below" } })} className="mt-1 w-full border bg-white p-2 text-xs normal-case"><option value="image-above">Image above text</option><option value="image-below">Image below text</option></select></label>}
                </div>}
              </aside>
            </div>
          )}
        </div>
      </div>}

      {previewPage && <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-stone-900/70 p-3 md:p-6"><div className="my-4 w-full max-w-5xl border border-stone-900 bg-[#FAF8F5] p-4 shadow-[6px_6px_0px_0px_#1C1917] md:p-6"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-serif text-2xl font-bold">{previewPage.title}</h2><p className="text-xs text-stone-500">Preview · /s/{previewPage.slug}</p></div><button type="button" onClick={() => setPreviewPage(null)} aria-label="Close preview" className="border border-stone-300 p-2"><X className="h-4 w-4" /></button></div><div className="mb-3 flex justify-end gap-1">{(["desktop", "tablet", "mobile"] as PreviewSize[]).map((size) => <button key={size} type="button" onClick={() => setPreviewSize(size)} className="border px-3 py-1 text-[10px] font-mono font-bold uppercase">{size}</button>)}</div><Viewport size={previewSize}><PageRenderer title={previewPage.title} content={previewPage.content} blocks={Array.isArray(previewPage.gjs_data) ? previewPage.gjs_data : defaultBlocks(previewPage.title, previewPage.content)} builderData={builderForPage(previewPage)} themeColor={previewPage.theme_color || DEFAULT_BUILDER_SETTINGS.theme.colors.primary} plans={plans} slug={previewPage.slug} room={webinars.find((webinar) => webinar.id === previewPage.linked_webinar_id)?.jitsi_room} preview /></Viewport></div></div>}
    </div>
  );
}
