/**
 * OSRM routing client for trafico.live
 *
 * Provides route calculation via self-hosted OSRM engine.
 * API: /api/route (proxies to OSRM on the server)
 */

const ROUTE_API = "/api/route";

export interface RoutingLocation {
  lat: number;
  lon: number;
}

export type CostingModel = "auto" | "driving" | "truck" | "bicycle" | "pedestrian";

// ─── OSRM Response Types ────────────────────────────────────────────────────

export interface RouteResponse {
  code: string;
  routes: OSRMRoute[];
  waypoints: OSRMWaypoint[];
}

export interface OSRMRoute {
  distance: number; // meters
  duration: number; // seconds
  geometry: GeoJSON.LineString;
  legs: OSRMLeg[];
}

export interface OSRMLeg {
  distance: number;
  duration: number;
  steps: OSRMStep[];
  summary: string;
}

export interface OSRMStep {
  distance: number;
  duration: number;
  geometry: GeoJSON.LineString;
  name: string;
  ref?: string;
  mode: string;
  maneuver: {
    type: string;
    modifier?: string;
    location: [number, number];
    bearing_before: number;
    bearing_after: number;
  };
}

export interface OSRMWaypoint {
  name: string;
  location: [number, number];
  distance: number;
}

// ─── Route calculation ──────────────────────────────────────────────────────

/**
 * Calculate a route between two or more points.
 */
export async function calculateRoute(
  locations: RoutingLocation[],
  _costing: CostingModel = "driving",
): Promise<RouteResponse> {
  const res = await fetch(ROUTE_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "route", locations }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Route failed" }));
    throw new Error(err.error || `Route failed: ${res.status}`);
  }

  const data: RouteResponse = await res.json();
  if (data.code !== "Ok") {
    throw new Error(`OSRM error: ${data.code}`);
  }
  return data;
}

/**
 * Convert an OSRM route to a GeoJSON Feature for MapLibre.
 */
export function routeToGeoJSON(route: RouteResponse): GeoJSON.Feature {
  const geom = route.routes[0].geometry;
  return {
    type: "Feature",
    geometry: geom,
    properties: {
      distance: route.routes[0].distance,
      duration: route.routes[0].duration,
    },
  };
}

/**
 * Format duration (seconds) as human-readable Spanish string.
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return `${h} h ${m} min`;
  return `${m} min`;
}

/**
 * Format distance (meters) as human-readable string.
 */
export function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

/**
 * Get maneuver instruction in Spanish.
 */
export function getManeuverText(step: OSRMStep): string {
  const { type, modifier } = step.maneuver;
  const name = step.ref ? `${step.ref} (${step.name})` : step.name || "la carretera";

  switch (type) {
    case "depart": return `Salir por ${name}`;
    case "arrive": return "Has llegado a tu destino";
    case "turn":
      if (modifier === "left") return `Gira a la izquierda por ${name}`;
      if (modifier === "right") return `Gira a la derecha por ${name}`;
      if (modifier === "slight left") return `Gira ligeramente a la izquierda por ${name}`;
      if (modifier === "slight right") return `Gira ligeramente a la derecha por ${name}`;
      if (modifier === "sharp left") return `Gira bruscamente a la izquierda por ${name}`;
      if (modifier === "sharp right") return `Gira bruscamente a la derecha por ${name}`;
      return `Continúa por ${name}`;
    case "continue": return `Continúa por ${name}`;
    case "merge": return `Incorpórate a ${name}`;
    case "fork":
      if (modifier === "left") return `Toma el desvío a la izquierda por ${name}`;
      if (modifier === "right") return `Toma el desvío a la derecha por ${name}`;
      return `Continúa por ${name}`;
    case "roundabout": return `Entra en la rotonda, toma la salida hacia ${name}`;
    case "exit roundabout": return `Sal de la rotonda por ${name}`;
    case "new name": return `Continúa por ${name}`;
    case "end of road":
      if (modifier === "left") return `Al final de la carretera, gira a la izquierda por ${name}`;
      if (modifier === "right") return `Al final de la carretera, gira a la derecha por ${name}`;
      return `Al final de la carretera, continúa por ${name}`;
    default: return `Continúa por ${name}`;
  }
}
