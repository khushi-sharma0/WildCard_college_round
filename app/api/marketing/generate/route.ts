import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: Request) {
  try {
    const { brief } = await req.json();

    if (!brief) {
      return NextResponse.json({ error: "Brief is required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      // Mock fallback if no API key
      return NextResponse.json({
        subject: `Exciting News: ${brief.substring(0, 30)}...`,
        body: `Hi {{name}},\n\nWe wanted to share some exciting updates with you regarding: ${brief}.\n\nStay tuned for more details coming your way soon!\n\nBest,\nThe Nexus Team`
      });
    }

    try {
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `You are an expert SaaS marketer. Based on this brief: "${brief}", generate an email marketing campaign.
Return ONLY a JSON object with two keys:
"subject" (a catchy email subject line)
"body" (the email body, use {{name}} for the recipient's name). No markdown blocks around the JSON.`;

      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        contents: prompt
      });

      let text = response.text || "";
      if (text.startsWith("```json")) {
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
      } else if (text.startsWith("```")) {
        text = text.replace(/```/g, "").trim();
      }

      const parsed = JSON.parse(text);
      return NextResponse.json(parsed);
    } catch (aiErr: any) {
      console.warn("AI generation call fallback:", aiErr.message);
      return NextResponse.json({
        subject: `Exclusive Update: ${brief.substring(0, 30)}`,
        body: `Hi {{name}},\n\nWe are thrilled to share an announcement regarding ${brief}.\n\nTake advantage of this today and accelerate your workflow with Nexus.\n\nWarm regards,\nThe Nexus Team`
      });
    }
  } catch (error: any) {
    console.error("AI Gen Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
