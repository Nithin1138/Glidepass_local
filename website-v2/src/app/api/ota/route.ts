import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const getCustomFilePath = (file: string) => {
  const isServerless = process.env.VERCEL || process.env.NODE_ENV === "production";
  const baseDir = isServerless ? "/tmp" : path.join(process.cwd(), "data");
  return path.join(baseDir, "ota", file);
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get("file");

  if (!file || (file !== "index.html" && file !== "center.html")) {
    return NextResponse.json({ error: "Invalid file parameter. Must be index.html or center.html" }, { status: 400 });
  }

  try {
    const customFilePath = getCustomFilePath(file);

    // Try reading custom OTA template if it exists
    if (fs.existsSync(customFilePath)) {
      const content = fs.readFileSync(customFilePath, "utf8");
      return new NextResponse(content, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Fall back to default template in public/templates/
    const defaultFilePath = path.join(process.cwd(), "public", "templates", file);
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

    const filePath = getCustomFilePath(file);
    const parentDir = path.dirname(filePath);

    // Only create directory if it does not exist
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.writeFileSync(filePath, content, "utf8");

    return NextResponse.json({ success: true, message: `Successfully updated ${file}` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
