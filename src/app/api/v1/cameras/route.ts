/**
 * GET /api/v1/cameras
 *
 * Alias for /api/cameras — DGT traffic camera catalog.
 *
 * Query params:
 *   province  — INE 2-digit province code
 *   road      — Road number (e.g. "A-1")
 *   active    — true | false (default: true)
 *   limit     — Max results (default 100, max 500)
 *
 * Response: { cameras: [...], total: number }
 * Cache: 5 min CDN, 15 min stale-while-revalidate
 * Attribution: DGT (Dirección General de Tráfico)
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
  const upstream = new URL("/api/cameras", request.url);
  searchParams.forEach((v, k) => upstream.searchParams.set(k, v));

  const response = await fetch(new Request(upstream.toString(), { headers: request.headers }));
  return addV1Headers(response, "long");
}
