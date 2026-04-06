import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

const VALHALLA_URL = process.env.VALHALLA_URL || "http://127.0.0.1:8002";

/**
 * POST /api/route
 *
 * Proxy to Valhalla routing engine. Accepts Valhalla JSON request body.
 *
 * Actions:
 *   - route:      Turn-by-turn routing between points
 *   - isochrone:  Drive-time/distance polygons from a point
 *   - trace_route: Map matching (snap GPS trace to road network)
 *   - sources_to_targets: Distance/time matrix
 *
 * Example (route):
 *   POST /api/route
 *   { "action": "route", "locations": [{"lat":40.4,"lon":-3.7},{"lat":41.4,"lon":2.2}], "costing": "auto" }
 *
 * Example (isochrone):
 *   POST /api/route
 *   { "action": "isochrone", "locations": [{"lat":40.4,"lon":-3.7}], "costing": "auto", "contours": [{"time":15},{"time":30}] }
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();
    const action = body.action || "route";
    delete body.action;

    const validActions = ["route", "isochrone", "trace_route", "sources_to_targets", "optimized_route", "nearest"];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action: ${action}. Valid: ${validActions.join(", ")}` },
        { status: 400 }
      );
    }

    const valhallaResponse = await fetch(`${VALHALLA_URL}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    if (!valhallaResponse.ok) {
      const errorText = await valhallaResponse.text();
      return NextResponse.json(
        { error: "Routing failed", details: errorText },
        { status: valhallaResponse.status }
      );
    }

    const data = await valhallaResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json({ error: "Routing timeout" }, { status: 504 });
    }
    return NextResponse.json({ error: "Routing service unavailable" }, { status: 503 });
  }
}

/**
 * GET /api/route/status
 * Health check for the routing engine.
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const res = await fetch(`${VALHALLA_URL}/status`, {
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    return NextResponse.json({ healthy: res.ok, ...data });
  } catch {
    return NextResponse.json({ healthy: false, error: "Valhalla unreachable" }, { status: 503 });
  }
}
