import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { image, mimeType } = await req.json();

    if (!image || !mimeType) {
      return NextResponse.json(
        { error: "Missing image data" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-image",
      generationConfig: {
        // @ts-expect-error - responseModalities is valid but not in types yet
        responseModalities: ["TEXT", "IMAGE"],
      },
    });

    const prompt = `Transform this 3D architectural rendering into a photorealistic photograph of a completed project. Keep the exact same layout, dimensions, design elements, and camera angle. Add:
- Realistic natural lighting with soft shadows
- Photorealistic water with reflections and caustics
- Natural landscaping (mature trees, shrubs, flowers, mulch beds)
- Real stone/tile textures on all hardscape
- Realistic grass with natural variation
- Ambient details like dappled sunlight through trees
Make it look like a high-end professional photograph taken on a sunny day.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType,
          data: image,
        },
      },
    ]);

    const response = result.response;
    const parts = response.candidates?.[0]?.content?.parts;

    if (!parts) {
      return NextResponse.json(
        { error: "No response from AI model" },
        { status: 500 }
      );
    }

    for (const part of parts) {
      if (part.inlineData) {
        return NextResponse.json({
          image: part.inlineData.data,
          mimeType: part.inlineData.mimeType,
        });
      }
    }

    // If no image was returned, check for text response
    const textPart = parts.find((p: { text?: string }) => p.text);
    return NextResponse.json(
      {
        error:
          textPart?.text || "The AI model did not generate an image. Please try again.",
      },
      { status: 500 }
    );
  } catch (error) {
    console.error("Transform error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
