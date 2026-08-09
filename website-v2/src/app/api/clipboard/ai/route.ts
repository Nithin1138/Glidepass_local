import { NextResponse } from "next/server";
import { getClipboardItemById } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { itemId, prompt, model } = body;

    if (!itemId || !prompt || !model) {
      return NextResponse.json({ success: false, error: "itemId, prompt, and model are required" }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ success: false, error: "GROQ_API_KEY is not configured" }, { status: 500 });
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
      // It's just plain text, do nothing
    }

    const systemPrompt = `You are a helpful assistant. You will be provided with the contents of a clipboard item. Answer the user's question based on this content.\n\nClipboard Item Content:\n${textContent}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2048,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", errorText);
      return NextResponse.json({ success: false, error: "Failed to generate AI response. Make sure the model exists and your API key is correct." }, { status: response.status });
    }

    const data = await response.json();
    const aiMessage = data.choices?.[0]?.message?.content || "No response generated.";

    return NextResponse.json({ success: true, response: aiMessage });

  } catch (error) {
    console.error("Error in clipboard AI route:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
