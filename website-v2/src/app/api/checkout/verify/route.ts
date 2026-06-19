import { NextRequest, NextResponse } from "next/server";
import { 
  addSubscription, getCoupons, addCoupon, getMonetizationSettings, 
  generateLicenseKey, getEmailByReferralCode, addReferral, rewardReferrer 
} from "@/lib/db";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature, 
      email, 
      tier, 
      couponCode, 
      referralCode,
      amount 
    } = await req.json();

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !email || !tier) {
      return NextResponse.json({ success: false, error: "Missing required parameters" }, { status: 400 });
    }

    // 1. Verify Payment Signature
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "LANpadMockSecretKey123";
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ success: false, error: "Invalid payment signature verification failed" }, { status: 400 });
    }

    // 2. Log subscription transaction
    const amountStr = amount ? `₹${(parseFloat(amount) / 100).toFixed(2)}` : "₹0.00";
    await addSubscription({
      id: razorpay_payment_id,
      email,
      plan: tier,
      amount: amountStr,
      status: "active",
      date: new Date().toISOString()
    });

    // 3. Increment Coupon Usage
    if (couponCode) {
      const cleanCode = couponCode.trim().toUpperCase();
      const coupons = await getCoupons();
      const coupon = coupons.find((c) => c.code.trim().toUpperCase() === cleanCode);
      if (coupon) {
        await addCoupon({
          ...coupon,
          usage: (coupon.usage || 0) + 1
        });
      }
    }

    // 4. Handle Referral Rewards
    if (referralCode) {
      const referrerEmail = await getEmailByReferralCode(referralCode.trim());
      // Prevent self-referral
      if (referrerEmail && referrerEmail.toLowerCase() !== email.toLowerCase()) {
        await addReferral(referrerEmail, email);
        await rewardReferrer(email);
      }
    }

    // 5. Generate License Key for Purchaser
    const settings = await getMonetizationSettings();
    const plans = settings?.plans || [];
    const plan = plans.find((p: any) => p.tier.toLowerCase() === tier.toLowerCase());
    const durationDays = plan && !isNaN(parseInt(plan.validity_days, 10)) ? parseInt(plan.validity_days, 10) : 30;

    const licenseKey = await generateLicenseKey(tier, email, durationDays);

    return NextResponse.json({
      success: true,
      licenseKey,
      message: "Payment verified successfully. License key generated."
    });
  } catch (error: any) {
    console.error("Payment verification error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
