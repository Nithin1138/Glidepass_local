import { NextRequest, NextResponse } from "next/server";
import { readResources, createResource, verifyLicenseKey, getDbUsers, readHubs, isApprovedContributor } from "@/lib/db";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.toLowerCase() || "";
    const type = searchParams.get("type") || "";
    const language = searchParams.get("language") || "";
    const sort = searchParams.get("sort") || "recent"; // "recent", "views", "sends", "copies"
    const includeDeleted = searchParams.get("includeDeleted") === "true";
    const hubId = searchParams.get("hubId") || "";

    let resources = await readResources(includeDeleted);

    if (hubId) {
      resources = resources.filter((r) => r.hubId === hubId);
    }

    if (query) {
      resources = resources.filter(
        (r) =>
          r.title.toLowerCase().includes(query) ||
          r.content.toLowerCase().includes(query) ||
          r.tags.some((t) => t.toLowerCase().includes(query))
      );
    }

    if (type) {
      resources = resources.filter((r) => r.type === type);
    }

    if (language) {
      resources = resources.filter((r) => r.language === language);
    }

    if (sort === "views") {
      resources.sort((a, b) => b.views - a.views);
    } else if (sort === "sends") {
      resources.sort((a, b) => b.sends - a.sends);
    } else if (sort === "copies") {
      resources.sort((a, b) => b.copies - a.copies);
    } else {
      // default: recent
      resources.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
    }

    const users = await getDbUsers();
    const userMap = new Map<string, any>();
    users.forEach((u: any) => {
      if (u.email) userMap.set(u.email.toLowerCase(), u);
    });

    const anonymizedResources = resources.map((r) => {
      const email = r.creatorEmail?.toLowerCase();
      if (email) {
        const userObj = userMap.get(email);
        if (userObj && userObj.sayMyName === false) {
          return { ...r, creatorName: "Anonymous" };
        }
      }
      return r;
    });

    return NextResponse.json({ success: true, resources: anonymizedResources });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, type, language, tags, content, creatorEmail, creatorName, licenseKey, hubId, subCategory, category, topic, description } = body;

    if (!title || !type || !content || !creatorEmail || !creatorName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Hub authorization check
    let isHubAuthorized = false;
    if (hubId) {
      const hubs = await readHubs(true);
      const hub = hubs.find(h => h.id === hubId);
      if (!hub) {
        return NextResponse.json({ error: "Target community hub not found" }, { status: 404 });
      }
      
      const isOwner = hub.creatorEmail.toLowerCase() === creatorEmail.trim().toLowerCase();
      const isApproved = await isApprovedContributor(hubId, creatorEmail.trim());
      
      let isAdmin = false;
      try {
        const users = await getDbUsers();
        const user = users.find(u => u.email.toLowerCase() === creatorEmail.trim().toLowerCase());
        if (user && (user.role === "ADMIN MASTER" || user.role === "Developer")) {
          isAdmin = true;
        }
      } catch (e) {}

      if (!isOwner && !isApproved && !isAdmin) {
        return NextResponse.json({ error: "Unauthorized. You must be an approved contributor to publish to this hub." }, { status: 403 });
      }
      isHubAuthorized = true;
    }

    // 1. Authorize: Open resource creation for creators
    let isAuthorized = true;
    let limit = 9999;

    // 2. Check limits (resources created by this email in the current calendar month)
    const allResources = await readResources(true);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const userMonthlyCount = allResources.filter(r => 
      !r.isDeleted &&
      r.creatorEmail?.toLowerCase() === creatorEmail.toLowerCase() &&
      r.createdAt && new Date(r.createdAt) >= startOfMonth
    ).length;

    if (userMonthlyCount >= limit) {
      return NextResponse.json({ error: `Monthly upload limit reached (${userMonthlyCount}/${limit}). Upgrade your plan for more uploads.` }, { status: 429 });
    }

    // Check Hub Category & Topic limits and Allowed Types
    if (hubId && category) {
      const hubs = await readHubs(true);
      const hub = hubs.find(h => h.id === hubId);
      if (hub && hub.categories) {
        const catConfig = hub.categories.find(c => c.name.toLowerCase() === category.trim().toLowerCase());
        if (catConfig) {
          // Check Allowed Resource Types in Category
          if (catConfig.allowedTypes && catConfig.allowedTypes.length > 0) {
            if (!catConfig.allowedTypes.includes(type)) {
              return NextResponse.json({ error: `Resource type "${type}" is not allowed in category "${category}". Allowed: ${catConfig.allowedTypes.join(", ")}` }, { status: 400 });
            }
          }

          // Check Category Overall Resource Limit
          if (catConfig.limit !== undefined && catConfig.limit !== null) {
            const count = allResources.filter(r => r.hubId === hubId && !r.isDeleted && (r.category?.toLowerCase() === category.trim().toLowerCase() || r.subCategory?.toLowerCase() === category.trim().toLowerCase())).length;
            if (count >= catConfig.limit) {
              return NextResponse.json({ error: `Upload limit reached for collection "${category}". Maximum allowed: ${catConfig.limit}` }, { status: 429 });
            }
          }

          // Check Topics Limit: max number of unique topic-dates allowed in this collection
          // Check Topics Limit: max number of unique topic-dates allowed in this collection (enforced per day)
          const topicsMax = catConfig.topicsLimit;
          if (topic && topicsMax !== undefined && topicsMax !== null) {
            const catResources = allResources.filter(r =>
              r.hubId === hubId &&
              !r.isDeleted &&
              (r.category?.toLowerCase() === category.trim().toLowerCase() || r.subCategory?.toLowerCase() === category.trim().toLowerCase())
            );
            const existingTopics = Array.from(new Set(catResources.map(r => r.topic?.toLowerCase()).filter(Boolean)));
            const todayStr = new Date().toISOString().split("T")[0];
            const incomingTopicLower = topic.trim().toLowerCase();

            // Count how many unique topics are active/created today
            const todayActiveTopics = existingTopics.filter(name => {
              if (name === todayStr) return true;
              const topicResources = catResources.filter(r => r.topic?.toLowerCase() === name);
              return topicResources.some(r => r.createdAt && r.createdAt.startsWith(todayStr));
            });

            // If the incoming topic is not yet active today, and we've reached the daily limit, reject
            const isIncomingActiveToday = incomingTopicLower === todayStr || catResources.some(r => r.topic?.toLowerCase() === incomingTopicLower && r.createdAt && r.createdAt.startsWith(todayStr));
            if (!isIncomingActiveToday && todayActiveTopics.length >= topicsMax) {
              return NextResponse.json({ error: `Daily topics limit reached for collection "${category}". Only ${topicsMax} unique topics allowed per day.` }, { status: 429 });
            }
          }

          // Check Per-Topic Resource Limit
          if (topic) {
            // Priority: individual topic.limit > collection-level resourcesPerTopic
            let perTopicLimit: number | undefined = undefined;

            // Check individual topic config limit first
            if (catConfig.topics) {
              const topicConfig = catConfig.topics.find((t: any) => t.name.toLowerCase() === topic.trim().toLowerCase());
              if (topicConfig && topicConfig.limit !== undefined && topicConfig.limit !== null) {
                perTopicLimit = topicConfig.limit;
              }
            }

            // Fallback to collection-level resourcesPerTopic
            if (perTopicLimit === undefined && catConfig.resourcesPerTopic !== undefined && catConfig.resourcesPerTopic !== null) {
              perTopicLimit = catConfig.resourcesPerTopic;
            }

            if (perTopicLimit !== undefined) {
              const topicCount = allResources.filter(r =>
                r.hubId === hubId &&
                !r.isDeleted &&
                (r.category?.toLowerCase() === category.trim().toLowerCase() || r.subCategory?.toLowerCase() === category.trim().toLowerCase()) &&
                r.topic?.toLowerCase() === topic.trim().toLowerCase()
              ).length;
              if (topicCount >= perTopicLimit) {
                return NextResponse.json({ error: `Upload limit reached for topic "${topic}" in collection "${category}". Maximum resources per topic: ${perTopicLimit}` }, { status: 429 });
              }
            }
          }
        }
      }
    }

    // 3. Create resource
    const newResource = {
      id: crypto.randomUUID(),
      title,
      type,
      language: language || undefined,
      tags: Array.isArray(tags) ? tags : [],
      content,
      description: description || undefined,
      views: 0,
      copies: 0,
      sends: 0,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      creatorEmail,
      creatorName,
      hubId: hubId || undefined,
      subCategory: category || subCategory || undefined,
      category: category || subCategory || undefined,
      topic: topic || undefined
    };

    await createResource(newResource);

    return NextResponse.json({ success: true, resource: newResource });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

