import { NextResponse } from "next/server";
import { getClipboardItemById } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { itemId, prompt, history, model } = body;

    if (!itemId || !prompt) {
      return NextResponse.json({ success: false, error: "itemId and prompt are required" }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    if (!groqKey && !geminiKey) {
      return NextResponse.json(
        { success: false, error: "Neither GEMINI_API_KEY nor GROQ_API_KEY is configured in your environment." },
        { status: 500 }
      );
    }

    const item = await getClipboardItemById(itemId);
    if (!item) {
      return NextResponse.json({ success: false, error: "Item not found" }, { status: 404 });
    }

    let textContent = item.content;
    try {
      const parsed = JSON.parse(item.content);
      if (parsed.isFile) {
        if (parsed.fileType.startsWith("text/") || parsed.fileType.includes("json") || parsed.fileType.includes("javascript") || parsed.fileType.includes("typescript")) {
          if (parsed.data && parsed.data.startsWith("data:")) {
            const base64Data = parsed.data.split(",")[1];
            textContent = Buffer.from(base64Data, "base64").toString("utf-8");
          } else {
            textContent = parsed.data || "";
          }
        } else {
          textContent = `[File Upload - Name: ${parsed.fileName}, Type: ${parsed.fileType}, Size: ${parsed.fileSize} bytes]\n(Note: The actual file content is binary or an image and cannot be read as text by the AI.)`;
        }
      }
    } catch (e) {
      // It's plain text
    }

    const systemPrompt = `You are a world-class, professional AI assistant built into LANpad.
Your response MUST be concise, professional, structured, and directly answer the user's request.
Do NOT start with conversational meta-introductions or filler like "Sure!", "Here is...", "Alright!", or "Based on the content provided...".
Start immediately with a clear summary heading or bold takeaway.
Format key terms, section headings, and concepts using clean Markdown bolding (**Term:**), bullet points, and code blocks where appropriate.

Clipboard Item Context:
Title: ${item.title}
Content:
${textContent}`;

    // Format chat history turns if provided
    const formattedHistory = Array.isArray(history)
      ? history.map((msg: any) => ({
          role: msg.role === "assistant" ? "assistant" : "user",
          content: String(msg.content)
        }))
      : [];

    const messages = [
      { role: "system", content: systemPrompt },
      ...formattedHistory,
      { role: "user", content: prompt }
    ];

    let aiMessage = "";
    const requestedModel = (model || "").toLowerCase();
    const wantsGemini = requestedModel.includes("gemini") || (!groqKey && Boolean(geminiKey));

    // ── 1. Try Google Gemini API ──────────────────────────────────────────
    if (wantsGemini && geminiKey) {
      const geminiModel = requestedModel.includes("gemini") ? model : "gemini-2.5-flash";
      try {
        const geminiRes = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${geminiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: geminiModel,
            messages,
            temperature: 0.4,
            max_tokens: 2048,
          })
        });

        if (geminiRes.ok) {
          const gData = await geminiRes.json();
          aiMessage = gData.choices?.[0]?.message?.content || "";
        } else {
          console.error("Gemini API error response:", await geminiRes.text());
        }
      } catch (ge) {
        console.error("Gemini fetch error:", ge);
      }
    }

    // ── 2. Try Groq Cloud (or fallback if Gemini wasn't used/failed) ──────
    if (!aiMessage && groqKey) {
      const targetModel = !requestedModel.includes("gemini") && model ? model : "llama-3.3-70b-versatile";

      let response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${groqKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: targetModel,
          messages,
          temperature: 0.5,
          max_tokens: 2048,
        })
      });

      // Fallback model if primary Groq model fails
      if (!response.ok && targetModel !== "llama-3.1-8b-instant") {
        response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${groqKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages,
            temperature: 0.5,
            max_tokens: 2048,
          })
        });
      }

      if (response.ok) {
        const data = await response.json();
        aiMessage = data.choices?.[0]?.message?.content || "";
      } else {
        const errorText = await response.text();
        console.error("Groq API error:", errorText);
      }
    }

    if (!aiMessage) {
      return NextResponse.json(
        { success: false, error: "Failed to generate AI response. Please check your GEMINI_API_KEY or GROQ_API_KEY." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, response: aiMessage });

  } catch (error) {
    console.error("Error in clipboard AI route:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
