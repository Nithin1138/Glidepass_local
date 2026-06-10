import { NextRequest, NextResponse } from "next/server";
import { readCodes, writeCodes } from "@/lib/db";

export async function GET() {
  try {
    const data = await readCodes();
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
