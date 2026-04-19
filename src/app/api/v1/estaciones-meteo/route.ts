/**
 * GET /api/v1/estaciones-meteo
 *
 * Alias for /api/clima/estaciones — AEMET weather station catalog.
 *
 * Query params:
 *   province  — INE 2-digit province code
 *   active    — true | false (only active stations)
 *   limit     — Max results (default 100, max 1000)
 *
 * Response: GeoJSON FeatureCollection with ClimateStation features
 * Cache: 1h CDN, 24h stale-while-revalidate
 * Attribution: AEMET (Agencia Estatal de Meteorología)
 */

import { NextRequest } from "next/server";
import { addV1Headers } from "../_headers";

export const runtime = "nodejs";
export const revalidate = 3600;

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
  const upstream = new URL("/api/clima/estaciones", request.url);
  searchParams.forEach((v, k) => upstream.searchParams.set(k, v));

  const response = await fetch(new Request(upstream.toString(), { headers: request.headers }));
  return addV1Headers(response, "daily");
}
