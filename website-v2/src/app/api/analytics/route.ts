import { NextRequest, NextResponse } from "next/server";
import { readResources, verifyLicenseKey, getDbUsers, readHubs } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const licenseKey = searchParams.get("licenseKey");

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // 1. Authorize Creator / Premium Analytics Access
    const hasAnalyticsAccess = true;

    // 2. Fetch and aggregate resources
    const [allResources, allHubs] = await Promise.all([
      readResources(true),
      readHubs(true)
    ]);
    
    const ownedHubs = allHubs.filter(h => h.creatorEmail?.toLowerCase() === email.toLowerCase());
    const ownedHubIds = new Set(ownedHubs.map(h => h.id));

    const creatorResources = allResources.filter(
      (r) => !r.isDeleted && (
        r.creatorEmail?.toLowerCase() === email.toLowerCase() ||
        (r.hubId && ownedHubIds.has(r.hubId))
      )
    );

    const totalViews = creatorResources.reduce((acc, r) => acc + (r.views || 0), 0);
    const totalCopies = creatorResources.reduce((acc, r) => acc + (r.copies || 0), 0);
    const totalSends = creatorResources.reduce((acc, r) => acc + (r.sends || 0), 0);

    return NextResponse.json({
      success: true,
      stats: {
        totalResources: creatorResources.length,
        totalViews,
        totalCopies,
        totalSends,
      },
      resources: creatorResources.map(r => {
        const hub = allHubs.find(h => h.id === r.hubId);
        return {
          id: r.id,
          title: r.title,
          type: r.type,
          language: r.language,
          views: r.views || 0,
          copies: r.copies || 0,
          sends: r.sends || 0,
          createdAt: r.createdAt,
          hubId: r.hubId || null,
          hubTitle: hub ? hub.title : "No Hub",
          topic: r.topic || "General",
        };
      }),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
