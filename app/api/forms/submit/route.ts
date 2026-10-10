import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { submitForm } from "@/lib/services";

const submitSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Page slug is invalid"),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100)
    .regex(/^[A-Za-z0-9\u00C0-\u024F .,'&()-]+$/, "Name contains unsupported characters"),
  email: z.string().email("Valid email address is required"),
  tag: z.string().optional()
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parsed = submitSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    // Sanitize untrusted input (never execute as agent instruction)
    const sanitizedName = parsed.data.name.replace(/[<>]/g, "").trim();
    if (sanitizedName.length < 2) {
      return NextResponse.json({ error: "Name must contain at least 2 valid characters." }, { status: 400 });
    }
    const sanitizedEmail = parsed.data.email.trim().toLowerCase();
    const sanitizedSlug = parsed.data.slug.trim().toLowerCase();
    const sanitizedTag = parsed.data.tag?.replace(/[<>]/g, "").trim();

    const result = await submitForm({
      slug: sanitizedSlug,
      name: sanitizedName,
      email: sanitizedEmail,
      tag: sanitizedTag
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Form submit error:", error);
    const status = error.message?.includes("not found") ? 404
      : error.message?.includes("does not currently accept") ? 409
      : 500;
    return NextResponse.json(
      { error: error.message || "Failed to submit registration form" },
      { status }
    );
  }
}
