import { NextRequest, NextResponse } from "next/server";
import { logDownload } from "@/lib/db";
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
    ? "/downloads/LANpad_Windows.zip"
    : "/downloads/LANpad_macOS.dmg";

  try {
    const isServerless = process.env.VERCEL || process.env.NODE_ENV === "production";
    const baseDir = isServerless ? "/tmp" : path.join(process.cwd(), "data");
    let versionFilePath = path.join(baseDir, "ota", "downloads/version.json");

    if (!fs.existsSync(versionFilePath)) {
      // Fallback to default path in public folder
      versionFilePath = path.join(process.cwd(), "public", "downloads", "version.json");
    }

    if (fs.existsSync(versionFilePath)) {
      const parsed = JSON.parse(fs.readFileSync(versionFilePath, "utf8"));
      if (platform === "windows" && parsed.windows_url) {
        downloadUrl = parsed.windows_url;
      } else if (platform === "mac" && parsed.mac_url) {
        downloadUrl = parsed.mac_url;
      }
    }
  } catch (e) {
    console.error("Failed to read version.json config for downloads", e);
  }

  // 3. Perform HTTP redirect with absolute URL
  const absoluteDownloadUrl = downloadUrl.startsWith("http")
    ? downloadUrl
    : new URL(downloadUrl, request.url).toString();

  return NextResponse.redirect(absoluteDownloadUrl, 302);
}
