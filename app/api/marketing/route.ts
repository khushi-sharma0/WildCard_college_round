import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { draftCampaign, listCampaigns } from "@/lib/services";
import { authorize, getRole, isUnauthenticatedError } from "@/lib/auth";

const campaignSchema = z.object({
  segment_id: z.string().optional(),
  subject: z.string().trim().min(3, "Subject must be at least 3 characters").max(200),
  body: z.string().trim().min(20, "Email body must be at least 20 characters").max(10000),
});

export async function GET() {
  try {
    await getRole();
    const campaigns = await listCampaigns();
    return NextResponse.json({ campaigns });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load campaigns.";
    return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = await getRole();
    if (!(await authorize(role, "campaign_write", "draft_campaign"))) {
      return NextResponse.json(
        { error: "Policy Blocked: Viewer role cannot draft marketing campaigns." },
        { status: 403 }
      );
    }

    const parsed = campaignSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid campaign details." },
        { status: 400 }
      );
    }

    const { segment_id, subject, body: emailBody } = parsed.data;
    const campaign = await draftCampaign(segment_id || "", subject, emailBody);
    return NextResponse.json(campaign);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: isUnauthenticatedError(error) ? 401 : 500 });
  }
}
