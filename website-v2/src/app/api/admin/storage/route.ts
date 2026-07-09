import { NextRequest, NextResponse } from "next/server";
import { getClipboardStorageInfo, cleanupStaleChunks } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getClipboardStorageInfo();
    return NextResponse.json({ success: true, ...data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    await cleanupStaleChunks();
    const data = await getClipboardStorageInfo();
    return NextResponse.json({ success: true, ...data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
