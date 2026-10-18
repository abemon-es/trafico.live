/**
 * GET /api/v1/vuelos
 *
 * Alias for /api/aviacion — real-time aircraft positions over Spanish airspace.
 *
 * Query params:
 *   bounds    — sw_lat,sw_lng,ne_lat,ne_lng (bounding box filter)
 *   onGround  — true | false (filter airborne / on-ground)
 *   limit     — Max results (default 500, max 2000)
 *
 * Response: GeoJSON FeatureCollection with AircraftPosition features
 * Cache: 30s CDN, 120s stale-while-revalidate
 * Attribution: The OpenSky Network (https://opensky-network.org) — use subject to its terms of use — NOT CC BY; commercial/operational use needs a written licence (docs/cto-loop/BACKLOG.md ESCALATIONS, 2026-10-18)
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
  const upstream = new URL("/api/aviacion", request.url);
  searchParams.forEach((v, k) => upstream.searchParams.set(k, v));

  const response = await fetch(new Request(upstream.toString(), { headers: request.headers }));
  return addV1Headers(response, "short");
}
