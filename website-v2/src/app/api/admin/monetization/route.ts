import { NextRequest, NextResponse } from "next/server";
import { 
  getSubscriptions, getCoupons, addSubscription, deleteSubscription, addCoupon, 
  toggleCoupon, deleteCoupon, getMonetizationSettings, setMonetizationSettings, 
  getAllLicenses, generateLicenseKey, deleteLicense 
} from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const subscriptions = await getSubscriptions();
    const coupons = await getCoupons();
    const settings = await getMonetizationSettings();
    const licenses = await getAllLicenses();
    return NextResponse.json({ subscriptions, coupons, settings, licenses });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, data } = body;

    if (type === "subscription") {
      await addSubscription(data);
      return NextResponse.json({ success: true });
    } else if (type === "coupon") {
      await addCoupon(data);
      return NextResponse.json({ success: true });
    } else if (type === "settings") {
      await setMonetizationSettings(data);
      return NextResponse.json({ success: true });
    } else if (type === "license") {
      const { tier, email, durationDays } = data;
      const key = await generateLicenseKey(tier, email, durationDays || 30);
      return NextResponse.json({ success: true, key });
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, code } = body;

    if (type === "coupon" && code) {
      await toggleCoupon(code);
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Invalid type or missing code" }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");
    const code = searchParams.get("code");
    const key = searchParams.get("key");

    if (type === "subscription" && id) {
      await deleteSubscription(id);
      return NextResponse.json({ success: true });
    } else if (type === "coupon" && code) {
      await deleteCoupon(code);
      return NextResponse.json({ success: true });
    } else if (type === "license" && key) {
      await deleteLicense(key);
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
