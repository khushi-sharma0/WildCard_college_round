import { NextRequest, NextResponse } from "next/server";
import { createWorkspace } from "@/lib/services";

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    const ws = await createWorkspace(name);
    return NextResponse.json(ws);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
