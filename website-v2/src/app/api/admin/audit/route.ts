import { NextRequest, NextResponse } from "next/server";
import { logAudit, getAuditLogs } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const logs = await getAuditLogs();
    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, username, ip, status } = body;
    if (!event || !username || !ip || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    await logAudit(event, username, ip, status);
    return NextResponse.json({ success: true, message: "Audit event logged successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
