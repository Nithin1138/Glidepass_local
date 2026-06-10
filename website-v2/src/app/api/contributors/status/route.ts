import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Pool } from "pg";

const pool = process.env.DATABASE_URL ? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
}) : null;

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ status: "unauthorized" }, { status: 401 });
    }

    if (!pool) {
      return NextResponse.json({ status: "active", message: "Database not configured, assuming active" });
    }

    const client = await pool.connect();
    try {
      // Create user if they don't exist
      await client.query(
        "INSERT INTO vit_contributors (email, status) VALUES ($1, 'active') ON CONFLICT DO NOTHING",
        [session.user.email]
      );
      
      const res = await client.query("SELECT status FROM vit_contributors WHERE email = $1", [session.user.email]);
      
      if (res.rows.length > 0) {
        return NextResponse.json({ status: res.rows[0].status });
      } else {
        return NextResponse.json({ status: "active" });
      }
    } finally {
      client.release();
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
