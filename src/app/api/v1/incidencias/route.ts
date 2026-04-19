/**
 * GET /api/v1/incidencias
 *
 * Alias for /api/incidents — active DGT/SCT/EUSKADI traffic incidents.
 *
 * Query params:
 *   province  — INE 2-digit code (e.g. "28" = Madrid)
 *   severity  — LOW | MEDIUM | HIGH | VERY_HIGH
 *   effect    — ROAD_CLOSED | SLOW_TRAFFIC | RESTRICTED | DIVERSION | OTHER_EFFECT
 *   source    — DGT | SCT | EUSKADI | MADRID | NAVARRA
 *   road      — Road number (e.g. "A-1")
 *   limit     — Max results (default 100, max 500)
 *
 * Response: { incidents: [...], total: number, meta: { updatedAt, source } }
 * Cache: 60s CDN, 300s stale-while-revalidate
 * Attribution: Dirección General de Tráfico (DGT)
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
  const upstream = new URL("/api/incidents", request.url);
  searchParams.forEach((v, k) => upstream.searchParams.set(k, v));

  const upstreamReq = new Request(upstream.toString(), {
    headers: request.headers,
  });

  const response = await fetch(upstreamReq);
  return addV1Headers(response, "medium");
}
