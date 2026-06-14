import { NextRequest, NextResponse } from "next/server";
import { restoreSession, restoreQuestion, logAudit } from "@/lib/db";

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

    await logAudit(`Restored ${type === 'session' ? 'Session' : 'Question'} ID: ${id}`, "Nithin", "127.0.0.1", "success");
    return NextResponse.json({ success: true, message: `${type === 'session' ? 'Session' : 'Question'} restored successfully` });
  } catch (error: any) {
    await logAudit("Failed Restore Operation", "Nithin", "127.0.0.1", "failed");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
