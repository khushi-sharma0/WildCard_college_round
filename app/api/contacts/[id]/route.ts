import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorize, getRole, isUnauthenticatedError } from "@/lib/auth";
import { updateContact } from "@/lib/services";

const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
  status: z.enum(["lead", "qualified", "customer", "lost"])
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const role = await getRole();
    if (!(await authorize(role, "contact_write", "update_contact"))) {
      return NextResponse.json({ error: "Read-only access." }, { status: 403 });
    }
    const parsed = contactSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid contact details." }, { status: 400 });
    }
    return NextResponse.json(await updateContact(params.id, parsed.data, role));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update contact.";
    return NextResponse.json({ error: message }, {
      status: isUnauthenticatedError(error) ? 401 : message.includes("not found") ? 404 : 400
    });
  }
}
