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
      model: "gemini-3-pro-image-preview",
      generationConfig: {
        // @ts-expect-error - responseModalities is valid but not in types yet
        responseModalities: ["TEXT", "IMAGE"],
      },
    });

    const prompt = `You are an expert architectural visualization photographer. Transform this 3D rendering into an ultra-photorealistic photograph that looks indistinguishable from a real photo taken by a professional real estate photographer with a Canon EOS R5 and 24-70mm lens.

CRITICAL: Preserve the EXACT same pool shape, layout, dimensions, structures, features, and camera angle from the original rendering. Do not add or remove any built structures.

WATER: Crystal-clear turquoise pool water with realistic caustic light patterns on the pool floor, subtle surface ripples, accurate reflections of surrounding elements, and visible depth gradient from shallow to deep end.

LANDSCAPING (add lush, mature landscaping around the entire pool area):
- Tropical palm trees (Royal Palms, Pygmy Date Palms) at varying heights
- Dense privacy hedges (Podocarpus or Clusia) along fence lines
- Flowering shrubs: Bougainvillea (magenta), Hibiscus (red/orange), Bird of Paradise
- Ornamental grasses near pool edges (Muhly grass, Fountain grass)
- Ground cover: St. Augustine grass with natural color variation, no perfectly uniform green
- Mulch beds with river rock borders around planting areas
- Accent plants: Agave, Bromeliads, and Crotons for color pops

MATERIALS & TEXTURES: Photorealistic travertine/natural stone pavers with subtle weathering and grout lines, real concrete or stone coping with slight imperfections, authentic pool tile with grouting visible at waterline.

LIGHTING: Golden hour sunlight (late afternoon), warm directional light casting long soft shadows, dappled light filtering through tree canopies, subtle lens flare, natural sky gradient from blue to warm horizon.

ATMOSPHERE: Slight atmospheric haze for depth, realistic sky with wispy clouds, birds or butterflies optional for life, pool furniture with towels/cushions if space allows.

Output a single ultra-high-quality photorealistic image. This should look like it belongs in Architectural Digest or a luxury pool builder's portfolio.`;

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
