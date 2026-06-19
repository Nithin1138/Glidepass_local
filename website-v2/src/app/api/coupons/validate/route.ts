import { NextRequest, NextResponse } from "next/server";
import { getCoupons } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();
    if (!code) {
      return NextResponse.json({ valid: false, error: "Coupon code is required" }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();
    const coupons = await getCoupons();
    const coupon = coupons.find((c) => c.code.trim().toUpperCase() === cleanCode);

    if (!coupon) {
      return NextResponse.json({ valid: false, error: "Invalid coupon code" }, { status: 404 });
    }

    if (coupon.status !== "active") {
      return NextResponse.json({ valid: false, error: "This coupon code has expired" }, { status: 400 });
    }

    // Check expiration date
    if (coupon.expires_at) {
      const expiry = new Date(coupon.expires_at).getTime();
      if (Date.now() > expiry) {
        return NextResponse.json({ valid: false, error: "This coupon code has expired" }, { status: 400 });
      }
    }

    // Check max uses
    if (coupon.max_uses !== undefined && coupon.usage !== undefined) {
      if (coupon.usage >= coupon.max_uses) {
        return NextResponse.json({ valid: false, error: "This coupon code has reached its usage limit" }, { status: 400 });
      }
    }

    return NextResponse.json({
      valid: true,
      code: coupon.code,
      discount: coupon.discount,
      message: `Coupon '${coupon.code}' applied successfully.`
    });
  } catch (error: any) {
    return NextResponse.json({ valid: false, error: error.message }, { status: 500 });
  }
}
