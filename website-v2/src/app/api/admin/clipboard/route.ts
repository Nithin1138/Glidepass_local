import { NextRequest, NextResponse } from "next/server";
import { getAllClipboardRooms, deleteClipboardRoom } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rooms = await getAllClipboardRooms();
    return NextResponse.json({ success: true, rooms });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code") || "";
    if (!code) {
      return NextResponse.json({ success: false, error: "Code is required" }, { status: 400 });
    }
    await deleteClipboardRoom(code);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
