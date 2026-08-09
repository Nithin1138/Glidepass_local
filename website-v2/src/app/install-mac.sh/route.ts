import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "public", "install-mac.sh");
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8");
      return new NextResponse(content, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }
  } catch (e) {
    console.error("Error reading install-mac.sh", e);
  }
  return new NextResponse("#!/bin/bash\n# LANpad macOS Installer", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
