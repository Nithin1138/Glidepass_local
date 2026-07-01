import { NextRequest, NextResponse } from "next/server";
import { getClipboardItemById } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id") || "";

    if (!id) {
      return NextResponse.json({ success: false, error: "Item ID is required" }, { status: 400 });
    }

    const item = await getClipboardItemById(id);
    if (!item) {
      return NextResponse.json({ success: false, error: "Clipboard item not found" }, { status: 404 });
    }

    // Parse file item metadata
    let fileInfo: {
      isFile: boolean;
      fileName: string;
      fileType: string;
      fileSize: number;
      data?: string;      // base64 data URI (new inline storage)
      filePath?: string;  // legacy disk path (old items)
    } | null = null;

    try {
      if (item.content.startsWith('{"isFile":true')) {
        fileInfo = JSON.parse(item.content);
      }
    } catch (e) {}

    if (!fileInfo) {
      return NextResponse.json({ success: false, error: "This clipboard item is not a file" }, { status: 400 });
    }

    // ── New path: base64 data URI stored inline in DB ──────────────────────
    if (fileInfo.data && fileInfo.data.startsWith("data:")) {
      // Strip the data URI prefix to get pure base64
      const commaIdx = fileInfo.data.indexOf(",");
      const base64 = commaIdx >= 0 ? fileInfo.data.slice(commaIdx + 1) : fileInfo.data;
      const fileBuffer = Buffer.from(base64, "base64");

      const isInline = fileInfo.fileType.startsWith("image/") ||
                       fileInfo.fileType.startsWith("video/") ||
                       fileInfo.fileType.startsWith("audio/") ||
                       searchParams.get("inline") === "true";
      const dispositionType = isInline ? "inline" : "attachment";

      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": fileInfo.fileType || "application/octet-stream",
          "Content-Disposition": `${dispositionType}; filename="${encodeURIComponent(fileInfo.fileName)}"`,
          "Content-Length": fileBuffer.length.toString(),
          "Cache-Control": "public, max-age=86400"
        }
      });
    }

    // ── Legacy fallback: disk-based file (old items uploaded before fix) ────
    if (fileInfo.filePath) {
      const fs = await import("fs");
      const path = await import("path");

      const isServerless = !!process.env.VERCEL;
      const uploadDir = isServerless ? "/tmp/glidepass_uploads" : path.join(process.cwd(), "data", "uploads");
      const fileNameOnDisk = path.basename(fileInfo.filePath);
      const resolvedPath = path.join(uploadDir, fileNameOnDisk);

      let finalPath = resolvedPath;
      if (!fs.existsSync(resolvedPath) && fs.existsSync(fileInfo.filePath)) {
        finalPath = fileInfo.filePath;
      }

      if (!fs.existsSync(finalPath)) {
        return NextResponse.json(
          { success: false, error: "This file is no longer available (uploaded before persistent storage was enabled). Please re-upload." },
          { status: 404 }
        );
      }

      const fileBuffer = fs.readFileSync(finalPath);
      const isInline = fileInfo.fileType.startsWith("image/") ||
                       fileInfo.fileType.startsWith("video/") ||
                       fileInfo.fileType.startsWith("audio/") ||
                       searchParams.get("inline") === "true";

      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": fileInfo.fileType || "application/octet-stream",
          "Content-Disposition": `${(isInline ? "inline" : "attachment")}; filename="${encodeURIComponent(fileInfo.fileName)}"`,
          "Content-Length": fileBuffer.length.toString()
        }
      });
    }

    return NextResponse.json({ success: false, error: "File data missing" }, { status: 400 });

  } catch (error: any) {
    console.error("Download API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
