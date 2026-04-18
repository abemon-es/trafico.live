import { NextResponse } from "next/server";
import { getSevenDayHistory } from "@/lib/heartbeat";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const history = await getSevenDayHistory();
    return NextResponse.json(
      { history, fetchedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
    );
  } catch (err) {
    console.error("[status/history] failed", err);
    return NextResponse.json({ history: [], error: "lookup_failed" }, { status: 503 });
  }
}
