import { NextRequest, NextResponse } from "next/server";
import { draftCampaign, listCampaigns } from "@/lib/services";
import { getRole } from "@/lib/auth";

export async function GET() {
  const campaigns = await listCampaigns();
  return NextResponse.json({ campaigns });
}

export async function POST(req: NextRequest) {
  try {
    const role = await getRole();
    if (role === "viewer") {
      return NextResponse.json(
        { error: "Policy Blocked: Viewer role cannot draft marketing campaigns." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { segment_id, subject, body: emailBody, send_time } = body;

    if (!subject || !emailBody) {
      return NextResponse.json(
        { error: "Subject and email body are required." },
        { status: 400 }
      );
    }

    const campaign = await draftCampaign(segment_id, subject, emailBody, send_time);
    return NextResponse.json(campaign);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
