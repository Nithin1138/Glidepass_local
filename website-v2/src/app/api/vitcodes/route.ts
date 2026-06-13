import { NextRequest, NextResponse } from "next/server";
import { readCodes, writeCodes } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeDeleted = searchParams.get("includeDeleted") === "true";
    const data = await readCodes(includeDeleted);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Data must be an array of VIT codes" }, { status: 400 });
    }

    await writeCodes(body);
    return NextResponse.json({ success: true, message: "Successfully updated VIT codes database" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
