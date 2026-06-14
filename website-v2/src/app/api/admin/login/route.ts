import { NextRequest, NextResponse } from "next/server";
import { getDbUsers } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;
    
    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
    }

    const users = await getDbUsers();
    
    // Find a matching user by email or name (case-insensitive) and verify password
    const user = users.find(u => 
      (u.email.toLowerCase() === username.trim().toLowerCase() || u.name.toLowerCase() === username.trim().toLowerCase()) && 
      (u.password || "check") === password
    );
    
    if (user) {
      if (user.status === "suspended") {
        return NextResponse.json({ error: "Your account is suspended." }, { status: 403 });
      }
      return NextResponse.json({ success: true, user });
    }
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
