import { NextResponse } from "next/server";

/**
 * Cache tiers for API responses.
 * s-maxage tells Cloudflare how long to cache at the edge.
 * stale-while-revalidate allows serving stale while fetching fresh.
 */
const TIERS = {
  /** Real-time data: 30s edge, 60s stale (incidents, v16, intensity) */
  realtime: "public, s-maxage=30, stale-while-revalidate=60",
  /** Frequent updates: 2min edge, 5min stale (stats, dashboard, panels) */
  frequent: "public, s-maxage=120, stale-while-revalidate=300",
  /** Slow updates: 15min edge, 1h stale (cameras, radars, chargers, gas stations) */
  slow: "public, s-maxage=900, stale-while-revalidate=3600",
  /** Static-ish: 1h edge, 24h stale (roads, rankings, historical, ZBE) */
  static: "public, s-maxage=3600, stale-while-revalidate=86400",
  /** Never cache (health, auth, writes) */
  none: "no-store, no-cache, must-revalidate",
} as const;

export type CacheTier = keyof typeof TIERS;

/**
 * Return a NextResponse.json with appropriate Cache-Control headers.
 */
export function cachedJson<T>(data: T, tier: CacheTier, status = 200): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": TIERS[tier] },
  });
}

/**
 * Add cache headers to an existing NextResponse.
 */
export function withCacheHeaders(response: NextResponse, tier: CacheTier): NextResponse {
  response.headers.set("Cache-Control", TIERS[tier]);
  return response;
}
