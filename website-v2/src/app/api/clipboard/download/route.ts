import { NextRequest, NextResponse } from "next/server";
import { getClipboardItemById } from "@/lib/db";
import fs from "fs";
import path from "path";

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
    let fileInfo;
    try {
      if (item.content.startsWith('{"isFile":true')) {
        fileInfo = JSON.parse(item.content) as { isFile: boolean; fileName: string; fileType: string; fileSize: number; filePath: string };
      }
    } catch (e) {}

    if (!fileInfo || !fileInfo.filePath) {
      return NextResponse.json({ success: false, error: "This clipboard item is not a file" }, { status: 400 });
    }

    // Resolve path dynamically using basename to handle system-to-system movements
    const isServerless = !!process.env.VERCEL;
    const uploadDir = isServerless ? "/tmp/glidepass_uploads" : path.join(process.cwd(), "data", "uploads");
    const fileNameOnDisk = path.basename(fileInfo.filePath);
    const resolvedPath = path.join(uploadDir, fileNameOnDisk);

    // Fallback: check if the original path exists if the dynamic resolution doesn't find it
    let finalPath = resolvedPath;
    if (!fs.existsSync(resolvedPath) && fs.existsSync(fileInfo.filePath)) {
      finalPath = fileInfo.filePath;
    }

    // Check if file exists on disk
    if (!fs.existsSync(finalPath)) {
      return NextResponse.json({ success: false, error: "File has been removed or is no longer available on this server" }, { status: 404 });
    }

    // Read file bytes
    const fileBuffer = fs.readFileSync(finalPath);

    const isInline = fileInfo.fileType.startsWith("image/") || 
                     fileInfo.fileType.startsWith("video/") || 
                     fileInfo.fileType.startsWith("audio/") || 
                     searchParams.get("inline") === "true";
    const dispositionType = isInline ? "inline" : "attachment";

    // Return direct binary download stream
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": fileInfo.fileType || "application/octet-stream",
        "Content-Disposition": `${dispositionType}; filename="${encodeURIComponent(fileInfo.fileName)}"`,
        "Content-Length": fileBuffer.length.toString()
      }
    });
  } catch (error: any) {
    console.error("Download API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
