import { NextResponse } from "next/server";

const PADDLE_HEALTH = process.env.PADDLE_OCR_HEALTH_ENDPOINT;

export const runtime = "nodejs";

export async function GET() {
  const status: Record<string, string> = {
    app: "ok"
  };

  if (PADDLE_HEALTH) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(PADDLE_HEALTH, {
        cache: "no-store",
        signal: controller.signal
      });
      clearTimeout(timeout);
      status.paddle = res.ok ? "ok" : `error:${res.status}`;
    } catch (error) {
      status.paddle = `error:${String(error)}`;
    }
  } else {
    status.paddle = "unknown";
  }

  return NextResponse.json({
    status,
    timestamp: new Date().toISOString()
  });
}

