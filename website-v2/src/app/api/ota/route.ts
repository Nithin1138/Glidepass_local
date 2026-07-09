import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { logAudit, getOtaFile, setOtaFile } from "@/lib/db";

export const dynamic = "force-dynamic";

const getCustomFilePath = (file: string) => {
  const isServerless = process.env.VERCEL || process.env.NODE_ENV === "production";
  const baseDir = isServerless ? "/tmp" : path.join(/*turbopackIgnore: true*/ process.cwd(), "data");
  return path.join(baseDir, "ota", file);
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get("file");

  const allowedFiles = ["index.html", "center.html", "vitcodes.html", "downloads/version.json", "downloads/versions_history.json"];
  if (!file || !allowedFiles.includes(file)) {
    return NextResponse.json({ error: "Invalid file parameter." }, { status: 400 });
  }

  try {
    // 1. Try reading from Database
    const dbContent = await getOtaFile(file);
    if (dbContent !== null) {
      return new NextResponse(dbContent, {
        headers: { "Content-Type": file.endsWith(".json") ? "application/json; charset=utf-8" : "text/html; charset=utf-8" },
      });
    }

    // 2. Try reading custom OTA template if it exists in local file storage
    const customFilePath = getCustomFilePath(file);
    if (fs.existsSync(customFilePath)) {
      const content = fs.readFileSync(customFilePath, "utf8");
      return new NextResponse(content, {
        headers: { "Content-Type": file.endsWith(".json") ? "application/json; charset=utf-8" : "text/html; charset=utf-8" },
      });
    }

    // 3. Fall back to default template
    let defaultFilePath;
    if (file === "downloads/version.json") {
      defaultFilePath = path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "downloads", "version.json");
    } else {
      defaultFilePath = path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "templates", file);
    }

    if (fs.existsSync(defaultFilePath)) {
      const content = fs.readFileSync(defaultFilePath, "utf8");
      return new NextResponse(content, {
        headers: { "Content-Type": file.endsWith(".json") ? "application/json; charset=utf-8" : "text/html; charset=utf-8" },
      });
    }

    return NextResponse.json({ error: "Template file not found" }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { file, content } = body;

    const allowedFiles = ["index.html", "center.html", "vitcodes.html", "downloads/version.json", "downloads/versions_history.json"];
    if (!file || !allowedFiles.includes(file)) {
      return NextResponse.json({ error: "Invalid file parameter." }, { status: 400 });
    }

    if (typeof content !== "string") {
      return NextResponse.json({ error: "Content must be a string" }, { status: 400 });
    }

    // 1. Save to Database
    await setOtaFile(file, content);

    // 2. Save to filesystem as secondary cache/local development fallback
    const filePath = getCustomFilePath(file);
    const parentDir = path.dirname(filePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, "utf8");

    // Auto-update version history
    if (file === "downloads/version.json") {
      try {
        const parsed = JSON.parse(content);

        // Load history from DB first, fall back to file history
        let historyList: any[] = [];
        const dbHistory = await getOtaFile("downloads/versions_history.json");
        if (dbHistory !== null) {
          try {
            historyList = JSON.parse(dbHistory);
          } catch (e) { }
        } else {
          const historyPath = getCustomFilePath("downloads/versions_history.json");
          if (fs.existsSync(historyPath)) {
            try {
              historyList = JSON.parse(fs.readFileSync(historyPath, "utf8"));
            } catch (e) { }
          }
        }

        const newEntry = {
          version: parsed.version || "1.0.0",
          windows_url: parsed.windows_url || "",
          mac_url: parsed.mac_url || "",
          force_update: !!parsed.force_update,
          changelog: parsed.changelog || "",
          timestamp: new Date().toISOString()
        };
        // Prepend and filter duplicates
        historyList = [newEntry, ...historyList.filter((item: any) => item.version !== newEntry.version)];

        const historyJson = JSON.stringify(historyList, null, 2);

        // Save history to DB and file cache
        await setOtaFile("downloads/versions_history.json", historyJson);
        const historyPath = getCustomFilePath("downloads/versions_history.json");
        fs.writeFileSync(historyPath, historyJson, "utf8");
      } catch (e) {
        console.error("[ota] Failed to write version history:", e);
      }
    }

    await logAudit(`OTA Template Modified: ${file}`, "Nithin", "127.0.0.1", "success");

    return NextResponse.json({ success: true, message: `Successfully updated ${file}` });
  } catch (error: any) {
    await logAudit("Failed OTA Template Modification", "Nithin", "127.0.0.1", "failed");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
