import { NextRequest, NextResponse } from "next/server";
import { getClipboardRoom, addClipboardItem } from "@/lib/db";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const roomCode = formData.get("roomCode") as string;
    const title = formData.get("title") as string;
    const sessionId = formData.get("sessionId") as string;
    const file = formData.get("file") as File;

    if (!roomCode || !sessionId || !file) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const room = await getClipboardRoom(roomCode.toUpperCase());
    if (!room) {
      return NextResponse.json({ success: false, error: "Room not found or expired" }, { status: 404 });
    }

    // Verify write permissions
    const isHost = room.hostSessionId === sessionId;
    if (!room.allowAllMembersToAdd && !isHost) {
      return NextResponse.json({ success: false, error: "Only the room host can add items" }, { status: 403 });
    }

    // Ensure upload directory exists
    const isServerless = process.env.VERCEL || process.env.NODE_ENV === "production";
    const uploadDir = isServerless ? "/tmp/glidepass_uploads" : path.join(process.cwd(), "data", "uploads");
    fs.mkdirSync(uploadDir, { recursive: true });

    // Generate unique local file path
    const fileId = crypto.randomUUID();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const localFilePath = path.join(uploadDir, `${fileId}-${safeFileName}`);

    // Stream write file buffer to disk
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(localFilePath, buffer);

    // Save metadata in database
    const itemId = crypto.randomUUID();
    const itemContent = JSON.stringify({
      isFile: true,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      filePath: localFilePath
    });

    const newItem = {
      id: itemId,
      roomCode: roomCode.toUpperCase(),
      title: title || file.name,
      content: itemContent
    };

    await addClipboardItem(newItem);

    return NextResponse.json({ success: true, item: newItem });
  } catch (error: any) {
    console.error("Upload API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
