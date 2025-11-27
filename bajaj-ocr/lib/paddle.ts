import type { ImagePayload, PaddleOcrResponse } from "./types";

const ENDPOINT = process.env.PADDLE_OCR_ENDPOINT;
const API_KEY = process.env.PADDLE_OCR_API_KEY;

export async function runPaddleOcr(
  image: ImagePayload
): Promise<PaddleOcrResponse> {
  if (!ENDPOINT) {
    throw new Error("Paddle OCR endpoint is missing");
  }

  console.log("[Paddle] Preparing upload", { page: image.page, mime: image.mimeType });
  const formData = new FormData();
  const file = new File([image.buffer], `page-${image.page}.png`, {
    type: image.mimeType
  });
  formData.append("file", file);

  const headers: Record<string, string> = {};

  if (API_KEY) {
    headers.Authorization = `Bearer ${API_KEY}`;
  }

  console.log("[Paddle] Sending request", { endpoint: ENDPOINT });
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers,
    body: formData
  });

  if (!response.ok) {
    const reason = await response.text();
    console.log("[Paddle] Request failed", {
      status: response.status,
      reason
    });
    throw new Error(`Paddle OCR failed: ${response.status} ${reason}`);
  }

  const payload = (await response.json()) as PaddleOcrResponse;
  console.log("[Paddle] Response parsed", {
    confidence: payload.confidence,
    lines: payload.lines.length
  });
  return payload;
}

