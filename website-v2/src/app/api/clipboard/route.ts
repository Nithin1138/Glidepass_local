import { NextRequest, NextResponse } from "next/server";
import { 
  createClipboardRoom, 
  getClipboardRoom, 
  addClipboardItem, 
  getClipboardItems,
  deleteClipboardItem,
  touchActiveUser,
  getActiveUsersCount,
  updateRoomPermissions,
  updateRoomExpiration,
  updateClipboardItemTitle,
  updateClipboardItemContent,
  getClipboardItemById
} from "@/lib/db";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// Helper to generate a unique room code
function generateRoomCode(): string {
  // Generate 6 digit characters
  const chars = "0123456789";
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
    const sessionId = searchParams.get("sessionId") || "";
    
    if (!code) {
      return NextResponse.json({ success: false, error: "Room code is required" }, { status: 400 });
    }

    const room = await getClipboardRoom(code.toUpperCase());
    if (!room) {
      return NextResponse.json({ success: false, error: "Room not found or expired" }, { status: 404 });
    }

    if (sessionId) {
      await touchActiveUser(code, sessionId);
    }
    const activeUsersCount = await getActiveUsersCount(code);

    const items = await getClipboardItems(code.toUpperCase());
    return NextResponse.json({ success: true, room, items, activeUsersCount });
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
        content,
        creatorSessionId: sessionId
      };

      await addClipboardItem(newItem);

      return NextResponse.json({ success: true, item: newItem });
    }

    if (action === "delete-item") {
      const { itemId, roomCode, sessionId } = body;

      if (!itemId || !roomCode || !sessionId) {
        return NextResponse.json({ success: false, error: "itemId, roomCode, and sessionId are required" }, { status: 400 });
      }

      const room = await getClipboardRoom(roomCode.toUpperCase());
      if (!room) {
        return NextResponse.json({ success: false, error: "Room not found or expired" }, { status: 404 });
      }

      // Verify host permissions
      if (room.hostSessionId !== sessionId) {
        return NextResponse.json({ success: false, error: "Only the room host can delete items" }, { status: 403 });
      }

      await deleteClipboardItem(itemId);

      return NextResponse.json({ success: true });
    }

    if (action === "edit-item") {
      const { itemId, roomCode, sessionId, title } = body;

      if (!itemId || !roomCode || !sessionId || title === undefined) {
        return NextResponse.json({ success: false, error: "itemId, roomCode, sessionId, and title are required" }, { status: 400 });
      }

      const room = await getClipboardRoom(roomCode.toUpperCase());
      if (!room) {
        return NextResponse.json({ success: false, error: "Room not found or expired" }, { status: 404 });
      }

      // Verify permissions: only room host or members with permission (but let's restrict title edits to the host or members if everyone can add)
      if (!room.allowAllMembersToAdd && room.hostSessionId !== sessionId) {
        return NextResponse.json({ success: false, error: "Only the room host can edit items" }, { status: 403 });
      }

      await updateClipboardItemTitle(itemId, title);

      return NextResponse.json({ success: true });
    }

    if (action === "edit-item-content") {
      const { itemId, roomCode, sessionId, content } = body;

      if (!itemId || !roomCode || !sessionId || content === undefined) {
        return NextResponse.json({ success: false, error: "itemId, roomCode, sessionId, and content are required" }, { status: 400 });
      }

      const room = await getClipboardRoom(roomCode.toUpperCase());
      if (!room) {
        return NextResponse.json({ success: false, error: "Room not found or expired" }, { status: 404 });
      }

      const item = await getClipboardItemById(itemId);
      if (!item) {
        return NextResponse.json({ success: false, error: "Item not found" }, { status: 404 });
      }

      // Verify permissions: only the item creator or the room host can edit the content
      if (item.creatorSessionId !== sessionId && room.hostSessionId !== sessionId) {
        return NextResponse.json({ success: false, error: "Only the creator or the room host can edit this item's content" }, { status: 403 });
      }

      await updateClipboardItemContent(itemId, content);

      return NextResponse.json({ success: true });
    }

    if (action === "update-permissions") {
      const { roomCode, allowAllMembersToAdd, sessionId } = body;

      if (!roomCode || sessionId === undefined) {
        return NextResponse.json({ success: false, error: "roomCode and sessionId are required" }, { status: 400 });
      }

      const room = await getClipboardRoom(roomCode.toUpperCase());
      if (!room) {
        return NextResponse.json({ success: false, error: "Room not found or expired" }, { status: 404 });
      }

      if (room.hostSessionId !== sessionId) {
        return NextResponse.json({ success: false, error: "Only the room host can change permissions" }, { status: 403 });
      }

      await updateRoomPermissions(roomCode.toUpperCase(), !!allowAllMembersToAdd);

      return NextResponse.json({ success: true });
    }

    if (action === "extend-room") {
      const { roomCode, minutes, sessionId } = body;

      if (!roomCode || !minutes || !sessionId) {
        return NextResponse.json({ success: false, error: "roomCode, minutes, and sessionId are required" }, { status: 400 });
      }

      const room = await getClipboardRoom(roomCode.toUpperCase());
      if (!room) {
        return NextResponse.json({ success: false, error: "Room not found or expired" }, { status: 404 });
      }

      if (room.hostSessionId !== sessionId) {
        return NextResponse.json({ success: false, error: "Only the room host can extend the expiration time" }, { status: 403 });
      }

      const additionalMs = minutes * 60 * 1000;
      const currentExpiresAt = new Date(room.expiresAt).getTime();
      const newExpiresAt = new Date(currentExpiresAt + additionalMs).toISOString();
      const newDuration = (room.durationMins || 0) + minutes;

      await updateRoomExpiration(roomCode.toUpperCase(), newExpiresAt, newDuration);

      return NextResponse.json({ success: true, expiresAt: newExpiresAt });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("POST Clipboard API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
