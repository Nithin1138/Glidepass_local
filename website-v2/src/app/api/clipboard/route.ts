import { NextRequest, NextResponse } from "next/server";
import { 
  createClipboardRoom, 
  getClipboardRoom, 
  addClipboardItem, 
  getClipboardItems 
} from "@/lib/db";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// Helper to generate a unique room code
function generateRoomCode(): string {
  // Generate 6 uppercase alphanumeric characters
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude confusing chars like I, O, 1, 0
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code") || "";
    
    if (!code) {
      return NextResponse.json({ success: false, error: "Room code is required" }, { status: 400 });
    }

    const room = await getClipboardRoom(code.toUpperCase());
    if (!room) {
      return NextResponse.json({ success: false, error: "Room not found or expired" }, { status: 404 });
    }

    const items = await getClipboardItems(code.toUpperCase());
    return NextResponse.json({ success: true, room, items });
  } catch (error: any) {
    console.error("GET Clipboard API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      const { durationMins, allowAllMembersToAdd, hostSessionId } = body;
      
      if (!durationMins || !hostSessionId) {
        return NextResponse.json({ success: false, error: "durationMins and hostSessionId are required" }, { status: 400 });
      }

      // Generate a code and ensure it's not already in use
      let code = generateRoomCode();
      let exists = await getClipboardRoom(code);
      let attempts = 0;
      while (exists && attempts < 10) {
        code = generateRoomCode();
        exists = await getClipboardRoom(code);
        attempts++;
      }

      const expiresAt = new Date(Date.now() + durationMins * 60 * 1000).toISOString();

      await createClipboardRoom({
        code,
        expiresAt,
        durationMins,
        allowAllMembersToAdd: !!allowAllMembersToAdd,
        hostSessionId
      });

      return NextResponse.json({ success: true, code, expiresAt });
    }

    if (action === "add-item") {
      const { roomCode, title, content, sessionId } = body;

      if (!roomCode || !title || !content || !sessionId) {
        return NextResponse.json({ success: false, error: "roomCode, title, content, and sessionId are required" }, { status: 400 });
      }

      const room = await getClipboardRoom(roomCode.toUpperCase());
      if (!room) {
        return NextResponse.json({ success: false, error: "Room not found or expired" }, { status: 404 });
      }

      // Verify write permissions
      if (!room.allowAllMembersToAdd && room.hostSessionId !== sessionId) {
        return NextResponse.json({ success: false, error: "Only the room host can add items" }, { status: 403 });
      }

      const itemId = crypto.randomUUID();
      const newItem = {
        id: itemId,
        roomCode: roomCode.toUpperCase(),
        title,
        content
      };

      await addClipboardItem(newItem);

      return NextResponse.json({ success: true, item: newItem });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("POST Clipboard API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
