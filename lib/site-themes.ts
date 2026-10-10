export interface SiteTheme {
  id: string;
  name: string;
  colors: {
    background: string;
    surface: string;
    text: string;
    muted: string;
    primary: string;
    accent: string;
    border: string;
  };
  fonts: { heading: string; body: string; label: string };
  headingStyle: "classic" | "modern" | "editorial" | "compact";
  radius: "sharp" | "rounded" | "pill";
  buttonStyle: "solid" | "outline" | "soft";
  shadowStyle: "none" | "soft" | "bold";
  spacing: "compact" | "normal" | "spacious";
  mode: "light" | "dark";
}

export interface SiteBuilderSettings {
  theme: SiteTheme;
  headerStyle: "logo-left" | "logo-center" | "minimal";
  stickyNavigation: boolean;
  pageWidth: "standard" | "wide" | "full";
}

export const FONT_PAIRINGS = [
  { id: "system", name: "System Sans", heading: "Arial, sans-serif", body: "Arial, sans-serif" },
  { id: "editorial", name: "Editorial Serif", heading: "Georgia, serif", body: "Arial, sans-serif" },
  { id: "classic", name: "Classic Serif", heading: "Georgia, serif", body: "Georgia, serif" },
  { id: "humanist", name: "Humanist", heading: "Trebuchet MS, sans-serif", body: "Arial, sans-serif" },
  { id: "modern", name: "Modern Grotesk", heading: "Arial, sans-serif", body: "Arial, sans-serif" },
  { id: "mono", name: "Technical Mono", heading: "Consolas, monospace", body: "Arial, sans-serif" },
  { id: "rounded", name: "Rounded Sans", heading: "Trebuchet MS, sans-serif", body: "Trebuchet MS, sans-serif" },
  { id: "book", name: "Bookish", heading: "Georgia, serif", body: "Trebuchet MS, sans-serif" }
] as const;

export const SITE_THEMES: SiteTheme[] = [
  { id: "minimal-light", name: "Minimal Light", colors: { background: "#ffffff", surface: "#f7f8fa", text: "#172033", muted: "#647084", primary: "#334155", accent: "#0ea5e9", border: "#e2e8f0" }, fonts: { heading: "Arial, sans-serif", body: "Arial, sans-serif", label: "Arial, sans-serif" }, headingStyle: "modern", radius: "rounded", buttonStyle: "solid", shadowStyle: "soft", spacing: "normal", mode: "light" },
  { id: "bold-dark", name: "Bold Dark", colors: { background: "#111318", surface: "#1d2028", text: "#f8fafc", muted: "#a3aab8", primary: "#f8fafc", accent: "#a78bfa", border: "#343844" }, fonts: { heading: "Arial, sans-serif", body: "Arial, sans-serif", label: "Arial, sans-serif" }, headingStyle: "compact", radius: "sharp", buttonStyle: "solid", shadowStyle: "none", spacing: "spacious", mode: "dark" },
  { id: "corporate-blue", name: "Corporate Blue", colors: { background: "#f8fafc", surface: "#ffffff", text: "#102a43", muted: "#526579", primary: "#155eef", accent: "#12b76a", border: "#d7e0ec" }, fonts: { heading: "Arial, sans-serif", body: "Arial, sans-serif", label: "Arial, sans-serif" }, headingStyle: "modern", radius: "rounded", buttonStyle: "solid", shadowStyle: "soft", spacing: "normal", mode: "light" },
  { id: "warm-editorial", name: "Warm Editorial", colors: { background: "#fbf6ee", surface: "#fffdf9", text: "#352a23", muted: "#76685c", primary: "#8f3d2e", accent: "#c77843", border: "#e8dccc" }, fonts: { heading: "Georgia, serif", body: "Georgia, serif", label: "Arial, sans-serif" }, headingStyle: "editorial", radius: "sharp", buttonStyle: "outline", shadowStyle: "soft", spacing: "spacious", mode: "light" },
  { id: "vibrant-gradient", name: "Vibrant Gradient", colors: { background: "#f8f7ff", surface: "#ffffff", text: "#20133d", muted: "#655b7c", primary: "#6d28d9", accent: "#ec4899", border: "#e4ddf5" }, fonts: { heading: "Trebuchet MS, sans-serif", body: "Arial, sans-serif", label: "Arial, sans-serif" }, headingStyle: "modern", radius: "pill", buttonStyle: "solid", shadowStyle: "soft", spacing: "spacious", mode: "light" },
  { id: "soft-pastel", name: "Soft Pastel", colors: { background: "#fff9fc", surface: "#ffffff", text: "#3e3446", muted: "#827588", primary: "#a8558b", accent: "#65a89a", border: "#f0dce9" }, fonts: { heading: "Trebuchet MS, sans-serif", body: "Trebuchet MS, sans-serif", label: "Arial, sans-serif" }, headingStyle: "classic", radius: "rounded", buttonStyle: "soft", shadowStyle: "soft", spacing: "normal", mode: "light" }
];

export const DEFAULT_BUILDER_SETTINGS: SiteBuilderSettings = {
  theme: SITE_THEMES[0],
  headerStyle: "logo-left",
  stickyNavigation: false,
  pageWidth: "standard"
};

export const THEME_TEMPLATES = [
  { id: "webinar", name: "Webinar Landing", types: ["hero", "text", "features", "registration", "faq", "footer"] },
  { id: "product", name: "Product Launch", types: ["hero", "text", "gallery", "features", "testimonials", "cta", "footer"] },
  { id: "lead", name: "Lead Capture", types: ["hero", "text", "registration", "testimonials", "footer"] },
  { id: "pricing", name: "Pricing Page", types: ["hero", "text", "pricing", "faq", "cta", "footer"] },
  { id: "agenda", name: "Event Agenda", types: ["hero", "text", "features", "registration", "footer"] },
  { id: "blank", name: "Blank", types: [] }
] as const;
