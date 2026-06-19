import { NextRequest, NextResponse } from "next/server";
import { getReferralCodeByEmail, createReferralCode, getReferrals, getEmailByReferralCode } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const code = searchParams.get("code");

    if (code) {
      const cleanCode = code.trim().toUpperCase();
      const referrerEmail = await getEmailByReferralCode(cleanCode);
      return NextResponse.json({
        valid: !!referrerEmail,
        email: referrerEmail
      });
    }

    if (!email) {
      return NextResponse.json({ error: "Email or code is required" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const referralCode = await getReferralCodeByEmail(cleanEmail);

    // Filter referrals for this user
    const allReferrals = await getReferrals();
    const userReferrals = allReferrals.filter(
      (r) => r.referrer_email.trim().toLowerCase() === cleanEmail
    );

    return NextResponse.json({
      referralCode,
      referrals: userReferrals,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();
    if (!email || !code) {
      return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim().toUpperCase();

    // Basic validation for code: alphanumeric, 3-15 chars
    if (!/^[A-Z0-9]{3,15}$/.test(cleanCode)) {
      return NextResponse.json(
        { error: "Code must be 3-15 characters long and contain only letters and numbers." },
        { status: 400 }
      );
    }

    await createReferralCode(cleanEmail, cleanCode);
    return NextResponse.json({ success: true, referralCode: cleanCode });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
