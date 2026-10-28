import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { normalizeTitle } from "@/lib/normalize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const q = (params.get("q") || "").trim();
    const country = (params.get("country") || "").toUpperCase();
    const limit = Math.min(Math.max(Number(params.get("limit") || 24), 1), 100);
    const filter: Record<string, unknown> = {};
    if (q) {
      const normalized = normalizeTitle(q);
      filter.$or = [
        { titleNormalized: { $regex: escapeRegex(normalized), $options: "i" } },
        { originalTitle: { $regex: escapeRegex(q), $options: "i" } }
      ];
    }
    if (country) filter.releaseCountry = country;
    const db = await getDb();
    const movies = await db.collection("movies").find(filter, {
      projection: { _id: 0, movieKey: 1, title: 1, originalTitle: 1, originalLanguage: 1,
        overview: 1, posterPath: 1, releaseDate: 1, releaseCountry: 1, mediaType: 1, dateStatus: 1, externalIds: 1 }
    }).sort({ releaseDate: 1 }).limit(limit).toArray();
    return NextResponse.json({ results: movies, count: movies.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch movies";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
