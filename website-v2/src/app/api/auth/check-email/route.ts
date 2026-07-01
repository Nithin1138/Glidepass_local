import { NextRequest, NextResponse } from "next/server";
import { getDbUsers } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    
    if (!email) {
      return NextResponse.json({ exists: false });
    }

    const users = await getDbUsers();
    const foundUser = users.find(
      (u: any) => u.email && u.email.toLowerCase() === email.trim().toLowerCase()
    );

    if (foundUser) {
      return NextResponse.json({ 
        exists: true, 
        suspended: foundUser.status === "suspended" 
      });
    }

    return NextResponse.json({ exists: false });
  } catch (error: any) {
    console.error("check-email error:", error);
    return NextResponse.json({ exists: false, error: error.message }, { status: 500 });
  }
}
