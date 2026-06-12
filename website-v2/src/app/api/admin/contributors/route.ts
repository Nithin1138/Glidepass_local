import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = process.env.DATABASE_URL ? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
}) : null;

export const dynamic = "force-dynamic";

export async function GET() {
  if (!pool) return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT email, status, name, regno, college FROM vit_contributors ORDER BY email ASC");
    return NextResponse.json(res.rows, {
      headers: {
        "Cache-Control": "public, s-maxage=10, stale-while-revalidate=59"
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  if (!pool) return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  
  try {
    const { email, status } = await request.json();
    if (!email || !status) return NextResponse.json({ error: "Email and status are required" }, { status: 400 });

    const client = await pool.connect();
    try {
      await client.query(
        "INSERT INTO vit_contributors (email, status) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET status = EXCLUDED.status",
        [email, status]
      );
      return NextResponse.json({ success: true, email, status });
    } finally {
      client.release();
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
