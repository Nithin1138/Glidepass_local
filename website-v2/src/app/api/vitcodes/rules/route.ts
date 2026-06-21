import { NextRequest, NextResponse } from "next/server";
import { readRules, writeRule, logAudit } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rules = await readRules();
    return new NextResponse(
      JSON.stringify({
        rules: rules.rules,
        sessionLimits: rules.sessionLimits,
        examYears: rules.examYears,
        collectionYears: rules.examYears
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        }
      }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { examType, rule, sessionLimit, year } = await request.json();
    if (!examType) {
      return NextResponse.json({ error: "Exam type required" }, { status: 400 });
    }
    if (rule === undefined && sessionLimit === undefined && year === undefined) {
      return NextResponse.json({ error: "Rule, Session Limit or Year value required" }, { status: 400 });
    }

    await writeRule(examType, rule, sessionLimit, year);
    if (examType.startsWith("PINNED_COLLECTION_")) {
      const fallback = examType.replace("PINNED_COLLECTION_", "ACTIVE_PINNED_EXAM_");
      await writeRule(fallback, rule, sessionLimit, year);
    } else if (examType.startsWith("ACTIVE_PINNED_EXAM_")) {
      const fallback = examType.replace("ACTIVE_PINNED_EXAM_", "PINNED_COLLECTION_");
      await writeRule(fallback, rule, sessionLimit, year);
    }

    await logAudit(`Exam Settings Modified for ${examType}: limit=${sessionLimit}, year=${year}`, "Nithin", "127.0.0.1", "success");
    return NextResponse.json({ success: true, message: "Settings saved successfully" });
  } catch (error: any) {
    await logAudit("Failed Exam Settings Modification", "Nithin", "127.0.0.1", "failed");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
