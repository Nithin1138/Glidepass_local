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
        suspended: foundUser.status === "suspended",
        role: foundUser.role || "Contributor",
        name: foundUser.name || "",
        email: foundUser.email || "",
        sayMyName: foundUser.sayMyName !== false
      });
    }

    return NextResponse.json({ exists: false });
  } catch (error: any) {
    console.error("check-email error:", error);
    return NextResponse.json({ exists: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, sayMyName } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }
    const { getDbUsers, updateDbUser } = await import("@/lib/db");
    const users = await getDbUsers();
    const foundUser = users.find(
      (u: any) => u.email && u.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (!foundUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const updatedUser = {
      ...foundUser,
      sayMyName: sayMyName !== false
    };
    await updateDbUser(updatedUser);
    return NextResponse.json({ success: true, sayMyName: updatedUser.sayMyName });
  } catch (error: any) {
    console.error("check-email update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
