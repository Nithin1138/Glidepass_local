import { NextRequest, NextResponse } from "next/server";
import { getClipboardRoom, addClipboardItem, saveFileChunk, getFileChunks, deleteFileChunks, cleanupStaleChunks } from "@/lib/db";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// Each binary chunk is ≤ 2MB → base64 ≈ 2.7MB, safely under Vercel's 4.5MB body cap
// We store chunks in Postgres, assemble on the last chunk → supports files up to ~25MB

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roomCode = searchParams.get("roomCode") || "";
    const title = searchParams.get("title") || "";
    const sessionId = searchParams.get("sessionId") || "";
    const fileName = searchParams.get("fileName") || "";
    const fileType = searchParams.get("fileType") || "application/octet-stream";
    const fileSize = parseInt(searchParams.get("fileSize") || "0", 10);
    const uploadId = searchParams.get("uploadId") || "";
    const chunkIndex = parseInt(searchParams.get("chunkIndex") || "0", 10);
    const totalChunks = parseInt(searchParams.get("totalChunks") || "1", 10);

    if (!roomCode || !sessionId || !fileName || !uploadId) {
      return NextResponse.json({ success: false, error: "Missing required upload parameters" }, { status: 400 });
    }

    const room = await getClipboardRoom(roomCode.toUpperCase());
    if (!room) {
      return NextResponse.json({ success: false, error: "Room not found or expired" }, { status: 404 });
    }

    const isHost = room.hostSessionId === sessionId;
    if (!room.allowAllMembersToAdd && !isHost) {
      return NextResponse.json({ success: false, error: "Only the room host can add items" }, { status: 403 });
    }

    // Read binary chunk from request body and convert to base64
    const chunkArrayBuffer = await req.arrayBuffer();
    const chunkBuffer = Buffer.from(chunkArrayBuffer);
    const chunkBase64 = chunkBuffer.toString("base64");

    // Persist this chunk to the database
    await saveFileChunk(uploadId, chunkIndex, chunkBase64, fileName, fileType, fileSize);

    // If this is NOT the final chunk, acknowledge and wait for more
    if (chunkIndex < totalChunks - 1) {
      return NextResponse.json({ success: true, completed: false, chunkReceived: chunkIndex });
    }

    // ── Final chunk received: assemble all chunks ──────────────────────────
    const chunks = await getFileChunks(uploadId);

    if (chunks.length !== totalChunks) {
      return NextResponse.json(
        { success: false, error: `Expected ${totalChunks} chunks but only found ${chunks.length}. Please retry the upload.` },
        { status: 400 }
      );
    }

    // Concatenate all base64 strings in order
    const fullBase64 = chunks.map(c => c.chunkData).join("");
    const resolvedFileType = chunks[0].fileType || fileType;
    const resolvedFileName = chunks[0].fileName || fileName;
    const resolvedFileSize = chunks[0].fileSize || fileSize;

    // Build the full data URI (what we store in the DB content column)
    const dataUri = `data:${resolvedFileType};base64,${fullBase64}`;

    const itemContent = JSON.stringify({
      isFile: true,
      fileName: resolvedFileName,
      fileType: resolvedFileType,
      fileSize: resolvedFileSize,
      data: dataUri
    });

    const itemId = crypto.randomUUID();
    const newItem = {
      id: itemId,
      roomCode: roomCode.toUpperCase(),
      title: title || resolvedFileName,
      content: itemContent
    };

    await addClipboardItem(newItem);

    // Clean up temporary chunks for this upload
    await deleteFileChunks(uploadId);

    // Opportunistically clean up any stale chunks from other abandoned uploads
    cleanupStaleChunks().catch(() => {});

    return NextResponse.json({ success: true, completed: true, item: newItem });

  } catch (error: any) {
    console.error("Upload API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
