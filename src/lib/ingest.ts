import { getDb } from "./mongodb";
import { movieKey, normalizeTitle } from "./normalize";
import { collectSource, type CollectedRecord } from "./sources/adapters";
import type { SourceConfig } from "./sources/registry";

function releaseYear(date?: string | null): number | undefined {
  const match = date?.match(/^(\d{4})/);
  return match ? Number(match[1]) : undefined;
}

async function persist(record: CollectedRecord) {
  const db = await getDb();
  const movies = db.collection("movies");
  const events = db.collection("changeEvents");
  const key = movieKey(record.title, releaseYear(record.releaseDate), record.tmdbId);
  const current = await movies.findOne({ movieKey: key });
  const now = new Date();
  const evidence = {
    sourceId: record.sourceId, sourceType: record.sourceType, sourceUrl: record.sourceUrl,
    priority: record.sourcePriority, observedAt: record.observedAt
  };

  if (!current) {
    await movies.updateOne({ movieKey: key }, {
      $setOnInsert: {
        movieKey: key, title: record.title, titleNormalized: normalizeTitle(record.title),
        originalTitle: record.originalTitle ?? null, originalLanguage: record.originalLanguage ?? null,
        overview: record.overview ?? null, posterPath: record.posterPath ?? null,
        externalIds: record.tmdbId ? { tmdb: record.tmdbId } : {},
        releaseDate: record.releaseDate ?? null, releaseCountry: record.releaseCountry ?? null,
        mediaType: record.mediaType, dateStatus: record.dateStatus,
        sourcePriority: record.sourcePriority, createdAt: now, updatedAt: now,
        sourceEvidence: [evidence]
      },
      $set: { lastSeenAt: now }
    }, { upsert: true });
    await events.insertOne({
      movieKey: key, eventType: "discovered", newValue: { title: record.title, releaseDate: record.releaseDate ?? null },
      sourceId: record.sourceId, sourceUrl: record.sourceUrl, observedAt: now
    });
    return "inserted" as const;
  }

  const changes: Record<string, { old: unknown; new: unknown }> = {};
  const fields = ["releaseDate", "releaseCountry", "title", "dateStatus"] as const;
  const proposed: Record<string, unknown> = {};
  for (const field of fields) {
    const value = field === "releaseDate" ? record.releaseDate :
      field === "releaseCountry" ? record.releaseCountry :
      field === "title" ? record.title : record.dateStatus;
    if (value !== undefined && value !== null && value !== current[field]) {
      if (field === "releaseDate" && record.sourcePriority < Number(current.sourcePriority ?? 0)) continue;
      changes[field] = { old: current[field] ?? null, new: value };
      proposed[field] = value;
    }
  }
  if (Object.keys(changes).length) {
    await events.insertOne({
      movieKey: key, eventType: "record_updated", changes,
      sourceId: record.sourceId, sourceUrl: record.sourceUrl, observedAt: now
    });
  }
  await movies.updateOne({ movieKey: key }, {
    $set: { ...proposed, lastSeenAt: now, updatedAt: now,
      ...(record.sourcePriority >= Number(current.sourcePriority ?? 0) ? { sourcePriority: record.sourcePriority } : {}) },
    $addToSet: { sourceEvidence: evidence }
  });
  return Object.keys(changes).length ? "updated" as const : "seen" as const;
}

export async function runIngestion(sources: SourceConfig[]) {
  const db = await getDb();
  const runs = db.collection("sourceRuns");
  const summary: Array<{ sourceId: string; status: string; fetched?: number; error?: string }> = [];
  for (const source of sources) {
    if (!source.enabled) continue;
    const now = new Date();
    const last = await runs.findOne({ sourceId: source.id });
    const intervalMs = Math.max(60, source.intervalSeconds) * 1000;
    if (last?.lastAttemptAt && now.getTime() - new Date(last.lastAttemptAt).getTime() < intervalMs) {
      summary.push({ sourceId: source.id, status: "skipped_interval" });
      continue;
    }
    await runs.updateOne({ sourceId: source.id }, { $set: { sourceId: source.id, lastAttemptAt: now, status: "running" } }, { upsert: true });
    try {
      const records = await collectSource(source);
      const counts = { inserted: 0, updated: 0, seen: 0 };
      for (const record of records) counts[await persist(record)]++;
      await runs.updateOne({ sourceId: source.id }, { $set: {
        status: "ok", lastSuccessAt: new Date(), lastError: null, fetched: records.length, counts
      } });
      summary.push({ sourceId: source.id, status: "ok", fetched: records.length });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await runs.updateOne({ sourceId: source.id }, { $set: { status: "error", lastError: message.slice(0, 1000) } });
      summary.push({ sourceId: source.id, status: "error", error: message });
    }
  }
  return summary;
}
