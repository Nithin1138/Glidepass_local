import { NextRequest, NextResponse } from "next/server";
import { createQuestion, deleteQuestion, updateQuestion, createSession, permanentlyDeleteQuestion, logAudit } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, question, session } = await request.json();
    if (!sessionId || !question || !question.id) {
      return NextResponse.json({ error: "Invalid question data" }, { status: 400 });
    }

    if (session) {
      // Ensure the session exists in DB before adding question
      await createSession(session);
    }

    await createQuestion(sessionId, question);
    await logAudit("Question Created: " + question.title, "Nithin", "127.0.0.1", "success");
    return NextResponse.json({ success: true, message: "Question created successfully" });
  } catch (error: any) {
    await logAudit("Failed Question Creation", "Nithin", "127.0.0.1", "failed");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const question = body.question || body;
    const editorEmail = body.editorEmail || null;
    if (!question || !question.id) {
      return NextResponse.json({ error: "Invalid question data" }, { status: 400 });
    }

    await updateQuestion(question, editorEmail);
    await logAudit("Question Updated: " + question.title, editorEmail || "Nithin", "127.0.0.1", "success");
    return NextResponse.json({ success: true, message: "Question updated successfully" });
  } catch (error: any) {
    await logAudit("Failed Question Update", "Nithin", "127.0.0.1", "failed");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const permanent = searchParams.get("permanent") === "true";
    if (!id) {
      return NextResponse.json({ error: "Question ID required" }, { status: 400 });
    }

    if (permanent) {
      await permanentlyDeleteQuestion(id);
    } else {
      await deleteQuestion(id);
    }
    await logAudit((permanent ? "Permanently Deleted" : "Binned") + " Question ID: " + id, "Nithin", "127.0.0.1", "warning");
    return NextResponse.json({ success: true, message: permanent ? "Question permanently deleted successfully" : "Question moved to bin successfully" });
  } catch (error: any) {
    await logAudit("Failed Question Deletion: " + (request.url || ""), "Nithin", "127.0.0.1", "failed");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, isLocked } = await request.json();
    if (!id || typeof isLocked !== "boolean") {
      return NextResponse.json({ error: "Invalid lock data" }, { status: 400 });
    }
    const { updateQuestionLock } = await import("@/lib/db");
    await updateQuestionLock(id, isLocked);
    await logAudit(`Question ${isLocked ? 'Locked' : 'Unlocked'} ID: ` + id, "Nithin", "127.0.0.1", "success");
    return NextResponse.json({ success: true, message: `Question ${isLocked ? 'locked' : 'unlocked'} successfully` });
  } catch (error: any) {
    await logAudit("Failed Question Lock State Toggle", "Nithin", "127.0.0.1", "failed");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
