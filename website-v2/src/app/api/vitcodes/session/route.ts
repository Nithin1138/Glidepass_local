import { NextRequest, NextResponse } from "next/server";
import { createSession, deleteSession, permanentlyDeleteSession, logAudit } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await request.json();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Invalid session data" }, { status: 400 });
    }

    await createSession(session);
    await logAudit(`Session Created: ${session.id}`, "Nithin", "127.0.0.1", "success");
    return NextResponse.json({ success: true, message: "Session created successfully" });
  } catch (error: any) {
    await logAudit("Failed Session Creation", "Nithin", "127.0.0.1", "failed");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const permanent = searchParams.get("permanent") === "true";
    if (!id) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    if (permanent) {
      await permanentlyDeleteSession(id);
    } else {
      await deleteSession(id);
    }
    await logAudit(`${permanent ? 'Permanently Deleted' : 'Binned'} Session ID: ${id}`, "Nithin", "127.0.0.1", "warning");
    return NextResponse.json({ success: true, message: permanent ? "Session permanently deleted successfully" : "Session moved to bin successfully" });
  } catch (error: any) {
    await logAudit("Failed Session Deletion", "Nithin", "127.0.0.1", "failed");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
