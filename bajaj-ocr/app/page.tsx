import { UploadDropzone } from "@/components/UploadDropzone";

export default function Page() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-10 px-6 py-16">
      <section className="space-y-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">
          Bajaj Finserv Datathon
        </p>
        <h1 className="text-4xl font-semibold text-slate-900">
          Automated bill extraction
        </h1>
        <p className="mx-auto max-w-2xl text-base text-slate-600">
          Drops 30-50 page medical bills, run Paddle OCR per page, then hand the
          cleaned text to Gemini to compute subtotals and a single final number
          without double counting.
        </p>
      </section>

      <UploadDropzone />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">How it works</h2>
        <ol className="mt-4 space-y-2 text-sm text-slate-600">
          <li>1. PDF split into per-page PNGs in memory (no disk IO).</li>
          <li>
            2. Paddle OCR extracts line text. We normalize items and dedupe.
          </li>
          <li>
            3. Gemini receives both raw text and structured hints to produce
            JSON output.
          </li>
        </ol>
      </section>
    </main>
  );
}

