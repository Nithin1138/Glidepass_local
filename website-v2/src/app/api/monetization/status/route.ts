import { NextResponse } from "next/server";
import { getMonetizationSettings } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getMonetizationSettings();
    return NextResponse.json({
      monetization_enabled: settings.monetization_enabled,
      free_enabled: settings.free_enabled,
      plans: settings.plans || []
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
