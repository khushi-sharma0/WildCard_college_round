import { NextRequest, NextResponse } from "next/server";
import {
  createApprovalRequest,
  listCampaigns,
  listContacts,
  listSegments,
  sendCampaign
} from "@/lib/services";
import { authorize, getRole, isUnauthenticatedError } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const role = await getRole();
    if (!(await authorize(role, "campaign_send", "send_campaign"))) {
      return NextResponse.json(
        { error: "Policy Blocked: Viewer role cannot dispatch email campaigns." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { campaign_id } = body;

    if (!campaign_id) {
      return NextResponse.json(
        { error: "campaign_id is required." },
        { status: 400 }
      );
    }

    if (role === "marketer") {
      const campaign = (await listCampaigns()).find((item) => item.id === campaign_id);
      if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
      const segment = (await listSegments()).find((item) => item.id === campaign.segment_id);
      const contacts = await listContacts();
      const recipientCount = segment
        ? contacts.filter((contact) => contact.tags.includes(segment.filter_tag)).length
        : contacts.length;
      const threshold = 10;
      if (recipientCount > threshold) {
        const approval = await createApprovalRequest(
          "send_campaign",
          { campaignId: campaign.id },
          role
        );
        return NextResponse.json(
          { pendingApproval: true, approval, note: `${recipientCount} recipients exceeds the ${threshold}-recipient approval threshold.` },
          { status: 202 }
        );
      }
    }

    const result = await sendCampaign(campaign_id);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: isUnauthenticatedError(error) ? 401 : 500 });
  }
}
