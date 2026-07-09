import { NextRequest, NextResponse } from "next/server";
import { getTelemetryMetrics, clearTelemetryData } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { heartbeats } = await getTelemetryMetrics();
    // Sort heartbeats by timestamp descending
    const sorted = [...heartbeats].sort((a: any, b: any) => {
      const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return tB - tA;
    });
    return NextResponse.json({ success: true, heartbeats: sorted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await clearTelemetryData();
    return NextResponse.json({ success: true, message: "Telemetry and pairing logs cleared." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
