/**
 * GET /api/v1/puertos
 *
 * Alias for /api/maritimo/puertos — Spanish port catalog (197 ports).
 *
 * Query params:
 *   region  — autonomous community name or code
 *   type    — commercial | fishing | passenger | marina
 *   limit   — Max results (default 50, max 200)
 *
 * Response: { ports: [...], total: number }
 * Cache: 5 min CDN, 15 min stale-while-revalidate
 * Attribution: Puertos del Estado (INSPIRE WFS)
 */

import { NextRequest } from "next/server";
import { addV1Headers } from "../_headers";

export const runtime = "nodejs";
export const revalidate = 300;

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
    },
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const upstream = new URL("/api/maritimo/puertos", request.url);
  searchParams.forEach((v, k) => upstream.searchParams.set(k, v));

  const response = await fetch(new Request(upstream.toString(), { headers: request.headers }));
  return addV1Headers(response, "long");
}
