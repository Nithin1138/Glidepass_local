import { NextRequest, NextResponse } from "next/server";
import { getFeatureFlags, saveFeatureFlags } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const flags = await getFeatureFlags();
    return NextResponse.json({ success: true, flags });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const flags = await getFeatureFlags();
    
    // Merge updates
    const updatedFlags = { ...flags, ...body };
    await saveFeatureFlags(updatedFlags);

    return NextResponse.json({ success: true, flags: updatedFlags });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
