/**
 * GET /api/v1/trenes/alertas
 *
 * Alias for /api/trenes/alertas — active Renfe service alerts.
 *
 * Query params:
 *   service_type — CERCANIAS | AVE | LARGA_DISTANCIA | REGIONAL | MEDIA_DISTANCIA
 *   effect       — NO_SERVICE | REDUCED_SERVICE | SIGNIFICANT_DELAYS | DETOUR | MODIFIED_SERVICE
 *
 * Response: { alerts: [...], total: number, meta: { updatedAt } }
 * Cache: 60s CDN, 300s stale-while-revalidate
 * Attribution: Renfe GTFS-RT (CC BY 4.0)
 */

import { NextRequest } from "next/server";
import { addV1Headers } from "../../_headers";

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
  const upstream = new URL("/api/trenes/alertas", request.url);
  searchParams.forEach((v, k) => upstream.searchParams.set(k, v));

  const response = await fetch(new Request(upstream.toString(), { headers: request.headers }));
  return addV1Headers(response, "medium");
}
