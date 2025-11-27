from __future__ import annotations

import io
from typing import List
import logging

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from paddleocr import PaddleOCR
from pydantic import BaseModel


logger = logging.getLogger("paddle_service")
if not logger.handlers:
  handler = logging.StreamHandler()
  formatter = logging.Formatter("[%(levelname)s] %(message)s")
  handler.setFormatter(formatter)
  logger.addHandler(handler)
logger.setLevel(logging.INFO)


class OcrLine(BaseModel):
  text: str
  confidence: float
  bbox: List[List[float]]


class OcrResponse(BaseModel):
  lines: List[OcrLine]
  raw_text: str


app = FastAPI(
  title="Local Paddle OCR",
  description=(
    "Receives an image/PDF page, runs PaddleOCR, and returns normalized text for"
    " the Next.js pipeline."
  ),
  version="0.1.0",
)

app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_methods=["*"],
  allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
  return {"status": "ok"}


@app.on_event("startup")
def load_model() -> None:
  """Load the PaddleOCR model once so inference requests stay fast."""
  # Store on application state to avoid large global in tests.
  logger.info("Loading PaddleOCR model...")
  app.state.ocr = PaddleOCR(use_textline_orientation=True, lang="en")
  logger.info("PaddleOCR model ready")


@app.post("/v1/ocr", response_model=OcrResponse)
async def run_ocr(file: UploadFile = File(...)) -> OcrResponse:
  logger.info("Received /v1/ocr request: filename=%s content_type=%s", file.filename, file.content_type)
  if not file.content_type or not file.content_type.startswith("image/"):
    raise HTTPException(status_code=400, detail="Upload an image file (PNG/JPEG).")

  payload = await file.read()
  logger.info("Read payload bytes: %s", len(payload))
  if not payload:
    raise HTTPException(status_code=400, detail="Empty file provided.")

  image = _read_image(payload)
  logger.info("Image decoded. Shape=%s", getattr(image, "shape", None))
  try:
    logger.info("Starting PaddleOCR inference...")
    raw_result = app.state.ocr.ocr(image)
    logger.info("PaddleOCR inference complete")
  except Exception as exc:  # pragma: no cover - forwarded for debugging
    logger.exception("PaddleOCR failed")
    raise HTTPException(status_code=500, detail=f"PaddleOCR failed: {exc}") from exc

  lines, combined = _transform_result(raw_result)
  logger.info("Transformed response. lines=%s chars=%s", len(lines), len(combined))
  return OcrResponse(lines=lines, raw_text=combined)


def _read_image(data: bytes) -> np.ndarray:
  """Convert raw bytes to an OpenCV image."""
  buffer = io.BytesIO(data)
  bytes_array = np.asarray(bytearray(buffer.read()), dtype=np.uint8)
  image = cv2.imdecode(bytes_array, cv2.IMREAD_COLOR)
  if image is None:
    raise HTTPException(status_code=400, detail="Unable to decode image.")
  return image


def _transform_result(raw_result) -> tuple[List[OcrLine], str]:
  if not raw_result:
    return [], ""

  lines: List[OcrLine] = []
  text_chunks: List[str] = []

  for page in raw_result:
    logger.info(
      "Processing OCR page chunk",
      extra={
        "page_keys": list(page.keys())
      }
    )
    texts = page.get("rec_texts") or []
    scores = page.get("rec_scores") or []
    boxes = page.get("rec_polys") or page.get("dt_polys") or []

    for idx, text in enumerate(texts):
      score = float(scores[idx]) if idx < len(scores) else 0.0
      bbox = _poly_to_list(boxes[idx]) if idx < len(boxes) else []
      lines.append(OcrLine(text=text, confidence=score, bbox=bbox))
      text_chunks.append(text)

  return lines, "\n".join(text_chunks)


def _poly_to_list(poly) -> List[List[float]]:
  if poly is None:
    return []
  arr = np.asarray(poly, dtype=float)
  return arr.tolist()

