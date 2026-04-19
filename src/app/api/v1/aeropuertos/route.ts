/**
 * GET /api/v1/aeropuertos
 *
 * Alias for /api/aviacion/aeropuertos — 42 AENA airport catalog.
 *
 * Query params:
 *   iata     — IATA code (e.g. "MAD", "BCN")
 *   province — INE 2-digit province code
 *   stats    — true | false (include annual pax stats)
 *
 * Response: { airports: [...], total: number }
 * Cache: 1h CDN, 24h stale-while-revalidate
 * Attribution: AENA / Eurostat AVIA_PAOA
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
  const upstream = new URL("/api/aviacion/aeropuertos", request.url);
  searchParams.forEach((v, k) => upstream.searchParams.set(k, v));

  const response = await fetch(new Request(upstream.toString(), { headers: request.headers }));
  return addV1Headers(response, "daily");
}
