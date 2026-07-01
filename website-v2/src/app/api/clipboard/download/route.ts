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

    // Check if file exists on disk
    if (!fs.existsSync(fileInfo.filePath)) {
      return NextResponse.json({ success: false, error: "File has been removed or is no longer available on this server" }, { status: 404 });
    }

    // Read file bytes
    const fileBuffer = fs.readFileSync(fileInfo.filePath);

    // Return direct binary download stream
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": fileInfo.fileType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileInfo.fileName)}"`,
        "Content-Length": fileInfo.fileSize.toString()
      }
    });
  } catch (error: any) {
    console.error("Download API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
