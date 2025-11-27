import { GoogleGenerativeAI } from "@google/generative-ai";
import type { CleanedLineItem, GeminiExtraction } from "./types";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-1.5-pro";

const SYSTEM_PROMPT = `
You are an expert medical billing auditor. Given OCR text, return JSON with:
- "individualLineItems": array of { description, amount, quantity?, code? }
- "subTotals": object with keys per category (e.g. PROCEDURES, MEDICATIONS)
- "finalTotal": number that equals the sum of line items minus discounts.
You must obey JSON output with no extra commentary.
`;

export async function summarizeWithGemini(
  combinedText: string,
  fallbackLineItems: CleanedLineItem[]
): Promise<GeminiExtraction> {
  if (!GEMINI_KEY) {
    throw new Error("Gemini API key missing");
  }

  console.log("[Gemini] Preparing prompt", {
    model: GEMINI_MODEL,
    textLength: combinedText.length,
    fallbackItems: fallbackLineItems.length
  });
  const client = new GoogleGenerativeAI(GEMINI_KEY);
  const model = client.getGenerativeModel({ model: GEMINI_MODEL });

  const prompt = `
${SYSTEM_PROMPT}

OCR TEXT:
"""
${combinedText}
"""

FALLBACK STRUCTURED LINE ITEMS:
${JSON.stringify(fallbackLineItems, null, 2)}
`;

  const result = await model.generateContent(prompt);
  console.log("[Gemini] Response received");
  const text = result.response.text();

  try {
    const parsed = JSON.parse(text) as GeminiExtraction;
    console.log("[Gemini] JSON parsed", {
      items: parsed.individualLineItems.length,
      total: parsed.finalTotal
    });
    return parsed;
  } catch (error) {
    console.log("[Gemini] Failed to parse JSON", { raw: text });
    throw new Error(
      `Gemini did not return valid JSON. Raw response: ${text}. ${String(
        error
      )}`
    );
  }
}

