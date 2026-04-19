/**
 * Shared v1 API response helpers.
 *
 * All /api/v1/* routes use these to add consistent versioning,
 * CORS, and cache headers without modifying the original endpoints.
 */

export const V1_HEADERS = {
  "X-API-Version": "1",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key, Authorization",
} as const;

export const CACHE_HEADERS = {
  short: "public, s-maxage=30, stale-while-revalidate=120",
  medium: "public, s-maxage=60, stale-while-revalidate=300",
  long: "public, s-maxage=300, stale-while-revalidate=900",
  daily: "public, s-maxage=3600, stale-while-revalidate=86400",
} as const;

/** Merge v1 + cache headers into an existing NextResponse */
export function addV1Headers(
  response: Response,
  cache: keyof typeof CACHE_HEADERS = "medium"
): Response {
  const headers = new Headers(response.headers);
  Object.entries(V1_HEADERS).forEach(([k, v]) => headers.set(k, v));
  headers.set("Cache-Control", CACHE_HEADERS[cache]);
  return new Response(response.body, {
    status: response.status,
    headers,
  });
}
