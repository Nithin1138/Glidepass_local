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

  // Fallback to default version 1.5.8.6 manifest
  const fallback = {
    version: "1.5.8.6",
    windows_url: "https://lanpad.vercel.app/downloads/LANpad.exe",
    mac_url: "https://lanpad.vercel.app/downloads/LANpad_macOS.dmg",
    force_update: true,
    stable: true,
    changelog: "v1.5.8.6 - STABLE: Fixed exit finalization print issue and updated client version."
  };

  return NextResponse.json(fallback, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    },
  });
}
