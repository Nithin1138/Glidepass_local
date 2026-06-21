import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { 
  addSubscription, getCoupons, addCoupon, getMonetizationSettings,
  generateLicenseKey, getEmailByReferralCode, addReferral, rewardReferrer,
  hasSubscription
} from "@/lib/db";
import { sendEmail } from "@/lib/mail";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: "Invalid signature verification failed" }, { status: 400 });
    }

    const eventData = JSON.parse(rawBody);
    
    if (eventData.event !== "payment.captured") {
      return NextResponse.json({ received: true });
    }

    const payment = eventData.payload.payment.entity;
    const paymentId = payment.id;
    const email = payment.email;
    const amount = payment.amount;
    const notes = payment.notes || {};
    const tier = notes.tier;
    const couponCode = notes.couponCode;
    const referralCode = notes.referralCode;

    if (!paymentId || !email || !tier) {
      return NextResponse.json({ error: "Missing required payload fields" }, { status: 400 });
    }

    // Idempotency Check
    const isProcessed = await hasSubscription(paymentId);
    if (isProcessed) {
      return NextResponse.json({ success: true, message: "Webhook already processed" });
    }

    // Log Subscription
    const amountStr = amount ? `₹${(parseFloat(amount) / 100).toFixed(2)}` : "₹0.00";
    await addSubscription({
      id: paymentId,
      email,
      plan: tier,
      amount: amountStr,
      status: "active",
      date: new Date().toISOString()
    });

    // Handle Coupons and Referrals
    if (couponCode) {
      const cleanCode = couponCode.trim().toUpperCase();
      const coupons = await getCoupons();
      const coupon = coupons.find((c) => c.code.trim().toUpperCase() === cleanCode);
      if (coupon) {
        await addCoupon({ ...coupon, usage: (coupon.usage || 0) + 1 });
      }
    }

    if (referralCode) {
      const referrerEmail = await getEmailByReferralCode(referralCode.trim());
      if (referrerEmail && referrerEmail.toLowerCase() !== email.toLowerCase()) {
        await addReferral(referrerEmail, email);
        await rewardReferrer(email);
      }
    }

    // Generate License Key
    const settings = await getMonetizationSettings();
    const plans = settings?.plans || [];
    const plan = plans.find((p: any) => p.tier.toLowerCase() === tier.toLowerCase());
    const durationDays = plan && !isNaN(parseInt(plan.validity_days, 10)) ? parseInt(plan.validity_days, 10) : 30;

    const licenseKey = await generateLicenseKey(tier, email, durationDays);

    // Send confirmation email
    try {
      await sendEmail({
        to: email,
        subject: "Your LANpad License Key (Confirmed)",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2>Thank you for your purchase!</h2>
            <p>Your payment has been verified. The license key for your <strong>${tier}</strong> plan is ready:</p>
            <div style="background-color: #f4f4f4; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 18px; margin: 20px 0; text-align: center;">
              <strong>${licenseKey}</strong>
            </div>
            <p>Paste this key in the LANpad application settings window to unlock your workspace.</p>
          </div>
        `,
        text: `Thank you for your purchase! Your license key is: ${licenseKey}`
      });
    } catch (err) {
      console.error("Webhook email notification failed:", err);
    }

    return NextResponse.json({ success: true, message: "Webhook processed and key generated" });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
