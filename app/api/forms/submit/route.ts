import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { submitForm } from "@/lib/services";

const submitSchema = z.object({
  slug: z.string().min(1, "Page slug is required"),
  name: z.string().min(1, "Name is required").max(100),
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
    return NextResponse.json(
      { error: error.message || "Failed to submit registration form" },
      { status: 500 }
    );
  }
}
