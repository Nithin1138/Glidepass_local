import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getResourceById, incrementResourceStats } from "@/lib/db";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const resource = await getResourceById(id);
    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    // Default fetch increments views
    await incrementResourceStats(id, "views");

    return NextResponse.json({ success: true, resource });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action } = body; // "copy" or "send"

    if (action !== "copy" && action !== "send") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await incrementResourceStats(id, action === "copy" ? "copies" : "sends");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const body = await req.json();

    let userEmail = session?.user?.email?.toLowerCase();
    if (!userEmail && (body.requesterEmail || body.creatorEmail)) {
      userEmail = (body.requesterEmail || body.creatorEmail).toLowerCase();
    }

    if (!userEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { updateResource, getResourceById, readHubs, getDbUsers } = await import("@/lib/db");
    const existing = await getResourceById(id);
    if (!existing) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    // Authorization checks
    const isResourceCreator = existing.creatorEmail?.toLowerCase() === userEmail;

    let isHubOwner = false;
    if (existing.hubId) {
      const hubs = await readHubs(true);
      const hub = hubs.find(h => h.id === existing.hubId);
      if (hub && hub.creatorEmail.toLowerCase() === userEmail) {
        isHubOwner = true;
      }
    }

    let isAdmin = false;
    try {
      const users = await getDbUsers();
      const user = users.find(u => u.email.toLowerCase() === userEmail);
      if (user && (user.role === "ADMIN MASTER" || user.role === "Developer")) {
        isAdmin = true;
      }
    } catch (e) {}

    const isAuthorized = isResourceCreator || isHubOwner || isAdmin;
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized to update this resource" }, { status: 403 });
    }

    // If resource is locked and the request is not unlocking it, block updates to content fields
    if (existing.isLocked && body.isLocked !== false && (
      (body.title !== undefined && body.title !== existing.title) ||
      (body.content !== undefined && body.content !== existing.content) ||
      (body.tags !== undefined && JSON.stringify(body.tags) !== JSON.stringify(existing.tags)) ||
      (body.language !== undefined && body.language !== existing.language)
    )) {
      return NextResponse.json({ error: "This resource is locked. Unlock it to edit." }, { status: 400 });
    }

    const updated = {
      ...existing,
      ...body,
      id
    };
    await updateResource(updated);
    return NextResponse.json({ success: true, resource: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const emailParam = searchParams.get("email");
    const session = await getServerSession(authOptions);
    const userEmailRaw = session?.user?.email || emailParam;
    if (!userEmailRaw) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { updateResource, deleteResource, getResourceById, readHubs, getDbUsers } = await import("@/lib/db");
    const existing = await getResourceById(id);
    if (!existing) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    // Authorization checks for delete: only Hub Owner or Admins or Resource Creator
    const userEmail = userEmailRaw.toLowerCase();
    let isHubOwner = false;
    if (existing.hubId) {
      const hubs = await readHubs(true);
      const hub = hubs.find(h => h.id === existing.hubId);
      if (hub && hub.creatorEmail.toLowerCase() === userEmail) {
        isHubOwner = true;
      }
    }

    let isAdmin = false;
    try {
      const users = await getDbUsers();
      const user = users.find(u => u.email.toLowerCase() === userEmail);
      if (user && (user.role === "ADMIN MASTER" || user.role === "Developer")) {
        isAdmin = true;
      }
    } catch (e) {}

    const isResourceCreator = existing.creatorEmail?.toLowerCase() === userEmail;
    const isAuthorizedDelete = isHubOwner || isAdmin || isResourceCreator;
    if (!isAuthorizedDelete) {
      return NextResponse.json({ error: "Unauthorized. Only hub owners, admins, or the resource creator can delete this resource." }, { status: 403 });
    }

    const permanent = searchParams.get("permanent") === "true";
    if (permanent) {
      await deleteResource(id);
    } else {
      existing.isDeleted = true;
      await updateResource(existing);
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

