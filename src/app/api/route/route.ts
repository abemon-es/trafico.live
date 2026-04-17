import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/api-utils";
import {
  PROFILE_CONTAINER,
  resolveProfile,
  type RoutingProfile,
  type RoutingRequest,
} from "@/types/routing";

export const dynamic = "force-dynamic";

// ─── Config ─────────────────────────────────────────────────────────────────

const OSRM_PROFILE_PATH: Record<Exclude<RoutingProfile, "truck">, string> = {
  car: "driving",
  bike: "cycling",
  foot: "walking",
};

const DEFAULT_TIMEOUT_MS = 30_000;
const MIN_LOCATIONS: Record<string, number> = { route: 2, table: 2, nearest: 1, trip: 2 };

// ─── POST /api/route ────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  let body: Partial<RoutingRequest>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action = body.action || "route";
  const locations = body.locations || [];
  const profile = resolveProfile(body.profile);

  const minLocs = MIN_LOCATIONS[action] ?? 1;
  if (locations.length < minLocs) {
    return NextResponse.json(
      { error: `Action '${action}' requires at least ${minLocs} location(s)` },
      { status: 400 },
    );
  }

  if (profile === "truck") {
    return NextResponse.json(
      {
        error: "Truck profile served by Valhalla (coming S3). Use /api/route with profile car meanwhile.",
        hint: "truck routing needs height/length/weight restrictions; not in OSRM",
      },
      { status: 501 },
    );
  }

  const base = PROFILE_CONTAINER[profile];
  const osrmProfile = OSRM_PROFILE_PATH[profile];
  const coords = locations.map((l) => `${l.lon},${l.lat}`).join(";");

  let url: string;
  const params = new URLSearchParams();

  switch (action) {
    case "route": {
      const routeBody = body as Partial<import("@/types/routing").RouteActionRequest>;
      params.set("overview", "full");
      params.set("geometries", "geojson");
      params.set("steps", routeBody.steps === false ? "false" : "true");
      params.set("annotations", "duration,distance,speed");
      if (routeBody.alternatives) params.set("alternatives", "3");
      url = `${base}/route/v1/${osrmProfile}/${coords}?${params}`;
      break;
    }
    case "table": {
      const tableBody = body as Partial<import("@/types/routing").TableActionRequest>;
      params.set("annotations", "duration,distance");
      if (tableBody.sources) params.set("sources", tableBody.sources.join(";"));
      if (tableBody.destinations) params.set("destinations", tableBody.destinations.join(";"));
      url = `${base}/table/v1/${osrmProfile}/${coords}?${params}`;
      break;
    }
    case "nearest": {
      const nearestBody = body as Partial<import("@/types/routing").NearestActionRequest>;
      params.set("number", String(nearestBody.number ?? 5));
      url = `${base}/nearest/v1/${osrmProfile}/${coords}?${params}`;
      break;
    }
    case "trip": {
      const tripBody = body as Partial<import("@/types/routing").TripActionRequest>;
      params.set("overview", "full");
      params.set("geometries", "geojson");
      params.set("steps", "true");
      params.set("roundtrip", tripBody.roundtrip === false ? "false" : "true");
      url = `${base}/trip/v1/${osrmProfile}/${coords}?${params}`;
      break;
    }
    default:
      return NextResponse.json(
        { error: `Invalid action: ${action}. Valid: route, table, nearest, trip` },
        { status: 400 },
      );
  }

  try {
    const upstream = await fetch(url, { signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS) });
    const data = await upstream.json();
    if (data && typeof data === "object") {
      data.profile = profile;
      data.engine = "osrm";
    }
    return NextResponse.json(data, { status: upstream.ok ? 200 : upstream.status });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json({ error: "Routing timeout", profile }, { status: 504 });
    }
    return NextResponse.json(
      { error: "Routing service unavailable", profile, engine: "osrm" },
      { status: 503 },
    );
  }
}

// ─── GET /api/route — health ────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  const url = new URL(request.url);
  const profile = resolveProfile(url.searchParams.get("profile") ?? undefined);
  if (profile === "truck") {
    return NextResponse.json({ healthy: false, engine: "valhalla", reason: "truck not yet deployed" }, { status: 501 });
  }

  const base = PROFILE_CONTAINER[profile];
  const osrmProfile = OSRM_PROFILE_PATH[profile];

  try {
    const res = await fetch(
      `${base}/route/v1/${osrmProfile}/-3.703,40.417;-3.690,40.420?overview=false`,
      { signal: AbortSignal.timeout(5_000) },
    );
    const data = await res.json();
    return NextResponse.json({ healthy: data.code === "Ok", engine: "osrm", profile });
  } catch {
    return NextResponse.json(
      { healthy: false, engine: "osrm", profile, error: "OSRM unreachable" },
      { status: 503 },
    );
  }
}
