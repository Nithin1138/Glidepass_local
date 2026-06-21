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
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { margin: 0; padding: 0; background-color: #EDEAE0; font-family: 'DM Sans', -apple-system, sans-serif; }
                .email-container { max-width: 550px; margin: 40px auto; background-color: #EDEAE0; border-radius: 40px; padding: 40px; box-shadow: 20px 20px 40px rgba(0,0,0,0.06), -20px -20px 40px rgba(255,255,255,0.4); border: 1px solid rgba(255,255,255,0.2); text-align: center; }
                .logo-container { width: 56px; height: 56px; background: #F28500; border-radius: 16px; margin: 0 auto 24px auto; display: flex; align-items: center; justify-content: center; box-shadow: 8px 8px 16px rgba(242, 133, 0, 0.2); }
                .logo-text { color: white; font-family: 'Rubik', sans-serif; font-weight: 900; font-size: 24px; line-height: 56px; }
                h2 { color: #0f172a; font-family: 'Rubik', sans-serif; font-weight: 900; font-size: 26px; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: -0.02em; }
                p { color: #64748b; font-size: 14px; font-weight: 500; line-height: 1.6; margin: 0 0 24px 0; }
                .key-card { background: #EDEAE0; border-radius: 20px; padding: 24px; box-shadow: inset 4px 4px 8px rgba(0,0,0,0.04), inset -4px -4px 8px rgba(255,255,255,0.3); border: 1px solid rgba(255,255,255,0.15); margin: 30px 0; }
                .key-label { font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 8px; }
                .key-value { font-family: monospace; font-size: 20px; font-weight: 700; color: #468FEA; background: #ffffff; padding: 12px 20px; border-radius: 12px; border: 1px dashed rgba(70, 143, 234, 0.3); display: inline-block; letter-spacing: 0.05em; }
                .copy-button { display: inline-block; padding: 14px 32px; background: #468FEA; color: white; text-decoration: none; border-radius: 9999px; font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; box-shadow: 8px 8px 16px rgba(70, 143, 234, 0.2); margin-top: 10px; }
                .footer { border-top: 1px solid rgba(0, 0, 0, 0.05); margin-top: 35px; padding-top: 24px; font-size: 11px; color: #94a3b8; font-weight: bold; }
              </style>
            </head>
            <body>
              <div class="email-container">
                <div class="logo-container">
                  <span class="logo-text">L</span>
                </div>
                <h2>Your Premium Key</h2>
                <p>Thank you for purchasing the <strong>${tier} Pass</strong>. Your workspace is confirmed and active for <strong>${durationDays} days</strong>.</p>
                
                <div class="key-card">
                  <div class="key-label">Active License Key</div>
                  <div class="key-value">${licenseKey}</div>
                </div>

                <p style="font-size: 12px;">Copy the key above and paste it inside your LANpad desktop client settings panel to unlock all features.</p>
                
                <div class="footer">
                  © 2026 LANPAD. All rights reserved.<br>
                  Security sync systems operational.
                </div>
              </div>
            </body>
          </html>
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
