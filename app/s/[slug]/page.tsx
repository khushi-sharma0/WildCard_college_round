import { listPages, listPlans, listWebinars, PageBlock, trackPageEvent } from "@/lib/services";
import { DEFAULT_BUILDER_SETTINGS } from "@/lib/site-themes";
import PageRenderer from "@/components/sites/page-renderer";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

function legacyBlocks(title: string, content: string): PageBlock[] {
  return [
    { id: "legacy-hero", type: "hero", content: title },
    { id: "legacy-text", type: "text", content },
    { id: "legacy-registration", type: "registration", content: "Reserve your place" }
  ];
}

export async function generateMetadata({ params }: { params: { slug: string } | Promise<{ slug: string }> }) {
  const resolved = await Promise.resolve(params);
  const slug = resolved?.slug;
  const page = (await listPages()).find((item) => item.slug === slug && item.is_published);
  return {
    title: page ? `${page.title} | Nexus` : "Landing Page",
    description: page?.content?.substring(0, 160) || "Explore this page."
  };
}

export default async function PublicLandingPage({ params }: { params: { slug: string } | Promise<{ slug: string }> }) {
  const resolved = await Promise.resolve(params);
  const slug = resolved?.slug;
  const [pages, webinars, plans] = await Promise.all([listPages(), listWebinars(), listPlans()]);
  const page = pages.find((item) => item.slug === slug && item.is_published);
  if (!page) notFound();

  await trackPageEvent("page_view", { page_id: page.id, slug: page.slug });
  const webinar = webinars.find((item) => item.id === page.linked_webinar_id)
    || webinars.find((item) => item.landing_page_id === page.id);
  const blocks = Array.isArray(page.gjs_data) ? page.gjs_data : legacyBlocks(page.title, page.content);
  const themeColor = /^#[0-9a-fA-F]{6}$/.test(page.theme_color || "") ? page.theme_color! : DEFAULT_BUILDER_SETTINGS.theme.colors.primary;

  return (
    <PageRenderer
      title={page.title}
      content={page.content}
      blocks={blocks}
      builderData={page.builder_data || undefined}
      themeColor={themeColor}
      plans={plans}
      slug={page.slug}
      room={webinar?.jitsi_room}
    />
  );
}
