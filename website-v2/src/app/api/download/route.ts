import { NextRequest, NextResponse } from "next/server";
import { logDownload, getOtaFile } from "@/lib/db";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// Cookie name prefix — one per platform so mac/windows are tracked independently
const DOWNLOAD_COOKIE_PREFIX = "dl_counted_";
// How long (in seconds) before the same user can be counted again (24 hours)
const DEDUP_WINDOW_SECONDS = 86400;

// Known bot/crawler/automated user-agent patterns to exclude from download counts
const BOT_UA_PATTERNS = [
  /bot/i,
  /crawl/i,
  /spider/i,
  /slurp/i,
  /archiver/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /linkedinbot/i,
  /whatsapp/i,
  /telegrambot/i,
  /discordbot/i,
  /slackbot/i,
  /preview/i,
  /prerender/i,
  /headlesschrome/i,
  /phantomjs/i,
  /puppeteer/i,
  /python-requests/i,
  /python-urllib/i,
  /java\//i,
  /curl\//i,
  /wget\//i,
  /httpie/i,
  /axios/i,
  /got\//i,
  /node-fetch/i,
  /go-http-client/i,
  /okhttp/i,
  /vercel/i,
  /lanpad app/i,       // LANpad desktop app update-checker
  /mozilla\/5\.0 \(compatible/i,  // Generic bot masquerade pattern
];

/**
 * Returns true if the User-Agent looks like a real browser (not a bot/automation).
 */
function isRealBrowser(ua: string): boolean {
  if (!ua || ua.trim() === "") return false;

  for (const pattern of BOT_UA_PATTERNS) {
    if (pattern.test(ua)) return false;
  }

  // Must have a known real browser engine signature
  return (
    /Mozilla\/5\.0/.test(ua) &&
    (/Chrome\/\d+/.test(ua) ||
      /Safari\/\d+/.test(ua) ||
      /Firefox\/\d+/.test(ua) ||
      /Edg\/\d+/.test(ua) ||
      /OPR\/\d+/.test(ua))
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform");

  if (!platform || (platform !== "windows" && platform !== "mac")) {
    return NextResponse.json({ error: "Invalid platform. Must be windows or mac" }, { status: 400 });
  }

  // 1. Gate 1 — skip bots, crawlers, and automated clients
  const userAgent = request.headers.get("user-agent") || "";
  const cookieName = `${DOWNLOAD_COOKIE_PREFIX}${platform}`;
  let alreadyCounted = false;

  if (isRealBrowser(userAgent)) {
    // Gate 2 — skip if this browser already triggered a count within the dedup window
    const existingCookie = request.cookies.get(cookieName);
    alreadyCounted = !!existingCookie;

    if (!alreadyCounted) {
      await logDownload(platform);
    }
  }

  // 2. Resolve the actual download URL
  let downloadUrl = platform === "windows"
    ? "/downloads/LANpad.exe"
    : "/downloads/LANpad_macOS.dmg";

  try {
    let parsed: any = null;

    const dbContent = await getOtaFile("downloads/version.json");
    if (dbContent !== null) {
      try { parsed = JSON.parse(dbContent); } catch (e) {}
    }

    if (!parsed) {
      const isServerless = process.env.VERCEL || process.env.NODE_ENV === "production";
      const baseDir = isServerless ? "/tmp" : path.join(process.cwd(), "data");
      const versionFilePath = path.join(baseDir, "ota", "downloads/version.json");
      if (fs.existsSync(versionFilePath)) {
        try { parsed = JSON.parse(fs.readFileSync(versionFilePath, "utf8")); } catch (e) {}
      }
    }

    if (parsed) {
      if (platform === "windows" && parsed.windows_url) downloadUrl = parsed.windows_url;
      else if (platform === "mac" && parsed.mac_url) downloadUrl = parsed.mac_url;
    }
  } catch (e) {
    console.error("Failed to read version.json config for downloads", e);
  }

  // 3. Redirect and stamp the deduplication cookie on the response
  let redirectUrl = downloadUrl.startsWith("http")
    ? downloadUrl
    : new URL(downloadUrl, request.nextUrl.origin).toString();

  // Redirect to GitHub Releases CDN for super-fast downloads and zero Vercel bandwidth consumption
  if (redirectUrl.includes("lanpad.app") || redirectUrl.includes("vercel.app") || !redirectUrl.startsWith("http")) {
    redirectUrl = platform === "windows"
      ? "https://github.com/Nithin1138/Glidepass_local/releases/latest/download/LANpad-Windows.zip"
      : "https://github.com/Nithin1138/Glidepass_local/releases/latest/download/LANpad_macOS.dmg";
  }

  const response = NextResponse.redirect(redirectUrl, 302);

  // Set (or refresh) the dedup cookie so repeat opens within 24 h aren't counted
  if (isRealBrowser(userAgent)) {
    response.cookies.set(cookieName, "1", {
      httpOnly: true,
      sameSite: "lax",
      maxAge: DEDUP_WINDOW_SECONDS,
      path: "/",
    });
  }

  return response;
}
