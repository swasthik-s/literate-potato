import Parser from "rss-parser";
import * as cheerio from "cheerio";
import type { SourceConfig } from "./registry";

export type CollectedRecord = {
  sourceId: string;
  sourceType: string;
  sourceUrl: string;
  sourcePriority: number;
  observedAt: Date;
  title: string;
  originalTitle?: string;
  originalLanguage?: string;
  overview?: string;
  posterPath?: string;
  releaseDate?: string | null;
  releaseCountry?: string;
  mediaType: "movie" | "unknown";
  tmdbId?: string;
  dateStatus: "reported" | "unconfirmed";
};

const parser = new Parser();

async function getJson(url: string, headers: Record<string, string>) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(20000), cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${new URL(url).host}`);
  return response.json();
}

async function tmdb(source: Extract<SourceConfig, { type: "tmdb_upcoming" }>): Promise<CollectedRecord[]> {
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  if (!token) throw new Error("TMDB_READ_ACCESS_TOKEN is not configured");
  const out: CollectedRecord[] = [];
  const maxPages = Math.min(Math.max(source.maxPages ?? 3, 1), 5);
  for (let page = 1; page <= maxPages; page++) {
    const url = new URL("https://api.themoviedb.org/3/movie/upcoming");
    url.searchParams.set("region", source.region);
    url.searchParams.set("language", source.language);
    url.searchParams.set("page", String(page));
    const payload = await getJson(url.toString(), { Authorization: `Bearer ${token}`, accept: "application/json" });
    const observedAt = new Date();
    for (const item of payload.results ?? []) {
      const title = item.title || item.original_title;
      if (!title) continue;
      out.push({
        sourceId: source.id, sourceType: "api", sourceUrl: `https://www.themoviedb.org/movie/${item.id}`,
        sourcePriority: source.priority, observedAt, title, originalTitle: item.original_title,
        originalLanguage: item.original_language, overview: item.overview, posterPath: item.poster_path,
        releaseDate: item.release_date || null, releaseCountry: source.region,
        mediaType: "movie", tmdbId: String(item.id), dateStatus: item.release_date ? "reported" : "unconfirmed"
      });
    }
    if (page >= Number(payload.total_pages ?? 1)) break;
  }
  return out;
}

async function rss(source: Extract<SourceConfig, { type: "rss" }>): Promise<CollectedRecord[]> {
  if (!source.url.startsWith("https://")) throw new Error("RSS sources must use HTTPS");
  const response = await fetch(source.url, { signal: AbortSignal.timeout(20000), headers: { "User-Agent": "GlobalMovieTracker/0.1" } });
  if (!response.ok) throw new Error(`RSS returned HTTP ${response.status}`);
  const feed = await parser.parseString(await response.text());
  const observedAt = new Date();
  return feed.items.flatMap((item): CollectedRecord[] => {
    const title = item.title?.trim();
    const sourceUrl = item.link;
    if (!title || !sourceUrl) return [];
    return [{
      sourceId: source.id, sourceType: "rss", sourceUrl, sourcePriority: source.priority, observedAt,
      title, overview: item.contentSnippet?.slice(0, 2000), mediaType: "unknown",
      releaseDate: null, dateStatus: "unconfirmed"
    }];
  });
}

async function html(source: Extract<SourceConfig, { type: "html" }>): Promise<CollectedRecord[]> {
  if (!source.url.startsWith("https://")) throw new Error("HTML sources must use HTTPS");
  const response = await fetch(source.url, { signal: AbortSignal.timeout(20000), headers: { "User-Agent": "GlobalMovieTracker/0.1" } });
  if (!response.ok) throw new Error(`HTML source returned HTTP ${response.status}`);
  const $ = cheerio.load(await response.text());
  const observedAt = new Date();
  const records: CollectedRecord[] = [];
  $(source.itemSelector).each((_, element) => {
    const node = $(element);
    const title = node.find(source.titleSelector).first().text().trim();
    if (!title) return;
    const dateNode = source.dateSelector ? node.find(source.dateSelector).first() : null;
    const date = dateNode?.attr("datetime") || dateNode?.text().trim() || null;
    const href = node.find("a[href]").first().attr("href");
    const sourceUrl = href ? new URL(href, source.url).toString() : source.url;
    records.push({
      sourceId: source.id, sourceType: "html", sourceUrl, sourcePriority: source.priority, observedAt,
      title, releaseDate: date, mediaType: "unknown", dateStatus: date ? "reported" : "unconfirmed"
    });
  });
  return records;
}

export async function collectSource(source: SourceConfig): Promise<CollectedRecord[]> {
  switch (source.type) {
    case "tmdb_upcoming": return tmdb(source);
    case "rss": return rss(source);
    case "html": return html(source);
  }
}
