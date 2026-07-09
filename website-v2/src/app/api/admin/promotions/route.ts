import { NextRequest, NextResponse } from "next/server";
import { getCoupons, addCoupon, toggleCoupon } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const coupons = await getCoupons();
    return NextResponse.json({ success: true, campaigns: coupons });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, code, name, reward, max_uses, discount } = body;

    if (action === "toggle") {
      if (!code) return NextResponse.json({ error: "Missing coupon code" }, { status: 400 });
      await toggleCoupon(code);
    } else if (action === "create") {
      if (!code || !discount) return NextResponse.json({ error: "Missing required coupon fields" }, { status: 400 });
      await addCoupon({
        code,
        discount,
        max_uses: max_uses || 100,
        status: "active"
      });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const coupons = await getCoupons();
    return NextResponse.json({ success: true, campaigns: coupons });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
