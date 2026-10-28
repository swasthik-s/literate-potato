import { NextRequest, NextResponse } from "next/server";
import { runIngestion } from "@/lib/ingest";
import { sourceRegistry } from "@/lib/sources/registry";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await runIngestion(sourceRegistry);
    const failed = result.some((item) => item.status === "error");
    return NextResponse.json({ ok: !failed, ranAt: new Date().toISOString(), sources: result }, { status: failed ? 207 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown ingestion error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
