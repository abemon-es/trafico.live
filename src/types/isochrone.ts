/**
 * Isochrone types — drive-time polygon requests/responses via Valhalla.
 *
 * Profiles: "car" (Valhalla costing "auto") and "truck" (Valhalla costing
 * "truck" with default HGV dimensions). Bike/foot isochrones are not
 * supported because drive-time polygons are only meaningful for motorised modes.
 *
 * Consumer: src/lib/isochrone.ts, src/app/api/isochrone/route.ts
 */

import type { RoutingProfile } from "./routing";

export interface IsochroneRequest {
  location: { lat: number; lon: number };
  /** Only "car" and "truck" — bike/foot excluded (drive-time only). */
  profile: Exclude<RoutingProfile, "bike" | "foot">;
  /** Drive-time contours in minutes. Default: [15, 30, 60]. Max 6 values, each 1-120. */
  contoursMinutes?: number[];
  /** Smoothing factor 0–1. Lower = more detailed polygon. Default: 0.5. */
  denoise?: number;
  /** Simplification tolerance in metres. Default: 50. */
  generalize?: number;
  /** ISO 8601 datetime for time-dependent routing (future use). */
  dateTime?: string;
}

export interface IsochroneFeatureProperties {
  /** Drive-time contour in minutes. */
  contour: number;
  color?: string;
  opacity?: number;
  fill?: string;
}

export interface IsochroneResponse {
  type: "FeatureCollection";
  features: Array<
    GeoJSON.Feature<
      GeoJSON.Polygon | GeoJSON.MultiPolygon,
      IsochroneFeatureProperties
    >
  >;
  engine: "valhalla";
  profile: "car" | "truck";
  generatedAt: string;
}
