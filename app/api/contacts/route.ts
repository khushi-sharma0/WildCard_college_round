import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorize, getRole, isUnauthenticatedError } from "@/lib/auth";
import { createContact, listContacts, WS } from "@/lib/services";

const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional()
});

export async function GET(req: NextRequest) {
  try {
    await getRole();
    const query = new URL(req.url).searchParams.get("search") || undefined;
    return NextResponse.json({ contacts: await listContacts(WS, query) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load contacts.";
    return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = await getRole();
    if (!(await authorize(role, "contact_write", "create_contact"))) {
      return NextResponse.json({ error: "Read-only access." }, { status: 403 });
    }
    const parsed = contactSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid contact details." }, { status: 400 });
    }
    const contact = await createContact(parsed.data, role);
    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create contact.";
    return NextResponse.json({ error: message }, {
      status: isUnauthenticatedError(error) ? 401 : message.includes("already exists") ? 409 : 500
    });
  }
}
