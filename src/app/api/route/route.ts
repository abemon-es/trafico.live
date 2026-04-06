import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

const OSRM_URL = process.env.OSRM_URL || "http://127.0.0.1:8002";

/**
 * POST /api/route
 *
 * Routing via self-hosted OSRM (Open Source Routing Machine).
 *
 * Body:
 *   action: "route" | "table" | "nearest" | "trip"
 *   locations: [{lat, lon}, ...] — 2+ for route, 1 for nearest
 *   profile: "driving" | "car" (default: "driving")
 *
 * Returns OSRM response format.
 *
 * Examples:
 *   POST /api/route
 *   { "action": "route", "locations": [{"lat":40.417,"lon":-3.703},{"lat":41.386,"lon":2.173}] }
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();
    const action = body.action || "route";
    const locations: { lat: number; lon: number }[] = body.locations || [];
    const profile = body.profile || "driving";

    if (locations.length < 1) {
      return NextResponse.json({ error: "At least 1 location required" }, { status: 400 });
    }

    const coords = locations.map((l) => `${l.lon},${l.lat}`).join(";");

    let url: string;
    const params = new URLSearchParams();

    switch (action) {
      case "route":
        if (locations.length < 2) {
          return NextResponse.json({ error: "Route requires 2+ locations" }, { status: 400 });
        }
        params.set("overview", "full");
        params.set("geometries", "geojson");
        params.set("steps", "true");
        params.set("annotations", "duration,distance,speed");
        url = `${OSRM_URL}/route/v1/${profile}/${coords}?${params}`;
        break;

      case "table":
        params.set("annotations", "duration,distance");
        url = `${OSRM_URL}/table/v1/${profile}/${coords}?${params}`;
        break;

      case "nearest":
        params.set("number", "5");
        url = `${OSRM_URL}/nearest/v1/${profile}/${coords}?${params}`;
        break;

      case "trip":
        params.set("overview", "full");
        params.set("geometries", "geojson");
        params.set("steps", "true");
        params.set("roundtrip", body.roundtrip === false ? "false" : "true");
        url = `${OSRM_URL}/trip/v1/${profile}/${coords}?${params}`;
        break;

      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}. Valid: route, table, nearest, trip` },
          { status: 400 },
        );
    }

    const osrmResponse = await fetch(url, {
      signal: AbortSignal.timeout(30000),
    });

    const data = await osrmResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json({ error: "Routing timeout" }, { status: 504 });
    }
    return NextResponse.json({ error: "Routing service unavailable" }, { status: 503 });
  }
}

/**
 * GET /api/route — health check
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Quick test route to verify OSRM is responding
    const res = await fetch(
      `${OSRM_URL}/route/v1/driving/-3.703,40.417;-3.690,40.420?overview=false`,
      { signal: AbortSignal.timeout(5000) },
    );
    const data = await res.json();
    return NextResponse.json({ healthy: data.code === "Ok", engine: "osrm" });
  } catch {
    return NextResponse.json({ healthy: false, engine: "osrm", error: "OSRM unreachable" }, { status: 503 });
  }
}
