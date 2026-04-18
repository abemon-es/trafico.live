/**
 * OSRM routing client for trafico.live
 *
 * Thin browser-side wrapper over /api/route (which dispatches to the right
 * OSRM profile container per src/types/routing.ts).
 */

import type {
  RoutingLocation,
  RoutingProfile,
  RoutingProfileLegacy,
  RouteActionResponse,
  RoutingRoute,
  RoutingStep,
} from "@/types/routing";
import { PROFILE_ALIAS } from "@/types/routing";

export type {
  RoutingLocation,
  RoutingProfile,
  RoutingProfileLegacy,
  RouteActionResponse,
  RoutingRoute,
  RoutingStep,
} from "@/types/routing";

// Keep old aliases exported so existing UI (mapa/routing-panel.tsx) keeps compiling.
export type CostingModel = RoutingProfileLegacy;
export type RouteResponse = RouteActionResponse;
export type OSRMRoute = RoutingRoute;
export type OSRMLeg = RoutingRoute["legs"][number];
export type OSRMStep = RoutingStep;
export type OSRMWaypoint = RouteActionResponse["waypoints"][number];

const ROUTE_API = "/api/route";

interface RouteOptions {
  alternatives?: boolean;
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  steps?: boolean;
}

export async function calculateRoute(
  locations: RoutingLocation[],
  costing: CostingModel = "car",
  options: RouteOptions = {},
): Promise<RouteActionResponse> {
  const profile: RoutingProfile = PROFILE_ALIAS[costing] ?? "car";

  const res = await fetch(ROUTE_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "route",
      profile,
      locations,
      alternatives: options.alternatives,
      avoidTolls: options.avoidTolls,
      avoidHighways: options.avoidHighways,
      steps: options.steps,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Route failed" }));
    throw new Error(err.error || `Route failed: ${res.status}`);
  }

  const data: RouteActionResponse = await res.json();
  if (data.code !== "Ok") throw new Error(`OSRM error: ${data.code}`);
  return data;
}

export function routeToGeoJSON(route: RouteActionResponse): GeoJSON.Feature {
  const first = route.routes[0];
  return {
    type: "Feature",
    geometry: first.geometry,
    properties: { distance: first.distance, duration: first.duration },
  };
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return `${h} h ${m} min`;
  return `${m} min`;
}

export function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

export function getManeuverText(step: RoutingStep): string {
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
