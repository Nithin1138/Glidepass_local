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
    const { examType, rule } = await request.json();
    if (!examType || rule === undefined) {
      return NextResponse.json({ error: "Exam type and rule value required" }, { status: 400 });
    }

    await writeRule(examType, rule);
    return NextResponse.json({ success: true, message: "Rule saved successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
