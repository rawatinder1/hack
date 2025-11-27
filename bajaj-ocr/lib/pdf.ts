import { fromBuffer } from "pdf2pic";
import type { ImagePayload } from "./types";

const DEFAULT_CONVERTER_OPTIONS = {
  density: 220,
  saveFilename: "temp",
  savePath: "/tmp",
  format: "png" as const,
  width: 1700,
  height: 2200
};

export async function pdfToImages(pdfBuffer: Buffer): Promise<ImagePayload[]> {
  console.log("[PDF] Starting PDF to image conversion", {
    byteLength: pdfBuffer.length
  });
  const converter = fromBuffer(pdfBuffer, DEFAULT_CONVERTER_OPTIONS);
  const pages = await converter.bulk(-1, { responseType: "base64" });
  console.log("[PDF] Conversion complete", { pages: pages.length });

  return pages.map((page) => {
    console.log("[PDF] Rendering page -> buffer", { page: page.page });
    return {
      page: page.page,
      mimeType: `image/${DEFAULT_CONVERTER_OPTIONS.format}`,
      buffer: Buffer.from(page.base64, "base64")
    };
  });
}

