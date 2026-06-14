import { NextRequest, NextResponse } from "next/server";
import { getDbUsers, getDbRbac, updateDbUser, updateDbRbac } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const users = await getDbUsers();
    const rbac = await getDbRbac();
    return NextResponse.json({ users, rbac });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, data, role, permissions } = body;

    if (type === "user") {
      await updateDbUser(data);
      return NextResponse.json({ success: true });
    } else if (type === "rbac") {
      await updateDbRbac(role, permissions);
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
