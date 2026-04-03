import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Cron endpoint to warm the road geometry Redis cache.
 * Call from Coolify cron or external scheduler every 12h.
 * GET /api/cron/warm-roads
 */
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key") || request.nextUrl.searchParams.get("key");
  const validKeys = process.env.API_KEYS?.split(",").map((k) => k.trim()) || [];
  if (!apiKey || !validKeys.includes(apiKey)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";
    const response = await fetch(`${baseUrl}/api/roads/geometry`, {
      headers: { "x-api-key": process.env.API_KEYS?.split(",")[0] || "" },
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      return NextResponse.json({ success: false, error: `Upstream returned ${response.status}` }, { status: 502 });
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      message: "Road geometry cache warmed",
      stats: data.stats || { ways: "unknown" },
      source: data.source,
    });
  } catch (error) {
    reportApiError(error, "Road geometry warm error");
    return NextResponse.json({ success: false, error: "Failed to warm cache" }, { status: 500 });
  }
}
