import { NextRequest, NextResponse } from "next/server";
import { verifyLicenseKey } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { key, hwid } = await req.json();
    if (!key) {
      return NextResponse.json({ valid: false, error: "License key required" }, { status: 400 });
    }
    const result = await verifyLicenseKey(key, hwid);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ valid: false, error: error.message }, { status: 500 });
  }
}

