import { NextRequest, NextResponse } from "next/server";
import { readRules, writeRule } from "@/lib/db";

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
    return NextResponse.json({ success: true, message: "Settings saved successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
