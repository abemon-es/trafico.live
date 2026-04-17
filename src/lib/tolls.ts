/**
 * Toll road matching from OSRM route refs.
 *
 * Strategy: walk route.legs[*].steps[*].ref and match against tollData.roads[*].id.
 * No PostGIS geometry on TollSegment — use full-road price sum as worst-case overestimate.
 * Returns de-duplicated matches sorted by priceLigeros descending.
 */

import tollDataRaw from "../../data/tolls.json";
import type { RoutingRoute } from "@/types/routing";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TollJsonSegment {
  from: string;
  to: string;
  km: number;
  price: number;
}

interface TollJsonRoad {
  id: string;
  name: string;
  operator: string;
  expires?: string;
  segments: TollJsonSegment[];
  freeAlternative?: {
    road: string;
    km: number;
    extraMinutes: number;
    description: string;
  };
}

interface TollJsonSeittPerKm {
  ligeros: { tag: number; cash: number };
  pesados1: { tag: number; cash: number };
  pesados2: { tag: number; cash: number };
  freeHours: string;
  roads: string[];
}

interface TollJsonData {
  lastUpdated: string;
  source: string;
  seittPerKm: TollJsonSeittPerKm;
  roads: TollJsonRoad[];
}

const tollData = tollDataRaw as TollJsonData;

export interface TollMatch {
  tollRoadId: string;
  name: string;
  operator: string;
  segmentsTraversed: number;
  priceLigeros: number;
  pricePesados: number | null;
}

// Build a lookup map id → road for O(1) access
const TOLL_ROAD_MAP = new Map<string, TollJsonRoad>(
  tollData.roads.map((r) => [r.id.toUpperCase(), r])
);

// SEITT roads use per-km pricing instead of fixed segments
const SEITT_ROADS = new Set(
  (tollData.seittPerKm?.roads ?? []).map((r) => r.toUpperCase())
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract unique road refs from a RoutingRoute.
 * OSRM encodes `ref` as a semicolon-separated string per step (e.g. "AP-7;AP-68").
 */
function extractRefs(route: RoutingRoute): Set<string> {
  const refs = new Set<string>();
  for (const leg of route.legs ?? []) {
    for (const step of leg.steps ?? []) {
      if (step.ref) {
        // OSRM may return "AP-7", "AP-7;A-2", or "AP-7 / A-2"
        const parts = step.ref.split(/[;/,]/).map((p) => p.trim().toUpperCase());
        for (const part of parts) {
          if (part) refs.add(part);
        }
      }
    }
  }
  return refs;
}

/**
 * Compute max segment price for a road (full traversal worst-case).
 * If multiple segments exist we take the entry for start→end (highest km),
 * which is the first segment by convention in tolls.json.
 */
function maxSegmentPrice(road: TollJsonRoad): number {
  if (!road.segments.length) return 0;
  return Math.max(...road.segments.map((s) => s.price));
}

/**
 * Estimate SEITT per-km price for a matched road given the route distance.
 * Only applied if the road is in seittPerKm.roads.
 */
function seittPrice(road: TollJsonRoad, route: RoutingRoute): number {
  // Use the road's own segment km if available, else fall back to route distance
  const km =
    road.segments.length > 0
      ? Math.max(...road.segments.map((s) => s.km))
      : (route.distance ?? 0) / 1000;
  return km * (tollData.seittPerKm?.ligeros?.tag ?? 0.0827);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function matchTollsFromRoute(route: RoutingRoute): TollMatch[] {
  const refs = extractRefs(route);
  if (refs.size === 0) return [];

  const matches: TollMatch[] = [];
  const seen = new Set<string>();

  for (const ref of refs) {
    if (seen.has(ref)) continue;
    const road = TOLL_ROAD_MAP.get(ref);
    if (!road) continue;
    seen.add(ref);

    const isSeitt = SEITT_ROADS.has(ref);
    const priceLigeros = isSeitt
      ? seittPrice(road, route)
      : maxSegmentPrice(road);

    if (priceLigeros <= 0) continue;

    matches.push({
      tollRoadId: road.id,
      name: road.name,
      operator: road.operator,
      segmentsTraversed: road.segments.length,
      priceLigeros,
      pricePesados: isSeitt
        ? Math.max(...road.segments.map((s) => s.km)) *
          (tollData.seittPerKm?.pesados1?.tag ?? 0.1194)
        : null,
    });
  }

  return matches.sort((a, b) => b.priceLigeros - a.priceLigeros);
}

export function totalToll(matches: TollMatch[]): {
  ligeros: number;
  pesados: number | null;
} {
  const ligeros = matches.reduce((sum, m) => sum + m.priceLigeros, 0);
  const hasPesados = matches.some((m) => m.pricePesados !== null);
  const pesados = hasPesados
    ? matches.reduce((sum, m) => sum + (m.pricePesados ?? m.priceLigeros), 0)
    : null;
  return { ligeros, pesados };
}
