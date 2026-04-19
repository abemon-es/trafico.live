/**
 * GET /api/v1/gasolineras
 *
 * Alias for /api/gas-stations — Spanish gas station catalog with live prices.
 *
 * Query params:
 *   province  — INE 2-digit province code
 *   fuel      — gasolina95 | gasolina98 | diesel | dieselplus | glp | ...
 *   brand     — Station brand name
 *   lat, lon  — Center point for proximity search
 *   radius    — Radius in km (requires lat/lon, default 10)
 *   limit     — Max results (default 50, max 200)
 *   cheapest  — true | false (sort by cheapest price for selected fuel)
 *
 * Response: { stations: [...], total: number, meta: { updatedAt } }
 * Cache: 60s CDN, 300s stale-while-revalidate
 * Attribution: MINETUR / Geoportal Gasolineras
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
  const upstream = new URL("/api/gas-stations", request.url);
  searchParams.forEach((v, k) => upstream.searchParams.set(k, v));

  const response = await fetch(new Request(upstream.toString(), { headers: request.headers }));
  return addV1Headers(response, "medium");
}
