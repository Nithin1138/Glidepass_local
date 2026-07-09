import { NextRequest, NextResponse } from "next/server";
import { getSubscriptions, refundSubscription } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const subscriptions = await getSubscriptions();
    return NextResponse.json({ success: true, subscriptions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body;
    if (!id) {
      return NextResponse.json({ error: "Missing transaction ID" }, { status: 400 });
    }
    await refundSubscription(id);
    const subscriptions = await getSubscriptions();
    return NextResponse.json({ success: true, subscriptions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
