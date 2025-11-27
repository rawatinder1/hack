/* eslint-disable @next/next/no-img-element */
"use client";

import { useRef, useState } from "react";

type ApiResult = {
  gemini: {
    individualLineItems: {
      description: string;
      amount: number;
      quantity?: number;
      code?: string;
    }[];
    subTotals: Record<string, number>;
    finalTotal: number;
    notes?: string;
  };
  fallback: {
    lineItems: {
      description: string;
      amount: number;
      quantity?: number;
    }[];
    estimatedTotal: number;
  };
  telemetry: {
    pages: number;
    paddleConfidence: number | null;
  };
};

type UploadState = "idle" | "uploading" | "processing" | "done" | "error";

export function UploadDropzone() {
  const [state, setState] = useState<UploadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResult | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onDrop = (files: FileList | null) => {
    console.log("[UI] onDrop triggered", { files: files?.length ?? 0 });
    if (!files?.length) return;
    if (!files[0].name.endsWith(".pdf")) {
      console.log("[UI] Non-PDF file rejected", { name: files[0].name });
      setError("Please select a PDF.");
      return;
    }
    if (inputRef.current) {
      inputRef.current.files = files;
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log("[UI] Form submit");
    setError(null);
    setResult(null);
    setState("uploading");

    const formData = new FormData(event.currentTarget);

    try {
      setState("processing");
      console.log("[UI] Calling /api/process");
      const response = await fetch("/api/process", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        console.log("[UI] /api/process returned error", {
          status: response.status
        });
        const detail = (await response.json()) as { error: string };
        throw new Error(detail.error ?? "Unknown error");
      }

      const payload = (await response.json()) as ApiResult;
      console.log("[UI] Extraction success", {
        finalTotal: payload.gemini.finalTotal
      });
      setResult(payload);
      setState("done");
    } catch (err) {
      console.log("[UI] Extraction failed", err);
      setError(err instanceof Error ? err.message : "Upload failed");
      setState("error");
    }
  };

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 shadow-sm"
      >
        <label
          htmlFor="file"
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-6 py-12 text-center transition hover:border-slate-400"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="h-10 w-10 text-slate-500"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 15l7.5-7.5L12 9l-7.5 7.5H3zm0 0v5.25A2.25 2.25 0 005.25 22.5H19.5m-3.75-7.5l-7.5 7.5"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 21h9a3 3 0 003-3V6a3 3 0 00-3-3h-7.5A1.5 1.5 0 009 4.5V21z"
            />
          </svg>
          <div>
            <p className="text-lg font-semibold text-slate-800">
              Drop your multi-page PDF
            </p>
            <p className="text-sm text-slate-500">
              Up to 50 pages. We convert each page to an image, run Paddle OCR,
              then summarize with Gemini.
            </p>
          </div>
          <input
            ref={inputRef}
            id="file"
            name="file"
            type="file"
            accept="application/pdf"
            className="sr-only"
            onChange={(event) => onDrop(event.target.files)}
            required
          />
          <span className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            {state === "processing" ? "Processing…" : "Select PDF"}
          </span>
        </label>

        <button
          type="submit"
          className="mt-6 w-full rounded-xl bg-blue-600 py-3 text-center text-sm font-semibold uppercase tracking-wide text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={state === "processing"}
        >
          {state === "processing" ? "Working..." : "Extract Totals"}
        </button>
      </form>

      <StatusPanel state={state} />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && <ResultPanel result={result} />}
    </div>
  );
}

function StatusPanel({ state }: { state: UploadState }) {
  const steps: { title: string; status: UploadState }[] = [
    { title: "Upload PDF", status: "uploading" },
    { title: "Convert to images", status: "processing" },
    { title: "Paddle OCR pass", status: "processing" },
    { title: "Gemini summarization", status: "done" }
  ];

  const statusIndex =
    state === "idle"
      ? -1
      : state === "uploading"
        ? 0
        : state === "processing"
          ? 2
          : state === "done"
            ? steps.length - 1
            : -1;

  return (
    <ol className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 md:grid-cols-4">
      {steps.map((step, index) => (
        <li key={step.title} className="space-y-2 text-center">
          <div
            className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
              index <= statusIndex
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-400"
            }`}
          >
            {index + 1}
          </div>
          <p className="text-sm font-medium text-slate-700">{step.title}</p>
        </li>
      ))}
    </ol>
  );
}

function ResultPanel({ result }: { result: ApiResult }) {
  return (
    <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Gemini Summary
          </h2>
          <p className="text-sm text-slate-500">
            Totals computed across {result.telemetry.pages} pages. Paddle OCR
            avg confidence: {result.telemetry.paddleConfidence ?? "n/a"}.
          </p>
        </div>
        <div className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white">
          ₹ {result.gemini.finalTotal.toLocaleString()}
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Line Items
          </h3>
          <ul className="space-y-2 max-h-64 overflow-auto pr-2">
            {result.gemini.individualLineItems.map((item) => (
              <li
                key={`${item.description}-${item.amount}`}
                className="rounded-lg border border-slate-100 p-3 text-sm"
              >
                <p className="font-medium text-slate-800">
                  {item.description}
                </p>
                <p className="text-slate-500">
                  Amount: ₹{item.amount.toLocaleString()}
                  {item.quantity ? ` • Qty ${item.quantity}` : ""}
                  {item.code ? ` • ${item.code}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Sub Totals
          </h3>
          <ul className="space-y-2">
            {Object.entries(result.gemini.subTotals).map(([label, value]) => (
              <li
                key={label}
                className="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-sm"
              >
                <span className="font-medium text-slate-700">{label}</span>
                <span className="text-slate-900">
                  ₹ {value.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">Fallback check</p>
        <p>
          Summing Paddle OCR line items yields ₹
          {result.fallback.estimatedTotal.toLocaleString()}. Compare with Gemini
          final total to catch hallucinations.
        </p>
      </div>
    </section>
  );
}

