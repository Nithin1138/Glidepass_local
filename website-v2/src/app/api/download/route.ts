import { NextRequest, NextResponse } from "next/server";
import { logDownload, getOtaFile } from "@/lib/db";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform");

  if (!platform || (platform !== "windows" && platform !== "mac")) {
    return NextResponse.json({ error: "Invalid platform. Must be windows or mac" }, { status: 400 });
  }

  // 1. Log telemetry event anonymously
  await logDownload(platform);

  // 2. Fetch the target download links from downloads/version.json if it exists, otherwise use fallback urls
  let downloadUrl = platform === "windows"
    ? "/downloads/LANpad.exe"
    : "/downloads/LANpad_macOS.dmg";

  try {
    let parsed: any = null;
    
    // Try reading from database first
    const dbContent = await getOtaFile("downloads/version.json");
    if (dbContent !== null) {
      try {
        parsed = JSON.parse(dbContent);
      } catch (e) {}
    }

    // Fall back to custom file path if not found in database
    if (!parsed) {
      const isServerless = process.env.VERCEL || process.env.NODE_ENV === "production";
      const baseDir = isServerless ? "/tmp" : path.join(process.cwd(), "data");
      const versionFilePath = path.join(baseDir, "ota", "downloads/version.json");

      if (fs.existsSync(versionFilePath)) {
        try {
          parsed = JSON.parse(fs.readFileSync(versionFilePath, "utf8"));
        } catch (e) {}
      }
    }

    if (parsed) {
      if (platform === "windows" && parsed.windows_url) {
        downloadUrl = parsed.windows_url;
      } else if (platform === "mac" && parsed.mac_url) {
        downloadUrl = parsed.mac_url;
      }
    }
  } catch (e) {
    console.error("Failed to read version.json config for downloads", e);
  }

  // 3. Perform HTTP redirect
  const redirectUrl = downloadUrl.startsWith("http")
    ? downloadUrl
    : new URL(downloadUrl, request.nextUrl.origin).toString();

  return NextResponse.redirect(redirectUrl, 302);
}

