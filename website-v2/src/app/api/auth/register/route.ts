import { NextRequest, NextResponse } from "next/server";
import { updateDbUser } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, email, role, status, verified, activity, joinedDate, activeDevices, premium, password, referral, consentEmails } = body;
    
    if (!id || !name || !email || !role) {
      return NextResponse.json({ success: false, error: "Missing required fields." }, { status: 400 });
    }

    const newUser = {
      id,
      name,
      email,
      role,
      status: status || "active",
      verified: verified !== undefined ? verified : true,
      activity: activity || "Active now",
      joinedDate: joinedDate || new Date().toISOString().split("T")[0],
      activeDevices: activeDevices || 1,
      premium: premium !== undefined ? premium : true,
      password: password || "check",
      consentEmails: consentEmails !== undefined ? consentEmails : false,
      referral: referral || null
    };

    await updateDbUser(newUser);

    console.log(`User registered successfully: ${email}. Referral source: ${referral}`);

    return NextResponse.json({ success: true, user: newUser });
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
