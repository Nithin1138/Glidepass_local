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
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { margin: 0; padding: 0; background-color: #EDEAE0; font-family: 'DM Sans', -apple-system, sans-serif; }
                .email-container { max-width: 500px; margin: 40px auto; background-color: #EDEAE0; border-radius: 40px; padding: 40px; box-shadow: 20px 20px 40px rgba(0,0,0,0.06), -20px -20px 40px rgba(255,255,255,0.4); border: 1px solid rgba(255,255,255,0.2); text-align: center; }
                .logo-container { width: 56px; height: 56px; background: #F28500; border-radius: 16px; margin: 0 auto 24px auto; display: flex; align-items: center; justify-content: center; box-shadow: 8px 8px 16px rgba(242, 133, 0, 0.2); }
                .logo-img { width: 44px; height: 44px; object-fit: contain; }
                h2 { color: #0f172a; font-family: 'Rubik', sans-serif; font-weight: 900; font-size: 24px; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: -0.02em; }
                p { color: #64748b; font-size: 14px; font-weight: 500; line-height: 1.6; margin: 0 0 24px 0; }
                .key-card { background: #EDEAE0; border-radius: 24px; padding: 20px; box-shadow: inset 4px 4px 8px rgba(0,0,0,0.04), inset -4px -4px 8px rgba(255,255,255,0.3); border: 1px solid rgba(255,255,255,0.15); margin: 30px 0; }
                .key-label { font-size: 9px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 12px; }
                .key-value { font-family: monospace; font-size: 16px; font-weight: 700; color: #468FEA; background: #ffffff; padding: 12px 16px; border-radius: 12px; border: 1px dashed rgba(70, 143, 234, 0.3); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 16px; text-shadow: 0 0 8px rgba(70, 143, 234, 0.1); }
                .copy-button { display: inline-block; width: 100%; box-sizing: border-box; padding: 14px 24px; background: #F28500; color: white; text-decoration: none; border-radius: 14px; font-weight: 900; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; box-shadow: 8px 8px 16px rgba(242, 133, 0, 0.2); border: none; cursor: pointer; transition: all 0.3s; }
                .footer { border-top: 1px solid rgba(0, 0, 0, 0.05); margin-top: 35px; padding-top: 24px; font-size: 11px; color: #94a3b8; font-weight: bold; }
              </style>
            </head>
            <body>
              <div class="email-container">
                <div class="logo-container">
                  <img src="https://lanpad.vercel.app/logo.png" class="logo-img" alt="L">
                </div>
                <h2>Your Premium Key</h2>
                <p>Thank you for purchasing the <strong>${tier} Pass</strong>. Your workspace is active for <strong>${durationDays} days</strong>.</p>
                
                <div class="key-card">
                  <div class="key-label">Active License Key</div>
                  <div class="key-value">${licenseKey}</div>
                  <a href="https://lanpad.vercel.app/pricing?key=${licenseKey}" class="copy-button">Copy & Activate Key</a>
                </div>

                <p style="font-size: 12px; color: #94a3b8;">Paste this key in the LANpad desktop client settings panel to unlock all features.</p>
                
                <div class="footer">
                  © 2026 LANPAD. All rights reserved.<br>
                  Security sync systems operational.
                </div>
              </div>
            </body>
          </html>
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
