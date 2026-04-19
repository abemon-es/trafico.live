/**
 * GET /api/v1/trenes/posiciones
 *
 * Alias for /api/trenes/posiciones — live GPS positions of Renfe trains.
 *
 * Query params:
 *   network  — cercanias network code (e.g. "c1", "r1")
 *   brand    — AVE | Cercanías | Alvia | MD | ...
 *   history  — true | false (include last 30 min of positions)
 *
 * Response: GeoJSON FeatureCollection with RailwayFleetPosition features
 * Cache: 15s CDN, 60s stale-while-revalidate
 * Attribution: Renfe GTFS-RT + LD Fleet API (CC BY 4.0)
 */

import { NextRequest } from "next/server";
import { addV1Headers } from "../../_headers";

export const runtime = "nodejs";
export const revalidate = 15;

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
  const upstream = new URL("/api/trenes/posiciones", request.url);
  searchParams.forEach((v, k) => upstream.searchParams.set(k, v));

  const response = await fetch(new Request(upstream.toString(), { headers: request.headers }));
  return addV1Headers(response, "short");
}
