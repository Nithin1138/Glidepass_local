import { NextRequest, NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const raw = await getSetting("email_delivery_logs", "[]");
    const logs = JSON.parse(raw);
    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { recipient, type, status } = body;
    if (!recipient || !type) {
      return NextResponse.json({ error: "Missing recipient or type" }, { status: 400 });
    }
    const raw = await getSetting("email_delivery_logs", "[]");
    const logs = JSON.parse(raw);
    const newLog = {
      id: String(Date.now()),
      recipient,
      type,
      status: status || "delivered",
      sentAt: new Date().toLocaleTimeString()
    };
    logs.unshift(newLog);
    const trimmed = logs.slice(0, 100);
    await setSetting("email_delivery_logs", JSON.stringify(trimmed));
    return NextResponse.json({ success: true, logs: trimmed });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
