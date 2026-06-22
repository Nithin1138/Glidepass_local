import { NextRequest, NextResponse } from "next/server";
import { createReport, getReports, resolveReport } from "@/lib/db";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { target_type, target_id, reason, details, reporter_contact } = body;

    if (!target_type || !target_id || !reason) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const reportId = crypto.randomUUID();

    await createReport({
      id: reportId,
      target_type,
      target_id,
      reason,
      details: details || "",
      reporter_contact: reporter_contact || "",
      reporter_ip: ip
    });

    return NextResponse.json({ success: true, report_id: reportId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const reports = await getReports();
    return NextResponse.json({ success: true, reports });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
    }

    await resolveReport(id, status);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
