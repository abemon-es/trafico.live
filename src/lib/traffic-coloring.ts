/**
 * Traffic coloring — paint road segments on the custom tileset
 * based on live DGT intensity / congestion data.
 *
 * Uses MapLibre's data-driven styling to color the `roads` layer
 * from the custom trafico-iberia.pmtiles tileset.
 *
 * Two approaches supported:
 * 1. setFeatureState (per-feature, up to ~50K features) — best for real-time
 * 2. match expression (rebuild style on data refresh) — best for batch updates
 */

import type maplibregl from "maplibre-gl";
import { MAP_COLORS } from "./map-config";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TrafficSegment {
  /** Road reference (AP-7, A-1, N-340) — join key to tile features */
  ref: string;
  /** Congestion level */
  level: "free" | "moderate" | "heavy" | "blocked";
  /** Average speed (km/h), if available */
  speed?: number;
  /** Service level (0=fluid, 1=slow, 2=holdups, 3=congestion) */
  serviceLevel?: number;
}

// ─── Color scales ───────────────────────────────────────────────────────────

const TRAFFIC_COLORS = {
  free: MAP_COLORS.trafficGreen,      // #059669
  moderate: MAP_COLORS.trafficYellow,  // #eab308
  heavy: MAP_COLORS.trafficOrange,     // #f97316
  blocked: MAP_COLORS.trafficRed,      // #dc2626
  noData: "#9ca3af",                   // gray-400
} as const;

// ─── Layer setup ────────────────────────────────────────────────────────────

/**
 * Add the traffic-colored roads layer to a map that has the custom
 * trafico-iberia tileset loaded.
 *
 * Call this once after map load, then update with applyTrafficData().
 */
export function addTrafficLayer(map: maplibregl.Map, options?: {
  sourceId?: string;
  sourceLayer?: string;
  before?: string;
}): void {
  const {
    sourceId = "trafico-iberia",
    sourceLayer = "roads",
    before,
  } = options ?? {};

  if (map.getLayer("roads-traffic")) return;

  // Main traffic coloring layer — major roads only (motorway, trunk, primary)
  map.addLayer({
    id: "roads-traffic",
    type: "line",
    source: sourceId,
    "source-layer": sourceLayer,
    filter: ["in", "highway", "motorway", "trunk", "primary", "secondary"],
    paint: {
      "line-color": [
        "case",
        ["==", ["feature-state", "level"], "blocked"], TRAFFIC_COLORS.blocked,
        ["==", ["feature-state", "level"], "heavy"], TRAFFIC_COLORS.heavy,
        ["==", ["feature-state", "level"], "moderate"], TRAFFIC_COLORS.moderate,
        ["==", ["feature-state", "level"], "free"], TRAFFIC_COLORS.free,
        TRAFFIC_COLORS.noData,
      ],
      "line-width": [
        "interpolate", ["linear"], ["zoom"],
        5, ["match", ["get", "highway"],
          "motorway", 2.5, "trunk", 2, "primary", 1.5, 1],
        10, ["match", ["get", "highway"],
          "motorway", 5, "trunk", 4, "primary", 3, 2],
        14, ["match", ["get", "highway"],
          "motorway", 8, "trunk", 6, "primary", 5, 3],
      ],
      "line-opacity": [
        "case",
        ["has", ["feature-state", "level"]], 0.9,
        0.3, // roads without traffic data are faint
      ],
    },
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
  } as maplibregl.AddLayerObject, before);

  // Glow/casing for traffic-active roads
  map.addLayer({
    id: "roads-traffic-casing",
    type: "line",
    source: sourceId,
    "source-layer": sourceLayer,
    filter: ["in", "highway", "motorway", "trunk", "primary"],
    paint: {
      "line-color": "#000000",
      "line-width": [
        "interpolate", ["linear"], ["zoom"],
        5, 3.5, 10, 7, 14, 11,
      ],
      "line-opacity": [
        "case",
        ["has", ["feature-state", "level"]], 0.15,
        0,
      ],
    },
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
  } as maplibregl.AddLayerObject, "roads-traffic");
}

// ─── Data application ───────────────────────────────────────────────────────

/**
 * Apply traffic data to road features using setFeatureState.
 *
 * Each segment's `ref` (AP-7, A-1, etc.) is matched to the tile feature's
 * `ref` property via promoteId.
 *
 * NOTE: The source must be added with `promoteId: { roads: "ref" }` for
 * this to work. See addCustomTileset() in map-tiles.ts.
 */
export function applyTrafficData(
  map: maplibregl.Map,
  segments: TrafficSegment[],
  sourceId = "trafico-iberia",
  sourceLayer = "roads",
): void {
  for (const seg of segments) {
    map.setFeatureState(
      { source: sourceId, sourceLayer, id: seg.ref },
      {
        level: seg.level,
        speed: seg.speed ?? null,
        serviceLevel: seg.serviceLevel ?? null,
      },
    );
  }
}

/**
 * Clear all traffic state from road features.
 */
export function clearTrafficData(
  map: maplibregl.Map,
  sourceId = "trafico-iberia",
  sourceLayer = "roads",
): void {
  map.removeFeatureState({ source: sourceId, sourceLayer });
}

/**
 * Alternative: apply traffic data via a match expression.
 * Use this if setFeatureState has performance issues (>50K features).
 * Rebuilds the paint property on each call.
 */
export function applyTrafficDataViaExpression(
  map: maplibregl.Map,
  segments: TrafficSegment[],
): void {
  if (segments.length === 0) return;

  const matchArgs: (string | maplibregl.ExpressionSpecification)[] = [];
  for (const seg of segments) {
    matchArgs.push(seg.ref);
    matchArgs.push(TRAFFIC_COLORS[seg.level]);
  }

  map.setPaintProperty("roads-traffic", "line-color", [
    "match", ["get", "ref"],
    ...matchArgs,
    TRAFFIC_COLORS.noData,
  ]);

  // Make traffic roads fully opaque
  map.setPaintProperty("roads-traffic", "line-opacity", [
    "match", ["get", "ref"],
    ...segments.flatMap((s) => [s.ref, 0.9]),
    0.3,
  ]);
}
