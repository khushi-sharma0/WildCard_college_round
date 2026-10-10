import { NextRequest, NextResponse } from "next/server";
import { resolveApprovalRequest } from "@/lib/services";
import { getRole } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const role = await getRole();
    if (role !== "admin") {
      return NextResponse.json({ error: "Only admins can resolve approval requests." }, { status: 403 });
    }

    const { requestId, status } = await req.json();
    if (!requestId || !status) {
      return NextResponse.json({ error: "Missing requestId or status" }, { status: 400 });
    }

    const result = await resolveApprovalRequest(requestId, status, role + "@nexus.internal");
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
