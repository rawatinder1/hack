# PaddleOCR FastAPI Service

Local FastAPI wrapper that exposes PaddleOCR as a simple HTTP endpoint compatible with the Next.js bill-processing pipeline.

## Setup

```bash
cd paddle-fastapi
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

> Dependencies install the full PaddleOCR stack (PaddlePaddle runtime, OpenCV, etc.), so the first install may take a while.

## Run Locally

```bash
source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 9000 --reload
```

The server starts on `http://127.0.0.1:9000`.

## API

- `POST /v1/ocr`
  - Content-Type: `multipart/form-data`
  - Field: `file` (PNG/JPEG) – use extracted PDF page images from the Next.js backend.

Response:

```json
{
  "lines": [
    {
      "text": "Consultation Fee",
      "confidence": 0.98,
      "bbox": [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
    }
  ],
  "raw_text": "Consultation Fee\n..."
}
```

The FastAPI instance loads the PaddleOCR model once on startup for fast subsequent inference.

