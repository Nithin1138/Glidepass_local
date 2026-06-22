import { NextRequest, NextResponse } from "next/server";
import { readHubs, createHub, verifyLicenseKey, getDbUsers, deleteHub } from "@/lib/db";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const creatorEmail = searchParams.get("creatorEmail") || "";
    const contributorEmail = searchParams.get("contributorEmail") || "";
    
    let hubs = await readHubs(false);

    if (creatorEmail) {
      hubs = hubs.filter(h => h.creatorEmail.toLowerCase() === creatorEmail.toLowerCase());
    }

    if (contributorEmail) {
      const { readHubContributors } = await import("@/lib/db");
      const allContributors = await readHubContributors();
      
      hubs = hubs.filter(h => {
        const isPublic = h.visibility !== "private";
        const isCreator = h.creatorEmail.toLowerCase() === contributorEmail.toLowerCase();
        const hasRelation = allContributors.some(
          c => c.hubId === h.id && c.contributorEmail.toLowerCase() === contributorEmail.toLowerCase()
        );
        return isPublic || isCreator || hasRelation;
      });

      const mapped = hubs.map(h => {
        const relation = allContributors.find(
          c => c.hubId === h.id && c.contributorEmail.toLowerCase() === contributorEmail.toLowerCase()
        );
        return {
          ...h,
          myStatus: relation ? relation.status : null
        };
      });
      return NextResponse.json({ success: true, hubs: mapped });
    }

    return NextResponse.json({ success: true, hubs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, creatorEmail, creatorName, licenseKey, visibility } = body;

    if (!title || !creatorEmail || !creatorName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Authorize: Open hub creation for all providers/creators
    let isAuthorized = true;

    const hubId = "hub_" + crypto.randomBytes(6).toString("hex");
    const newHub = {
      id: hubId,
      title,
      description,
      creatorEmail,
      createdAt: new Date().toISOString(),
      isDeleted: false,
      visibility: visibility || "public"
    };

    await createHub(newHub);

    return NextResponse.json({ success: true, hub: newHub });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const creatorEmail = searchParams.get("creatorEmail");

    if (!id || !creatorEmail) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    // Authenticate: Ensure caller is the owner of the hub
    const hubs = await readHubs(true);
    const hub = hubs.find(h => h.id === id);
    if (!hub) {
      return NextResponse.json({ error: "Hub not found" }, { status: 404 });
    }

    if (hub.creatorEmail.toLowerCase() !== creatorEmail.toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized. Only the hub creator can delete this hub." }, { status: 403 });
    }

    await deleteHub(id);
    return NextResponse.json({ success: true, msg: "Hub deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, title, description, creatorEmail, visibility, allowedTypes, subCategories, categories } = body;

    if (!id || !creatorEmail) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const hubs = await readHubs(true);
    const hub = hubs.find(h => h.id === id);
    if (!hub) {
      return NextResponse.json({ error: "Hub not found" }, { status: 404 });
    }

    if (hub.creatorEmail.toLowerCase() !== creatorEmail.toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized. Only the hub creator can update settings." }, { status: 403 });
    }

    const updatedHub = {
      ...hub,
      title: title || hub.title,
      description: description !== undefined ? description : hub.description,
      visibility: visibility || hub.visibility,
      allowedTypes: allowedTypes || hub.allowedTypes,
      subCategories: subCategories !== undefined ? subCategories : hub.subCategories,
      categories: categories !== undefined ? categories : hub.categories
    };

    const { updateHub } = await import("@/lib/db");
    await updateHub(updatedHub);

    return NextResponse.json({ success: true, hub: updatedHub });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
