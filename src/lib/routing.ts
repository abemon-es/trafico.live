/**
 * Valhalla routing client for trafico.live
 *
 * Provides route calculation, isochrones, and map matching
 * via the self-hosted Valhalla engine.
 */

const ROUTE_API = "/api/route";

export interface RoutingLocation {
  lat: number;
  lon: number;
}

export type CostingModel = "auto" | "truck" | "bicycle" | "pedestrian" | "motor_scooter";

export interface RouteRequest {
  locations: RoutingLocation[];
  costing: CostingModel;
  units?: "km" | "mi";
  language?: string;
  directions_options?: {
    units?: "km" | "mi";
    language?: string;
  };
}

export interface RouteResponse {
  trip: {
    legs: RouteLeg[];
    summary: RouteSummary;
    status_message: string;
    status: number;
    units: string;
    language: string;
  };
}

export interface RouteLeg {
  maneuvers: RouteManeuver[];
  summary: RouteSummary;
  shape: string; // Encoded polyline
}

export interface RouteSummary {
  time: number; // seconds
  length: number; // km or mi
  min_lat: number;
  min_lon: number;
  max_lat: number;
  max_lon: number;
}

export interface RouteManeuver {
  type: number;
  instruction: string;
  street_names?: string[];
  length: number;
  time: number;
  begin_shape_index: number;
  end_shape_index: number;
}

export interface IsochroneRequest {
  locations: [RoutingLocation];
  costing: CostingModel;
  contours: { time?: number; distance?: number }[];
  polygons?: boolean;
}

export interface IsochroneResponse {
  type: "FeatureCollection";
  features: GeoJSON.Feature[];
}

/**
 * Calculate a route between two or more points.
 */
export async function calculateRoute(
  locations: RoutingLocation[],
  costing: CostingModel = "auto",
): Promise<RouteResponse> {
  const res = await fetch(ROUTE_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "route",
      locations,
      costing,
      units: "km",
      directions_options: { units: "km", language: "es-ES" },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Route failed" }));
    throw new Error(err.error || `Route failed: ${res.status}`);
  }

  return res.json();
}

/**
 * Calculate isochrone (drive-time) polygons from a point.
 *
 * @param center - Origin point
 * @param contours - Time in minutes (e.g., [15, 30, 60])
 * @param costing - Vehicle type
 * @returns GeoJSON FeatureCollection with isochrone polygons
 */
export async function calculateIsochrone(
  center: RoutingLocation,
  contours: number[],
  costing: CostingModel = "auto",
): Promise<IsochroneResponse> {
  const res = await fetch(ROUTE_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "isochrone",
      locations: [center],
      costing,
      contours: contours.map((time) => ({ time })),
      polygons: true,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Isochrone failed" }));
    throw new Error(err.error || `Isochrone failed: ${res.status}`);
  }

  return res.json();
}

/**
 * Decode Valhalla's encoded polyline (precision 6) to coordinates.
 */
export function decodePolyline(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let lat = 0;
  let lng = 0;
  let i = 0;

  while (i < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(i++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(i++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coords.push([lng / 1e6, lat / 1e6]);
  }

  return coords;
}

/**
 * Convert a Valhalla route response to a GeoJSON LineString for MapLibre.
 */
export function routeToGeoJSON(route: RouteResponse): GeoJSON.Feature {
  const coords = route.trip.legs.flatMap((leg) => decodePolyline(leg.shape));
  return {
    type: "Feature",
    geometry: { type: "LineString", coordinates: coords },
    properties: {
      time: route.trip.summary.time,
      length: route.trip.summary.length,
    },
  };
}
