export type ImagePayload = {
  page: number;
  mimeType: string;
  buffer: Buffer;
};

export type PaddleOcrResponse = {
  rawText: string;
  confidence: number;
  lines: Array<{
    text: string;
    confidence: number;
  }>;
};

export type CleanedLineItem = {
  description: string;
  amount: number;
  quantity?: number;
  code?: string;
};

export type InvoiceExtractionPayload = {
  individualLineItems: CleanedLineItem[];
  subTotals: Record<string, number>;
  finalTotal: number;
  currency?: string;
  sourceDocuments: string[];
};

export type GeminiExtraction = {
  individualLineItems: CleanedLineItem[];
  subTotals: Record<string, number>;
  finalTotal: number;
  notes?: string;
};

