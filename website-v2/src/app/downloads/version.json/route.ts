import { NextRequest, NextResponse } from "next/server";
import { getOtaFile } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const dbContent = await getOtaFile("downloads/version.json");
    if (dbContent !== null) {
      return new NextResponse(dbContent, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      });
    }
  } catch (error) {
    console.error("Failed to read version.json from DB:", error);
  }

  // Fallback to default version 1.5.8 manifest
  const fallback = {
    version: "1.5.8",
    windows_url: "https://lanpad.vercel.app/downloads/LANpad.exe",
    mac_url: "https://lanpad.vercel.app/downloads/LANpad_macOS.dmg",
    changelog: "v1.5.8 - Admin: Added plan validity duration config, relocated Referral Stats to monetization page, removed Feature Gate Controls, reordered Activation Keys table."
  };

  return NextResponse.json(fallback, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    },
  });
}
