import { NextRequest, NextResponse } from "next/server";
import { restoreSession, restoreQuestion } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { type, id } = await request.json();
    if (!type || !id) {
      return NextResponse.json({ error: "Type ('session' | 'question') and ID are required" }, { status: 400 });
    }

    if (type === "session") {
      await restoreSession(id);
    } else if (type === "question") {
      await restoreQuestion(id);
    } else {
      return NextResponse.json({ error: "Invalid type. Must be 'session' or 'question'" }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: `${type === 'session' ? 'Session' : 'Question'} restored successfully` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
