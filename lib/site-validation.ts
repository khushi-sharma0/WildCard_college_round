import { z } from "zod";

const themeSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(80),
  colors: z.object({
    background: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    surface: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    text: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    muted: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    border: z.string().regex(/^#[0-9a-fA-F]{6}$/)
  }),
  fonts: z.object({
    heading: z.string().max(100),
    body: z.string().max(100),
    label: z.string().max(100)
  }),
  headingStyle: z.enum(["classic", "modern", "editorial", "compact"]),
  radius: z.enum(["sharp", "rounded", "pill"]),
  buttonStyle: z.enum(["solid", "outline", "soft"]),
  shadowStyle: z.enum(["none", "soft", "bold"]),
  spacing: z.enum(["compact", "normal", "spacious"]),
  mode: z.enum(["light", "dark"])
});

export const builderDataSchema = z.object({
  theme: themeSchema,
  headerStyle: z.enum(["logo-left", "logo-center", "minimal"]),
  stickyNavigation: z.boolean(),
  pageWidth: z.enum(["standard", "wide", "full"])
});

export const pageBlockSchema = z.object({
  id: z.string().min(1).max(80),
  type: z.enum(["hero", "text", "image", "features", "gallery", "testimonials", "faq", "registration", "pricing", "cta", "footer"]),
  content: z.string().max(5000),
  items: z.array(z.string().max(1000)).max(20).optional(),
  target_id: z.string().max(100).optional(),
  variant: z.string().max(40).optional(),
  hidden: z.boolean().optional(),
  settings: z.object({
    alignment: z.enum(["left", "center", "right"]).optional(),
    contentWidth: z.enum(["narrow", "standard", "wide", "full"]).optional(),
    spacing: z.enum(["compact", "normal", "spacious"]).optional(),
    background: z.object({
      kind: z.enum(["solid", "gradient", "image"]),
      value: z.string().max(2048)
    }).optional(),
    columnCount: z.number().int().min(1).max(4).optional(),
    mobileStack: z.enum(["image-above", "image-below"]).optional()
  }).optional()
});

export const pageSchema = z.object({
  title: z.string().trim().min(10, "Headline must be at least 10 characters").max(120),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase words separated by hyphens"),
  content: z.string().trim().min(20, "Pitch must be at least 20 characters").max(5000),
  gjs_data: z.array(pageBlockSchema).max(30),
  builder_data: builderDataSchema.optional(),
  theme_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  linked_webinar_id: z.string().max(100).nullable(),
  is_published: z.boolean()
});

export const siteThemeSchema = themeSchema;
