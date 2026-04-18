import { NextResponse } from "next/server";
import { classifyOverall, getCollectorStatuses } from "@/lib/heartbeat";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const collectors = await getCollectorStatuses();
    const overall = classifyOverall(collectors);
    return NextResponse.json(
      { overall, collectors, fetchedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } },
    );
  } catch (err) {
    console.error("[status/collectors] failed", err);
    return NextResponse.json(
      { overall: "degraded", collectors: [], fetchedAt: new Date().toISOString(), error: "lookup_failed" },
      { status: 503 },
    );
  }
}
