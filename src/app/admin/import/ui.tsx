"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

type SourceResult = {
  sourceId: string;
  status: string;
  fetched?: number;
  error?: string;
};

type ImportResponse = {
  ok?: boolean;
  ranAt?: string;
  sources?: SourceResult[];
  error?: string;
};

export default function ImportConsole() {
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/admin/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret })
      });
      const data = (await response.json()) as ImportResponse;
      if (!response.ok) {
        setError(data.error || `Import request failed (${response.status})`);
      } else {
        setResult(data);
      }
    } catch {
      setError("Could not reach the import endpoint. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-10 flex items-center justify-between">
          <Link href="/" className="text-xl font-black tracking-tight">REEL<span className="text-red-400">RADAR</span></Link>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">Admin tool</span>
        </header>

        <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-400">Catalog operations</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Import movie data</h1>
        <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
          Run the configured sources and save discovered titles to MongoDB Atlas. Your admin secret is sent only to the protected server endpoint; it is not stored in this page.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-7">
          <label htmlFor="admin-secret" className="mb-2 block text-sm font-semibold">Admin secret</label>
          <input
            id="admin-secret"
            type="password"
            autoComplete="current-password"
            required
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            placeholder="Enter the ADMIN_SECRET configured in Vercel"
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-red-400"
          />
          <p className="mt-2 text-xs leading-5 text-zinc-500">Do not use your MongoDB password or TMDB token here. This must match the separate ADMIN_SECRET environment variable.</p>
          <button
            type="submit"
            disabled={loading || !secret.trim()}
            className="mt-5 rounded-xl bg-red-400 px-5 py-3 font-bold text-black transition hover:bg-red-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Importing…" : "Start movie import"}
          </button>
        </form>

        {error && <div role="alert" className="mt-6 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">{error}</div>}

        {result && (
          <section aria-live="polite" className="mt-6 rounded-2xl border border-white/10 p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold">{result.ok ? "Import completed" : "Import finished with source errors"}</h2>
              <span className={result.ok ? "rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300" : "rounded-full bg-amber-400/10 px-3 py-1 text-xs text-amber-200"}>
                {result.ok ? "Success" : "Check results"}
              </span>
            </div>
            {result.ranAt && <p className="mt-2 text-xs text-zinc-500">Finished: {new Date(result.ranAt).toLocaleString()}</p>}
            <div className="mt-5 divide-y divide-white/10">
              {(result.sources || []).map((source) => (
                <div key={source.sourceId} className="flex flex-wrap items-start justify-between gap-3 py-4">
                  <div>
                    <p className="font-medium">{source.sourceId}</p>
                    {source.error && <p className="mt-1 max-w-xl break-words text-sm text-red-300">{source.error}</p>}
                  </div>
                  <div className="text-right text-sm">
                    <p className={source.status === "ok" ? "text-emerald-300" : source.status === "error" ? "text-red-300" : "text-zinc-400"}>{source.status}</p>
                    {source.fetched !== undefined && <p className="mt-1 text-xs text-zinc-500">{source.fetched} records fetched</p>}
                  </div>
                </div>
              ))}
              {!result.sources?.length && <p className="py-4 text-sm text-zinc-400">No enabled sources returned a result. Check the source registry and server logs.</p>}
            </div>
            <button type="button" onClick={() => window.location.assign("/")} className="mt-4 rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/5">View homepage</button>
          </section>
        )}

        <p className="mt-8 text-xs leading-5 text-zinc-600">Keep this page private. The endpoint requires server-side authorization; never put secrets in URLs or source code.</p>
      </div>
    </main>
  );
}
