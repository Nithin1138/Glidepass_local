import { NextRequest, NextResponse } from "next/server";
import { getClipboardRoom, addClipboardItem } from "@/lib/db";
import fs from "fs";
import path from "path";
import crypto from "crypto";

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

    // Chunking params
    const uploadId = searchParams.get("uploadId") || "";
    const chunkIndexStr = searchParams.get("chunkIndex") || "";
    const totalChunksStr = searchParams.get("totalChunks") || "";

    if (!roomCode || !sessionId || !fileName || !uploadId) {
      return NextResponse.json({ success: false, error: "Missing required upload parameters" }, { status: 400 });
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
    const isServerless = !!process.env.VERCEL;
    const uploadDir = isServerless ? "/tmp/glidepass_uploads" : path.join(process.cwd(), "data", "uploads");
    fs.mkdirSync(uploadDir, { recursive: true });

    // Path for temporary partial file
    const safeUploadId = uploadId.replace(/[^a-zA-Z0-9-]/g, "");
    const tempFilePath = path.join(uploadDir, `${safeUploadId}.part`);

    // Parse chunk index and total chunks
    const chunkIndex = parseInt(chunkIndexStr, 10);
    const totalChunks = parseInt(totalChunksStr, 10);

    // Read chunk bytes from request body
    const chunkArrayBuffer = await req.arrayBuffer();
    const chunkBuffer = Buffer.from(chunkArrayBuffer);

    // Append chunk to partial file
    if (chunkIndex === 0) {
      // First chunk: overwrite/create clean file
      fs.writeFileSync(tempFilePath, chunkBuffer);
    } else {
      // Subsequent chunks: append
      fs.appendFileSync(tempFilePath, chunkBuffer);
    }

    // If it's the last chunk, finalize the file
    if (chunkIndex === totalChunks - 1) {
      const finalFileId = crypto.randomUUID();
      const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
      const finalFilePath = path.join(uploadDir, `${finalFileId}-${safeFileName}`);

      // Move temp file to final location
      fs.renameSync(tempFilePath, finalFilePath);

      // Save metadata in database
      const itemId = crypto.randomUUID();
      const itemContent = JSON.stringify({
        isFile: true,
        fileName: fileName,
        fileType: fileType,
        fileSize: fileSize,
        filePath: finalFilePath
      });

      const newItem = {
        id: itemId,
        roomCode: roomCode.toUpperCase(),
        title: title || fileName,
        content: itemContent
      };

      await addClipboardItem(newItem);
      return NextResponse.json({ success: true, completed: true, item: newItem });
    }

    return NextResponse.json({ success: true, completed: false, chunkReceived: chunkIndex });
  } catch (error: any) {
    console.error("Upload API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
