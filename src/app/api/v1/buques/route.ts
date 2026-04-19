/**
 * GET /api/v1/buques
 *
 * Alias for /api/maritimo — AIS vessel positions in Spanish waters.
 *
 * Query params:
 *   type    — cargo | tanker | passenger | fishing | all (default: all)
 *   flag    — ISO-2 flag state (e.g. "ES", "PT")
 *   bounds  — sw_lat,sw_lng,ne_lat,ne_lng
 *   limit   — Max results (default 500, max 2000)
 *
 * Response: GeoJSON FeatureCollection with VesselPosition features
 * Cache: 30s CDN, 120s stale-while-revalidate
 * Attribution: aisstream.io (AIS data)
 */

import { NextRequest } from "next/server";
import { addV1Headers } from "../_headers";

export const runtime = "nodejs";
export const revalidate = 30;

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
  const upstream = new URL("/api/maritimo", request.url);
  searchParams.forEach((v, k) => upstream.searchParams.set(k, v));

  const response = await fetch(new Request(upstream.toString(), { headers: request.headers }));
  return addV1Headers(response, "short");
}
