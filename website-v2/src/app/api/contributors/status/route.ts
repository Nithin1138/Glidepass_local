import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Pool } from "pg";
import { parseVitEmail } from "@/lib/db";

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
      return NextResponse.json({ status: "active", sayMyName: false, message: "Database not configured, assuming active" });
    }

    const { name, regno, college } = parseVitEmail(session.user.email);

    const client = await pool.connect();
    try {
      // Create or update user metadata on status check
      await client.query(
        `INSERT INTO vit_contributors (email, status, name, regno, college) 
         VALUES ($1, 'active', $2, $3, $4) 
         ON CONFLICT (email) DO UPDATE SET name = $2, regno = $3, college = $4`,
        [session.user.email, name, regno, college]
      );
      
      const res = await client.query("SELECT status, say_my_name FROM vit_contributors WHERE email = $1", [session.user.email]);
      
      if (res.rows.length > 0) {
        return NextResponse.json({ 
          status: res.rows[0].status,
          sayMyName: !!res.rows[0].say_my_name
        });
      } else {
        return NextResponse.json({ status: "active", sayMyName: false });
      }
    } finally {
      client.release();
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ status: "unauthorized" }, { status: 401 });
    }

    const { sayMyName } = await request.json();

    if (pool) {
      const client = await pool.connect();
      try {
        await client.query(
          "UPDATE vit_contributors SET say_my_name = $1 WHERE email = $2",
          [sayMyName, session.user.email]
        );
      } finally {
        client.release();
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
