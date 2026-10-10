import RegistrationForm from "@/app/s/[slug]/registration-form";
import { PageBlock, Plan } from "@/lib/services";
import { DEFAULT_BUILDER_SETTINGS, SiteBuilderSettings, SiteTheme } from "@/lib/site-themes";

function safeImageUrl(value?: string) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function radius(theme: SiteTheme) {
  return theme.radius === "pill" ? "999px" : theme.radius === "rounded" ? "1rem" : "0";
}

function cardStyle(theme: SiteTheme): React.CSSProperties {
  return {
    background: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: radius(theme),
    boxShadow: theme.shadowStyle === "bold" ? `5px 5px 0 ${theme.colors.text}` : theme.shadowStyle === "soft" ? "0 12px 32px rgba(15, 23, 42, .08)" : "none"
  };
}

function headingClass(theme: SiteTheme) {
  return theme.headingStyle === "compact" ? "font-bold tracking-tight"
    : theme.headingStyle === "editorial" ? "font-serif font-normal"
    : "font-bold tracking-tight";
}

function headingFont(theme: SiteTheme): React.CSSProperties {
  return { fontFamily: theme.fonts.heading };
}

function sectionSpacing(block: PageBlock, theme: SiteTheme) {
  const spacing = block.settings?.spacing || theme.spacing;
  return spacing === "compact" ? "py-6 md:py-8" : spacing === "spacious" ? "py-16 md:py-24" : "py-10 md:py-14";
}

function sectionStyle(block: PageBlock, theme: SiteTheme): React.CSSProperties {
  const background = block.settings?.background;
  const style: React.CSSProperties = {};
  if (background?.kind === "solid" && background.value) style.background = background.value;
  if (background?.kind === "gradient" && background.value) style.background = background.value;
  if (background?.kind === "image" && safeImageUrl(background.value)) {
    style.backgroundImage = `linear-gradient(rgba(0,0,0,.45), rgba(0,0,0,.45)), url("${background.value}")`;
    style.backgroundSize = "cover";
    style.backgroundPosition = "center";
    style.color = "#ffffff";
  }
  return style;
}

function safeVariant(type: PageBlock["type"], variant?: string) {
  const variants: Record<PageBlock["type"], string[]> = {
    hero: ["centered", "split", "split-reversed", "full-image", "minimal"],
    text: ["standard"],
    image: ["standard"],
    features: ["2-column", "3-column", "4-column", "list", "alternating"],
    gallery: ["grid", "masonry", "carousel"],
    registration: ["standard"],
    pricing: ["1-card", "2-cards", "3-cards", "horizontal", "stacked"],
    testimonials: ["cards", "quotes", "featured"],
    faq: ["list", "two-column", "accordion"],
    cta: ["standard"],
    footer: ["simple", "multi-column"]
  };
  return variants[type].includes(variant || "") ? variant! : variants[type][0];
}

export default function PageRenderer({
  title,
  content,
  blocks,
  builderData,
  themeColor,
  plans,
  slug,
  room,
  preview = false
}: {
  title: string;
  content: string;
  blocks: PageBlock[];
  builderData?: SiteBuilderSettings;
  themeColor: string;
  plans: Plan[];
  slug: string;
  room?: string;
  preview?: boolean;
}) {
  const settings = builderData || { ...DEFAULT_BUILDER_SETTINGS, theme: { ...DEFAULT_BUILDER_SETTINGS.theme, colors: { ...DEFAULT_BUILDER_SETTINGS.theme.colors, primary: themeColor } } };
  const theme = settings.theme;
  const visibleBlocks = blocks.filter((block) => !block.hidden);
  const primaryActionTarget = visibleBlocks.some((block) => block.type === "registration") ? "#registration" : "#";
  const pageMaxWidth = settings.pageWidth === "full" ? "100%" : settings.pageWidth === "wide" ? "1440px" : "1120px";
  const css = {
    background: theme.colors.background,
    color: theme.colors.text,
    fontFamily: theme.fonts.body,
    "--site-primary": theme.colors.primary,
    "--site-accent": theme.colors.accent
  } as React.CSSProperties;

  return (
    <div className="min-h-full" style={css}>
      {settings.headerStyle !== "minimal" && (
        <header className={`${settings.stickyNavigation ? "sticky top-0 z-20" : ""} border-b px-6 py-4`} style={{ background: theme.colors.surface, borderColor: theme.colors.border }}>
          <div className="mx-auto flex max-w-7xl items-center justify-between" style={{ maxWidth: pageMaxWidth, flexDirection: settings.headerStyle === "logo-center" ? "column" : "row" }}>
            <a href="#" className={`${headingClass(theme)} text-lg`} style={{ color: theme.colors.primary, ...headingFont(theme) }}>{title || "Your workspace"}</a>
            <nav className="flex flex-wrap gap-4 text-sm" aria-label="Page navigation">
              {visibleBlocks.filter((block) => ["registration", "pricing", "features", "faq"].includes(block.type)).slice(0, 4).map((block) => (
                <a key={block.id} href={`#${block.type === "registration" ? "registration" : block.id}`} style={{ color: theme.colors.muted }}>
                  {block.type === "registration" ? "Register" : block.type === "features" ? "Features" : block.type === "faq" ? "FAQ" : "Pricing"}
                </a>
              ))}
            </nav>
          </div>
        </header>
      )}
      <main className="mx-auto w-full" style={{ maxWidth: pageMaxWidth }}>
        {visibleBlocks.map((block) => {
          const variant = safeVariant(block.type, block.variant);
          const settings = block.settings || {};
          const align = settings.alignment || "left";
          const width = settings.contentWidth === "narrow" ? "720px" : settings.contentWidth === "wide" ? "1280px" : settings.contentWidth === "full" ? "100%" : pageMaxWidth;
          const common = {
            background: theme.colors.background,
            color: theme.colors.text,
            ...sectionStyle(block, theme)
          } as React.CSSProperties;
          const inner = { maxWidth: width, textAlign: align as React.CSSProperties["textAlign"] };
          const card = cardStyle(theme);
          const button = {
            background: theme.buttonStyle === "outline" ? "transparent" : theme.buttonStyle === "soft" ? `${theme.colors.primary}18` : theme.colors.primary,
            color: theme.buttonStyle === "outline" || theme.buttonStyle === "soft" ? theme.colors.primary : theme.mode === "dark" ? theme.colors.background : "#ffffff",
            border: theme.buttonStyle === "outline" ? `1px solid ${theme.colors.primary}` : "1px solid transparent",
            borderRadius: radius(theme)
          } as React.CSSProperties;
          switch (block.type) {
            case "hero": {
              const image = block.items?.[0];
              const split = variant === "split" || variant === "split-reversed";
              const fullImage = variant === "full-image";
              const hasHeroBackground = fullImage && safeImageUrl(image);
              const heroInner = { ...inner, textAlign: variant === "centered" ? "center" as const : inner.textAlign };
              return (
                <section key={block.id} id={block.id} className={`${sectionSpacing(block, theme)} px-6 ${hasHeroBackground ? "text-white" : ""}`} style={{ ...common, ...(hasHeroBackground ? { backgroundImage: `linear-gradient(rgba(0,0,0,.5),rgba(0,0,0,.5)),url("${image}")`, backgroundSize: "cover", backgroundPosition: "center", color: "#ffffff" } : {}) }}>
                  <div className={`mx-auto grid grid-cols-1 items-center gap-8 ${split ? "md:grid-cols-2" : ""}`} style={heroInner}>
                    <div className={`${variant === "centered" || variant === "minimal" ? "mx-auto max-w-3xl" : ""} ${variant === "split-reversed" ? "md:order-last" : ""}`}>
                      <h1 className={`${headingClass(theme)} mb-5 text-4xl leading-tight md:text-6xl`} style={headingFont(theme)}>{block.content || title}</h1>
                      <p className="text-base leading-7 opacity-80 md:text-xl">{content}</p>
                      {block.items?.[1] && <a href={primaryActionTarget} className="mt-7 inline-block px-6 py-3 font-semibold" style={button}>{block.items[1]}</a>}
                      {fullImage && !safeImageUrl(image) && preview && <p className="mt-4 text-sm opacity-70">Add a background image in section settings.</p>}
                    </div>
                    {split && (safeImageUrl(image) ? <img src={image} alt="" className={`w-full object-cover ${settings.mobileStack === "image-below" ? "order-last" : "order-first"} ${variant === "split-reversed" ? "md:order-first" : "md:order-last"}`} style={{ maxHeight: 480, borderRadius: radius(theme) }} /> : <div className={`flex min-h-56 items-center justify-center border border-dashed p-6 text-sm opacity-70 ${variant === "split-reversed" ? "md:order-first" : "md:order-last"}`} style={{ borderColor: theme.colors.border }}>Add an image URL in this section&apos;s settings.</div>)}
                  </div>
                </section>
              );
            }
            case "text":
              return <section key={block.id} id={block.id} className={`${sectionSpacing(block, theme)} px-6`} style={common}><div className="mx-auto text-base leading-8 md:text-lg" style={inner}>{block.content || content}</div></section>;
            case "image":
              return safeImageUrl(block.content) ? <section key={block.id} id={block.id} className={`${sectionSpacing(block, theme)} px-6`} style={common}><img src={block.content} alt="" className="mx-auto max-h-[600px] w-full object-cover" style={{ maxWidth: width, borderRadius: radius(theme) }} /></section> : null;
            case "features": {
              const cols = variant === "2-column" ? 2 : variant === "4-column" ? 4 : variant === "list" ? 1 : Number(settings.columnCount) || 3;
              const gridClass = variant === "list" ? "grid-cols-1" : cols === 2 ? "grid-cols-1 sm:grid-cols-2" : cols === 4 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3";
              return <section key={block.id} id={block.id} className={`${sectionSpacing(block, theme)} px-6`} style={common}><div className="mx-auto" style={inner}>{block.content && <h2 className={`${headingClass(theme)} mb-8 text-3xl`} style={headingFont(theme)}>{block.content}</h2>}<div className={variant === "alternating" ? "space-y-3" : `grid ${gridClass} gap-4`}>{(block.items || []).filter(Boolean).map((item, index) => {
                const [imageUrl, rowText] = variant === "alternating" && item.includes("|") ? item.split("|", 2) : ["", item];
                return <div key={`${block.id}-${index}`} className={`border p-5 leading-7 ${variant === "alternating" ? "grid grid-cols-1 items-center gap-4 md:grid-cols-2" : ""}`} style={{ ...card, ...(variant === "alternating" ? { gridColumn: "1 / -1", textAlign: index % 2 ? "right" : "left" } : {}) }}>{safeImageUrl(imageUrl) && <img src={imageUrl} alt="" className={`h-48 w-full object-cover ${index % 2 ? "md:order-last" : ""}`} style={{ borderRadius: radius(theme) }} />}<span>{rowText}</span></div>;
              })}</div>{!(block.items || []).length && <p className="text-sm opacity-70">Add items to this section in the editor.</p>}</div></section>;
            }
            case "gallery":
              return <section key={block.id} id={block.id} className={`${sectionSpacing(block, theme)} px-6`} style={common}><div className={`mx-auto ${variant === "carousel" ? "flex snap-x gap-3 overflow-x-auto" : variant === "masonry" ? "columns-1 gap-3 sm:columns-2 md:columns-3" : "grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3"}`} style={inner}>{(block.items || []).filter(safeImageUrl).map((src, index) => <img key={`${block.id}-${index}`} src={src} alt="" className={`h-56 object-cover ${variant === "carousel" ? "w-4/5 shrink-0 snap-center sm:w-1/2" : variant === "masonry" ? "mb-3 w-full break-inside-avoid" : "w-full"}`} style={{ borderRadius: radius(theme) }} />)}{!(block.items || []).some(safeImageUrl) && <p className="col-span-full border border-dashed p-8 text-center text-sm opacity-70" style={{ borderColor: theme.colors.border }}>Add image URLs to build your gallery.</p>}</div></section>;
            case "registration":
              return <section key={block.id} id="registration" className={`${sectionSpacing(block, theme)} px-6`} style={common}><div className="mx-auto border p-6 md:p-8" style={{ ...inner, ...card }}><h2 className={`${headingClass(theme)} text-2xl`} style={headingFont(theme)}>{block.content || "Register"}</h2><p className="mb-5 mt-2 text-sm" style={{ color: theme.colors.muted }}>Complete the form to submit your registration.</p>{preview ? <div className="space-y-2"><input disabled placeholder="Your name" className="w-full border p-3" style={card} /><input disabled placeholder="Email address" className="w-full border p-3" style={card} /><button disabled className="w-full p-3 font-semibold" style={button}>Register</button></div> : <RegistrationForm slug={slug} jitsiRoom={room} theme={theme} />}</div></section>;
            case "pricing": {
              const count = variant === "1-card" || variant === "horizontal" ? 1 : variant === "2-cards" ? 2 : 3;
              const columns = count === 1 || variant === "stacked" ? "grid-cols-1" : count === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
              const primaryPlan = plans.find((item) => item.id === block.target_id);
              const sortedPlans = primaryPlan ? [primaryPlan, ...plans.filter((item) => item.id !== primaryPlan.id)] : plans;
              return <section key={block.id} id={block.id} className={`${sectionSpacing(block, theme)} px-6`} style={common}><div className={`mx-auto grid ${columns} gap-4`} style={inner}>{Array.from({ length: count }, (_, index) => {
                const plan = sortedPlans[index];
                return <article key={index} className={`border p-7 ${variant === "horizontal" ? "flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center" : ""}`} style={{ ...card, textAlign: align }}><h2 className={`${headingClass(theme)} text-2xl`} style={headingFont(theme)}>{plan?.name || block.content || "Pricing"}</h2>{plan && <><p className="my-3 text-3xl font-bold" style={{ color: theme.colors.primary }}>{(plan.price_cents / 100).toLocaleString(undefined, { style: "currency", currency: "USD" })}<span className="text-sm font-normal"> / {plan.interval.replace("_", " ")}</span></p><p className="text-sm" style={{ color: theme.colors.muted }}>{plan.description}</p></>}</article>;
              })}</div></section>;
            }
            case "testimonials":
              return <section key={block.id} id={block.id} className={`${sectionSpacing(block, theme)} px-6`} style={common}><div className="mx-auto" style={inner}>{block.content && <h2 className={`${headingClass(theme)} mb-6 text-3xl`} style={headingFont(theme)}>{block.content}</h2>}<div className={variant === "featured" ? "grid gap-4 md:grid-cols-2" : variant === "quotes" ? "space-y-6" : "grid gap-4 md:grid-cols-2"}>{(block.items || []).filter(Boolean).map((item, index) => <blockquote key={`${block.id}-${index}`} className={`${variant === "quotes" ? "border-l-4 py-2 pl-5 text-xl italic" : "border p-6 text-lg leading-8"} ${variant === "featured" && index === 0 ? "md:col-span-2 md:text-2xl" : ""}`} style={variant === "quotes" ? { borderColor: theme.colors.accent } : card}>“{item}”</blockquote>)}{!(block.items || []).length && <p className="text-sm opacity-70">Add testimonial text in the editor.</p>}</div></div></section>;
            case "faq":
              return <section key={block.id} id={block.id} className={`${sectionSpacing(block, theme)} px-6`} style={common}><div className="mx-auto" style={inner}>{block.content && <h2 className={`${headingClass(theme)} mb-5 text-3xl`} style={headingFont(theme)}>{block.content}</h2>}<div className={`${variant === "two-column" ? "grid grid-cols-1 gap-3 md:grid-cols-2" : "space-y-3"}`}>{(block.items || []).filter(Boolean).map((item, index) => <details key={`${block.id}-${index}`} className="border p-4" style={card}><summary className="cursor-pointer font-semibold">{item.split("|")[0]}</summary><p className="mt-3 text-sm leading-6 opacity-80">{item.split("|").slice(1).join("|") || "Add an answer after a | separator in the editor."}</p></details>)}</div></div></section>;
            case "cta":
              return <section key={block.id} id={block.id} className={`${sectionSpacing(block, theme)} px-6`} style={{ ...common, textAlign: "center" }}><a href={primaryActionTarget} className="inline-block px-7 py-3 font-semibold" style={button}>{block.content || "Learn more"}</a></section>;
            case "footer":
              return <footer key={block.id} id={block.id} className="border-t px-6 py-8 text-sm" style={{ ...common, borderColor: theme.colors.border, textAlign: align }}><div className="mx-auto" style={inner}>{block.content || title}{variant === "multi-column" && <div className="mt-4 grid gap-3 md:grid-cols-3">{(block.items || []).filter(Boolean).map((item, index) => <span key={index}>{item}</span>)}</div>}</div></footer>;
          }
        })}
      </main>
      {!visibleBlocks.length && preview && <p className="p-8 text-center text-sm opacity-60">No visible sections. Add or show a section to preview the page.</p>}
    </div>
  );
}
