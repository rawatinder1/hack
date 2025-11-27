# Bajaj Health Datathon OCR Pipeline

End-to-end TypeScript Next.js app (Bun-compatible) that lets analysts drop multi-page PDF invoices, converts each page into an image in memory, runs PaddleOCR, cleans the individual line items, and finally sends the normalized text to Gemini for summary + totals.

## Architecture

1. **App Router API (`/api/process`)**
   - Accepts multi-page PDF as `multipart/form-data`.
   - Uses `pdf2pic` (requires Poppler + GraphicsMagick) to convert each page to PNG buffers.
   - Streams each buffer to PaddleOCR REST service (`PADDLE_OCR_ENDPOINT`) and gathers confidences.
   - Normalizes raw OCR lines (regex based value parsing, dedupe).
   - Sends raw OCR text plus structured hints to Gemini (`GEMINI_API_KEY`) to obtain accurate totals.
   - Returns Gemini JSON + fallback estimates for hallucination detection.

2. **Frontend (`app/page.tsx`)**
   - Drag & drop UI with progress timeline.
   - Shows Gemini line items, subtotals, and fallback check.
   - Crafted with TailwindCSS, works with Bun or npm.

## Requirements

| Dependency | Reason |
| ---------- | ------ |
| Bun ≥ 1.1 (or Node ≥ 18) | Runtime |
| Poppler + GraphicsMagick / ImageMagick | `pdf2pic` needs PDF → image |
| PaddleOCR endpoint | External OCR service |
| Gemini API key | Summaries |

### Environment

Create `.env.local` with:

```
PADDLE_OCR_ENDPOINT=https://your-paddle-endpoint.example.com/v1/ocr
PADDLE_OCR_API_KEY=sk-...
GEMINI_API_KEY=sk-...
GEMINI_MODEL=gemini-1.5-pro
```

## Getting Started

```bash
bun install
bun dev
# or npm install && npm run dev
```

Upload a PDF and observe JSON in DevTools Network tab.

## Testing Notes

- The API route is marked `runtime = "nodejs"` so it will not run on Edge.
- Error details bubble up to the UI alert box for quick debugging.
- Gemini result is validated as JSON; invalid payloads raise 500 with raw response snippet.

