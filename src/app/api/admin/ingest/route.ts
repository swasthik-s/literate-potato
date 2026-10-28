import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { runIngestion } from "@/lib/ingest";
import { sourceRegistry } from "@/lib/sources/registry";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function secretsMatch(supplied: string, expected: string) {
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  return suppliedBuffer.length === expectedBuffer.length && timingSafeEqual(suppliedBuffer, expectedBuffer);
}

export async function POST(request: NextRequest) {
  const expected = process.env.ADMIN_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "ADMIN_SECRET is not configured in the deployment environment" }, { status: 503 });
  }

  let supplied = "";
  try {
    const body = await request.json() as { secret?: unknown };
    supplied = typeof body.secret === "string" ? body.secret : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON request" }, { status: 400 });
  }

  if (!secretsMatch(supplied, expected)) {
    return NextResponse.json({ error: "Invalid admin secret" }, { status: 401 });
  }

  try {
    const sources = await runIngestion(sourceRegistry);
    const ok = sources.every((source) => source.status !== "error");
    return NextResponse.json({ ok, ranAt: new Date().toISOString(), sources }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown ingestion error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
