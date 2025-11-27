import type { CleanedLineItem, PaddleOcrResponse } from "./types";

const MONEY_REGEX = /([-+]?\d+(?:[.,]\d+)?)/;

export function cleanOcrResponse(
  response: PaddleOcrResponse
): CleanedLineItem[] {
  console.log("[Clean] Normalizing OCR response", {
    lines: response.lines.length
  });
  return response.lines
    .map((line) => {
      const match = line.text.match(MONEY_REGEX);
      if (!match) {
        return null;
      }

      const amount = Number(match[1].replace(/,/g, ""));
      if (Number.isNaN(amount)) {
        return null;
      }

      const quantityMatch = line.text.match(/(\d+)\s?(x|qty|quantity)/i);
      const codeMatch = line.text.match(/([A-Z]{2,}\d{2,})/);

      return {
        description: line.text.replace(MONEY_REGEX, "").trim(),
        amount,
        quantity: quantityMatch ? Number(quantityMatch[1]) : undefined,
        code: codeMatch ? codeMatch[1] : undefined
      };
    })
    .filter(Boolean) as CleanedLineItem[];
}

export function mergeLineItems(
  lineItems: CleanedLineItem[]
): CleanedLineItem[] {
  console.log("[Clean] Merging line items", { count: lineItems.length });
  const map = new Map<string, CleanedLineItem>();

  lineItems.forEach((item) => {
    const key = `${item.description}-${item.code ?? "none"}`;
    const existing = map.get(key);
    if (existing) {
      map.set(key, {
        ...existing,
        amount: existing.amount + item.amount,
        quantity: (existing.quantity ?? 0) + (item.quantity ?? 0)
      });
    } else {
      map.set(key, item);
    }
  });

  const merged = Array.from(map.values());
  console.log("[Clean] Merge complete", { merged: merged.length });
  return merged;
}

