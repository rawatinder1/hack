import { NextResponse } from "next/server";
import { pdfToImages } from "@/lib/pdf";
import { runPaddleOcr } from "@/lib/paddle";
import { cleanOcrResponse, mergeLineItems } from "@/lib/cleaning";
import { summarizeWithGemini } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  console.log("[API] /api/process hit");
  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    console.log("[API] Missing PDF file in request");
    return NextResponse.json({ error: "No PDF file provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  console.log("[API] Received PDF bytes", { size: buffer.byteLength });

  try {
    const images = await pdfToImages(buffer);
    console.log("[API] Converted PDF to images", { pages: images.length });

    const ocrResults = [];
    for (const image of images) {
      console.log("[API] Sending page to Paddle OCR", { page: image.page });
      const result = await runPaddleOcr(image);
      console.log("[API] Paddle OCR response captured", {
        page: image.page,
        confidence: result.confidence
      });
      ocrResults.push(result);
    }

    const cleaned = mergeLineItems(
      ocrResults.flatMap((result) => cleanOcrResponse(result))
    );
    console.log("[API] Cleaned OCR line items", { count: cleaned.length });
    const combinedText = ocrResults.map((result) => result.rawText).join("\n");

    const gemini = await summarizeWithGemini(combinedText, cleaned);
    console.log("[API] Gemini summarization finished", {
      lineItems: gemini.individualLineItems.length,
      finalTotal: gemini.finalTotal
    });

    const fallbackTotal = cleaned.reduce(
      (sum, item) => sum + item.amount,
      0
    );
    console.log("[API] Fallback total computed", { fallbackTotal });

    return NextResponse.json({
      gemini,
      fallback: {
        lineItems: cleaned,
        estimatedTotal: fallbackTotal
      },
      telemetry: {
        pages: images.length,
        paddleConfidence: averageConfidence(ocrResults)
      }
    });
  } catch (error) {
    console.error("[API] Processing failed", error);
    return NextResponse.json(
      { error: "Processing failed", detail: `${error}` },
      { status: 500 }
    );
  }
}

function averageConfidence(
  responses: { confidence: number }[]
): number | null {
  if (!responses.length) {
    return null;
  }

  const total = responses.reduce((sum, result) => sum + result.confidence, 0);
  return Number((total / responses.length).toFixed(2));
}

