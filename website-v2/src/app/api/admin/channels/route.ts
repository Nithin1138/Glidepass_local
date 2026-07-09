import { NextRequest, NextResponse } from "next/server";
import { getChannelVersions, saveChannelVersion } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getChannelVersions();
    return NextResponse.json({ success: true, channels: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, version } = body;
    if (!name || !version) {
      return NextResponse.json({ error: "Missing channel name or version" }, { status: 400 });
    }

    const currentChannels = await getChannelVersions();
    const updatedChannels = currentChannels.map(c => 
      c.name === name 
        ? { ...c, version, releaseDate: new Date().toISOString().split("T")[0] } 
        : c
    );

    await saveChannelVersion(updatedChannels);
    return NextResponse.json({ success: true, channels: updatedChannels });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
