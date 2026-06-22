import { NextResponse } from "next/server";
import { getDbUsers } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const users = await getDbUsers();
  return NextResponse.json({
    hasDbUrl: !!process.env.DATABASE_URL,
    dbUrlPrefix: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 30) : null,
    nodeEnv: process.env.NODE_ENV,
    usersCount: users.length,
    usersList: users
  });
}
