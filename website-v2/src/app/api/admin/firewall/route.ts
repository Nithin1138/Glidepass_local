import { NextRequest, NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const raw = await getSetting("firewall_blocked_ips", "[]");
    const blocked = JSON.parse(raw);
    return NextResponse.json({ success: true, blocked });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ip, reason } = body;
    if (!ip || !reason) {
      return NextResponse.json({ error: "Missing ip or reason" }, { status: 400 });
    }
    const raw = await getSetting("firewall_blocked_ips", "[]");
    const blocked = JSON.parse(raw);
    
    // Add or update
    const existingIndex = blocked.findIndex((b: any) => b.ip === ip);
    if (existingIndex > -1) {
      blocked[existingIndex] = {
        ...blocked[existingIndex],
        reason,
        blockedAt: new Date().toLocaleString(),
        attempts: (blocked[existingIndex].attempts || 0) + 1
      };
    } else {
      blocked.push({
        ip,
        reason,
        blockedAt: new Date().toLocaleString(),
        attempts: 1
      });
    }
    
    await setSetting("firewall_blocked_ips", JSON.stringify(blocked));
    return NextResponse.json({ success: true, blocked });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ip = searchParams.get("ip");
    if (!ip) {
      return NextResponse.json({ error: "Missing ip" }, { status: 400 });
    }
    const raw = await getSetting("firewall_blocked_ips", "[]");
    let blocked = JSON.parse(raw);
    blocked = blocked.filter((b: any) => b.ip !== ip);
    await setSetting("firewall_blocked_ips", JSON.stringify(blocked));
    return NextResponse.json({ success: true, blocked });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
