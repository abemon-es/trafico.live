/**
 * HS3 — Routing contracts (producer: T1.2)
 *
 * Shared types for /api/route and the three OSRM profile containers
 * (car :5000, bike :5001, foot :5002) plus Valhalla truck profile (port 8002).
 *
 * Consumers: T1.8 /calculadora, T1.9 /ir, T2 map client, internal clients.
 *
 * See docs/ROADMAP-TEAM-1-ROUTING.md §4 for handshake definition.
 */

// ─── Profiles ───────────────────────────────────────────────────────────────

/**
 * Transport profile.
 * - "car" | "bike" | "foot" → served by OSRM
 * - "truck" → served by Valhalla (S3; 4.5m height / 12m length default)
 *
 * Legacy aliases kept for gradual client migration:
 *   "driving" ≡ "car", "auto" ≡ "car", "bicycle" ≡ "bike", "pedestrian" ≡ "foot"
 */
export type RoutingProfile = "car" | "bike" | "foot" | "truck";

export type RoutingProfileLegacy =
  | RoutingProfile
  | "driving"
  | "auto"
  | "bicycle"
  | "pedestrian";

export const PROFILE_ALIAS: Record<RoutingProfileLegacy, RoutingProfile> = {
  car: "car",
  driving: "car",
  auto: "car",
  bike: "bike",
  bicycle: "bike",
  foot: "foot",
  pedestrian: "foot",
  truck: "truck",
};

// ─── Geometry primitives ────────────────────────────────────────────────────

export interface RoutingLocation {
  lat: number;
  lon: number;
}

// ─── Request shapes ─────────────────────────────────────────────────────────

/**
 * `action: "route"` — classic A → B [→ C …] directions.
 * Minimum 2 locations. `alternatives` returns up to 3 variants.
 */
export interface RouteActionRequest {
  action: "route";
  profile: RoutingProfile;
  locations: RoutingLocation[];
  alternatives?: boolean;
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  avoidFerries?: boolean;
  steps?: boolean;
}

/**
 * `action: "table"` — N×N distance/duration matrix.
 */
export interface TableActionRequest {
  action: "table";
  profile: RoutingProfile;
  locations: RoutingLocation[];
  sources?: number[];
  destinations?: number[];
}

/**
 * `action: "nearest"` — snap a single coordinate to the routing graph.
 */
export interface NearestActionRequest {
  action: "nearest";
  profile: RoutingProfile;
  locations: [RoutingLocation];
  number?: number;
}

/**
 * `action: "trip"` — TSP-style optimal ordering.
 */
export interface TripActionRequest {
  action: "trip";
  profile: RoutingProfile;
  locations: RoutingLocation[];
  roundtrip?: boolean;
}

export type RoutingRequest =
  | RouteActionRequest
  | TableActionRequest
  | NearestActionRequest
  | TripActionRequest;

// ─── Response shapes ────────────────────────────────────────────────────────

export interface RoutingWaypoint {
  name: string;
  location: [number, number];
  distance: number;
}

export interface RoutingManeuver {
  type: string;
  modifier?: string;
  location: [number, number];
  bearingBefore: number;
  bearingAfter: number;
  instruction?: string;
}

export interface RoutingStep {
  distance: number;
  duration: number;
  geometry: GeoJSON.LineString;
  name: string;
  ref?: string;
  mode: string;
  maneuver: RoutingManeuver;
}

export interface RoutingLeg {
  distance: number;
  duration: number;
  steps: RoutingStep[];
  summary: string;
  tolls?: {
    segments: number;
    priceLigeros: number | null;
    pricePesados: number | null;
  };
}

export interface RoutingRoute {
  distance: number;
  duration: number;
  geometry: GeoJSON.LineString;
  legs: RoutingLeg[];
  profile: RoutingProfile;
  alternativeIndex?: number;
  flags?: {
    avoidTolls?: boolean;
    avoidHighways?: boolean;
  };
}

export interface RouteActionResponse {
  code: "Ok";
  profile: RoutingProfile;
  routes: RoutingRoute[];
  waypoints: RoutingWaypoint[];
  engine: "osrm" | "valhalla";
}

export interface TableActionResponse {
  code: "Ok";
  profile: RoutingProfile;
  durations: number[][];
  distances: number[][];
  sources: RoutingWaypoint[];
  destinations: RoutingWaypoint[];
  engine: "osrm" | "valhalla";
}

export interface NearestActionResponse {
  code: "Ok";
  profile: RoutingProfile;
  waypoints: RoutingWaypoint[];
  engine: "osrm" | "valhalla";
}

export interface TripActionResponse {
  code: "Ok";
  profile: RoutingProfile;
  trips: RoutingRoute[];
  waypoints: (RoutingWaypoint & { waypointIndex: number; tripsIndex: number })[];
  engine: "osrm" | "valhalla";
}

export interface RoutingErrorResponse {
  code: "NoRoute" | "NoSegment" | "InvalidInput" | "Error";
  error: string;
  hint?: string;
}

export type RoutingResponse =
  | RouteActionResponse
  | TableActionResponse
  | NearestActionResponse
  | TripActionResponse
  | RoutingErrorResponse;

// ─── Profile container routing map ──────────────────────────────────────────

/**
 * Internal mapping profile → OSRM container URL.
 * Used by src/app/api/route/route.ts to dispatch.
 * Consumers read via env vars, never hardcode.
 */
export const PROFILE_CONTAINER: Record<RoutingProfile, string> = {
  car: process.env.OSRM_CAR_URL || "http://trafico-osrm-car:5000",
  bike: process.env.OSRM_BIKE_URL || "http://trafico-osrm-bike:5000",
  foot: process.env.OSRM_FOOT_URL || "http://trafico-osrm-foot:5000",
  truck: process.env.VALHALLA_URL || "http://trafico-valhalla:8002",
};

export function resolveProfile(raw: string | undefined): RoutingProfile {
  if (!raw) return "car";
  const key = raw.toLowerCase() as RoutingProfileLegacy;
  return PROFILE_ALIAS[key] ?? "car";
}
