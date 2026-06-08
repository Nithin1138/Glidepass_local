import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const getOtaDir = () => {
  const dir = path.join(process.cwd(), "data", "ota");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get("file");

  if (!file || (file !== "index.html" && file !== "center.html")) {
    return NextResponse.json({ error: "Invalid file parameter. Must be index.html or center.html" }, { status: 400 });
  }

  try {
    const otaDir = getOtaDir();
    const customFilePath = path.join(otaDir, file);

    // Try reading custom OTA template
    if (fs.existsSync(customFilePath)) {
      const content = fs.readFileSync(customFilePath, "utf8");
      return new NextResponse(content, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Fall back to default template in GlidePass/templates/
    const defaultFilePath = path.join(process.cwd(), "..", "templates", file);
    if (fs.existsSync(defaultFilePath)) {
      const content = fs.readFileSync(defaultFilePath, "utf8");
      return new NextResponse(content, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return NextResponse.json({ error: "Template file not found" }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { file, content } = body;

    if (!file || (file !== "index.html" && file !== "center.html")) {
      return NextResponse.json({ error: "Invalid file parameter. Must be index.html or center.html" }, { status: 400 });
    }

    if (typeof content !== "string") {
      return NextResponse.json({ error: "Content must be a string" }, { status: 400 });
    }

    const otaDir = getOtaDir();
    const filePath = path.join(otaDir, file);

    fs.writeFileSync(filePath, content, "utf8");

    return NextResponse.json({ success: true, message: `Successfully updated ${file}` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
