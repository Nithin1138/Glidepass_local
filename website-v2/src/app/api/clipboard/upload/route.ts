import { NextRequest, NextResponse } from "next/server";
import { getClipboardRoom, addClipboardItem } from "@/lib/db";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Readable } from "stream";
import { finished } from "stream/promises";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roomCode = searchParams.get("roomCode") || "";
    const title = searchParams.get("title") || "";
    const sessionId = searchParams.get("sessionId") || "";
    const fileName = searchParams.get("fileName") || "";
    const fileType = searchParams.get("fileType") || "";
    const fileSizeStr = searchParams.get("fileSize") || "0";
    const fileSize = parseInt(fileSizeStr, 10);

    if (!roomCode || !sessionId || !fileName) {
      return NextResponse.json({ success: false, error: "Missing required query parameters" }, { status: 400 });
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
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const localFilePath = path.join(uploadDir, `${fileId}-${safeFileName}`);

    // Stream request body directly to disk (bypasses Next.js 413 body size limit)
    const webStream = req.body;
    if (!webStream) {
      return NextResponse.json({ success: false, error: "Empty request body" }, { status: 400 });
    }

    const nodeStream = Readable.fromWeb(webStream as any);
    const writeStream = fs.createWriteStream(localFilePath);
    nodeStream.pipe(writeStream);

    await finished(writeStream);

    // Save metadata in database
    const itemId = crypto.randomUUID();
    const itemContent = JSON.stringify({
      isFile: true,
      fileName: fileName,
      fileType: fileType,
      fileSize: fileSize,
      filePath: localFilePath
    });

    const newItem = {
      id: itemId,
      roomCode: roomCode.toUpperCase(),
      title: title || fileName,
      content: itemContent
    };

    await addClipboardItem(newItem);

    return NextResponse.json({ success: true, item: newItem });
  } catch (error: any) {
    console.error("Upload API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
