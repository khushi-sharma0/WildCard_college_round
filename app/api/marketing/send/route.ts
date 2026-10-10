import { NextRequest, NextResponse } from "next/server";
import { sendCampaign } from "@/lib/services";
import { getRole } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const role = await getRole();
    if (role === "viewer") {
      return NextResponse.json(
        { error: "Policy Blocked: Viewer role cannot dispatch email campaigns." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { campaign_id, simulated_recipients } = body;

    if (!campaign_id) {
      return NextResponse.json(
        { error: "campaign_id is required." },
        { status: 400 }
      );
    }

    const result = await sendCampaign(campaign_id, undefined, simulated_recipients, role);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
