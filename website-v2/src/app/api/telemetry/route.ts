import { NextRequest, NextResponse } from "next/server";
import { logHeartbeat, logTelemetryEvent, getTelemetryMetrics } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, uuid, platform, app_version, event } = body;

    if (!uuid) {
      return NextResponse.json({ error: "uuid is required" }, { status: 400 });
    }

    if (type === "heartbeat") {
      if (!platform || !app_version) {
        return NextResponse.json({ error: "platform and app_version required for heartbeat" }, { status: 400 });
      }
      await logHeartbeat(uuid, platform, app_version);
      return NextResponse.json({ success: true, message: "Heartbeat logged" });
    } else if (type === "event") {
      if (!event) {
        return NextResponse.json({ error: "event is required for event log" }, { status: 400 });
      }
      await logTelemetryEvent(uuid, event);
      return NextResponse.json({ success: true, message: "Event logged" });
    }

    return NextResponse.json({ error: "Invalid type. Must be heartbeat or event" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const metrics = await getTelemetryMetrics();
    return NextResponse.json(metrics);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
