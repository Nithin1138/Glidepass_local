import { NextRequest, NextResponse } from "next/server";
import { readRules, writeRule, logAudit } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rules = await readRules();
    return NextResponse.json(rules);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { examType, rule, sessionLimit } = await request.json();
    if (!examType) {
      return NextResponse.json({ error: "Exam type required" }, { status: 400 });
    }
    if (rule === undefined && sessionLimit === undefined) {
      return NextResponse.json({ error: "Rule or Session Limit value required" }, { status: 400 });
    }

    await writeRule(examType, rule, sessionLimit);
    await logAudit(`Exam Settings Modified for ${examType}: limit=${sessionLimit}`, "Nithin", "127.0.0.1", "success");
    return NextResponse.json({ success: true, message: "Settings saved successfully" });
  } catch (error: any) {
    await logAudit("Failed Exam Settings Modification", "Nithin", "127.0.0.1", "failed");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
