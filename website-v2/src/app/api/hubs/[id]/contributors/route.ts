import { NextRequest, NextResponse } from "next/server";
import { readHubContributors, addContributorRequest, updateContributorStatus, readHubs } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET contributors for a specific hub
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: hubId } = await params;
    const allContributors = await readHubContributors();
    const filtered = allContributors.filter(c => c.hubId === hubId);
    return NextResponse.json({ success: true, contributors: filtered });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: request to join, or approve/reject contributor requests
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: hubId } = await params;
    const body = await req.json();
    const { action, email, requesterEmail } = body;

    // Fetch the hub to determine the creator/owner
    const hubs = await readHubs(true);
    const hub = hubs.find(h => h.id === hubId);
    if (!hub) {
      return NextResponse.json({ error: "Hub not found" }, { status: 404 });
    }

    if (action === "request") {
      // Any user can request to join
      if (!email) {
        return NextResponse.json({ error: "Email is required to request contribution access" }, { status: 400 });
      }
      await addContributorRequest(hubId, email);
      return NextResponse.json({ success: true, msg: "Request submitted successfully" });
    }

    if (action === "approve" || action === "reject") {
      // Only the hub creator/owner can approve or reject
      if (!requesterEmail || requesterEmail.toLowerCase() !== hub.creatorEmail.toLowerCase()) {
        return NextResponse.json({ error: "Unauthorized. Only the hub creator can approve or reject contributor requests." }, { status: 403 });
      }

      if (!email) {
        return NextResponse.json({ error: "Target contributor email is required" }, { status: 400 });
      }

      const status = action === "approve" ? "approved" : "rejected";
      await updateContributorStatus(hubId, email, status);
      return NextResponse.json({ success: true, msg: `Contributor ${action}d successfully` });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
