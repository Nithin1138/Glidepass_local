import { NextRequest, NextResponse } from "next/server";
import { getMonetizationSettings, getCoupons, getEmailByReferralCode } from "@/lib/db";
import Razorpay from "razorpay";

export const dynamic = "force-dynamic";

// Initialize Razorpay with credentials, or fallback to test sandbox values
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_LANpadMockKeyId",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "LANpadMockSecretKey123",
});

export async function POST(req: NextRequest) {
  try {
    const { email, tier, couponCode, referralCode } = await req.json();

    if (!email || !tier) {
      return NextResponse.json({ error: "Email and tier plan are required" }, { status: 400 });
    }

    // 1. Fetch Plan details from settings
    const settings = await getMonetizationSettings();
    const plans = settings?.plans || [];
    const plan = plans.find((p: any) => p.tier.toLowerCase() === tier.toLowerCase());

    if (!plan) {
      return NextResponse.json({ error: "Invalid plan tier" }, { status: 400 });
    }

    // Extract price (e.g. "₹99" or "₹499" or numbers)
    let rawPrice = String(plan.price).replace(/[^0-9]/g, "");
    let amountInRupees = parseFloat(rawPrice) || 0;

    if (amountInRupees <= 0) {
      return NextResponse.json({ error: "Free tier does not require payment" }, { status: 400 });
    }

    // 2. Validate Coupon and Apply Discount
    let discountPercent = 0;
    if (couponCode) {
      const cleanCode = couponCode.trim().toUpperCase();
      const coupons = await getCoupons();
      const coupon = coupons.find((c) => c.code.trim().toUpperCase() === cleanCode);

      if (coupon && coupon.status === "active") {
        let isExpired = false;
        if (coupon.expires_at) {
          isExpired = Date.now() > new Date(coupon.expires_at).getTime();
        }
        let limitReached = false;
        if (coupon.max_uses !== undefined && coupon.usage !== undefined) {
          limitReached = coupon.usage >= coupon.max_uses;
        }

        if (!isExpired && !limitReached) {
          const discountStr = String(coupon.discount).replace(/[^0-9]/g, "");
          discountPercent = parseFloat(discountStr) || 0;
        }
      }
    }

    // Apply coupon discount (capped at 100%)
    let finalAmount = amountInRupees;
    if (discountPercent > 0) {
      finalAmount = amountInRupees * (1 - Math.min(discountPercent, 100) / 100);
    }

    // If referral code is used, validate it first!
    if (referralCode) {
      const cleanRefCode = referralCode.trim().toUpperCase();
      const referrerEmail = await getEmailByReferralCode(cleanRefCode);
      if (referrerEmail && referrerEmail.toLowerCase() !== email.toLowerCase()) {
        finalAmount = finalAmount * 0.90; // 10% off
      } else {
        return NextResponse.json({ error: "Invalid or self-referred referral code" }, { status: 400 });
      }
    }

    // Minimum amount for Razorpay is 1 INR
    finalAmount = Math.max(finalAmount, 1);

    // Razorpay amounts are in Paisa (1 INR = 100 Paisa)
    const amountInPaisa = Math.round(finalAmount * 100);

    // 3. Create Razorpay Order
    const options = {
      amount: amountInPaisa,
      currency: "INR",
      receipt: `receipt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      notes: {
        email,
        tier,
        couponCode: couponCode || "",
        referralCode: referralCode || "",
        originalPrice: amountInRupees.toString(),
      },
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_LANpadMockKeyId",
    });
  } catch (error: any) {
    console.error("Error creating Razorpay order:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
