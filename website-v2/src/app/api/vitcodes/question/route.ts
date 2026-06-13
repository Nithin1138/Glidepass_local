import { NextRequest, NextResponse } from "next/server";
import { createQuestion, deleteQuestion, updateQuestion, createSession } from "@/lib/db";

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
    return NextResponse.json({ success: true, message: "Question created successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const question = await request.json();
    if (!question || !question.id) {
      return NextResponse.json({ error: "Invalid question data" }, { status: 400 });
    }

    await updateQuestion(question);
    return NextResponse.json({ success: true, message: "Question updated successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Question ID required" }, { status: 400 });
    }

    await deleteQuestion(id);
    return NextResponse.json({ success: true, message: "Question deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
