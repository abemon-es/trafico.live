/**
 * GET /api/v1/calidad-aire
 *
 * Alias for /api/calidad-aire — MITECO ICA air quality index (565 stations).
 *
 * Query params:
 *   province  — INE 2-digit province code
 *   station   — Station ID
 *   pollutant — NO2 | PM10 | PM25 | O3 | SO2 | CO
 *   ica       — Min ICA level 1-6 (1=good, 6=very_bad)
 *   limit     — Max results (default 100)
 *
 * Response: { stations: [...], total: number, meta: { updatedAt } }
 * Cache: 60s CDN, 300s stale-while-revalidate
 * Attribution: MITECO ICA (CC BY 4.0)
 */

import { NextRequest } from "next/server";
import { addV1Headers } from "../_headers";

export const runtime = "nodejs";
export const revalidate = 60;

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
  const upstream = new URL("/api/calidad-aire", request.url);
  searchParams.forEach((v, k) => upstream.searchParams.set(k, v));

  const response = await fetch(new Request(upstream.toString(), { headers: request.headers }));
  return addV1Headers(response, "medium");
}
