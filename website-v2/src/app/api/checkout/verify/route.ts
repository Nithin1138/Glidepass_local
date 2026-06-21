import { NextRequest, NextResponse } from "next/server";
import { 
  addSubscription, getCoupons, addCoupon, getMonetizationSettings, 
  generateLicenseKey, getEmailByReferralCode, addReferral, rewardReferrer 
} from "@/lib/db";
import crypto from "crypto";
import { sendEmail } from "@/lib/mail";

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

    // 6. Send the license key via Email
    try {
      await sendEmail({
        to: email,
        subject: "Your LANpad License Key",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #333;">Thank you for your purchase!</h2>
            <p>You have successfully purchased the <strong>${tier}</strong> plan.</p>
            <p>Your license key is valid for ${durationDays} days.</p>
            <div style="background-color: #f4f4f4; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 18px; margin: 20px 0; text-align: center;">
              <strong>${licenseKey}</strong>
            </div>
            <p>To activate your license, open the LANpad app, go to the settings or license section, and paste this key.</p>
            <hr style="border: 0; border-top: 1px solid #ddd; margin: 20px 0;" />
            <p style="font-size: 12px; color: #777;">If you have any questions, please reply to this email.</p>
          </div>
        `,
        text: `Thank you for your purchase! You have successfully purchased the ${tier} plan.\n\nYour license key is: ${licenseKey}\n\nIt is valid for ${durationDays} days.`
      });
    } catch (err) {
      console.error("Failed to send license email:", err);
    }

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
