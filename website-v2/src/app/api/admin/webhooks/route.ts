import { NextRequest, NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const raw = await getSetting("webhooks_config", "[]");
    const webhooks = JSON.parse(raw);
    return NextResponse.json({ success: true, webhooks });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, url, event, active, action } = body;
    const raw = await getSetting("webhooks_config", "[]");
    let webhooks = JSON.parse(raw);

    if (action === "toggle") {
      webhooks = webhooks.map((w: any) => w.id === id ? { ...w, active: !w.active } : w);
    } else {
      // Create or edit
      if (!name || !url || !event) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }
      const newWh = {
        id: id || String(Date.now()),
        name,
        url,
        event,
        active: active !== undefined ? active : true
      };
      const idx = webhooks.findIndex((w: any) => w.id === newWh.id);
      if (idx > -1) {
        webhooks[idx] = newWh;
      } else {
        webhooks.push(newWh);
      }
    }

    await setSetting("webhooks_config", JSON.stringify(webhooks));
    return NextResponse.json({ success: true, webhooks });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    const raw = await getSetting("webhooks_config", "[]");
    let webhooks = JSON.parse(raw);
    webhooks = webhooks.filter((w: any) => w.id !== id);
    await setSetting("webhooks_config", JSON.stringify(webhooks));
    return NextResponse.json({ success: true, webhooks });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
