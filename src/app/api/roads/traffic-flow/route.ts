import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFromCache, setInCache } from "@/lib/redis";
import { applyRateLimit } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

const CACHE_KEY = "roads:traffic-flow";
const CACHE_TTL = 60; // 1 minute — near real-time

interface IncidentPoint {
  lat: number;
  lng: number;
  severity: string;
}

// Spatial hash for O(n+m) proximity lookups instead of O(n×m) haversine
// Grid cell size ~500m at mid-latitudes (Spain ~40°N)
const CELL_SIZE = 0.005; // ~500m in degrees at 40°N

function cellKey(lat: number, lng: number): string {
  return `${Math.floor(lat / CELL_SIZE)},${Math.floor(lng / CELL_SIZE)}`;
}

class SpatialIndex {
  private grid = new Map<string, IncidentPoint[]>();

  constructor(points: IncidentPoint[]) {
    for (const p of points) {
      const key = cellKey(p.lat, p.lng);
      const cell = this.grid.get(key);
      if (cell) cell.push(p);
      else this.grid.set(key, [p]);
    }
  }

  /** Find all points within ~500m of (lat, lng) by checking 9 neighboring cells */
  nearby(lat: number, lng: number): IncidentPoint[] {
    const cx = Math.floor(lat / CELL_SIZE);
    const cy = Math.floor(lng / CELL_SIZE);
    const results: IncidentPoint[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const cell = this.grid.get(`${cx + dx},${cy + dy}`);
        if (cell) results.push(...cell);
      }
    }
    return results;
  }
}

function getFlowColor(incidentCount: number, maxSeverity: string): string {
  if (incidentCount === 0) return "#22c55e"; // green — clear
  if (maxSeverity === "VERY_HIGH" || maxSeverity === "HIGH") return "#dc2626"; // red
  if (incidentCount >= 3) return "#f97316"; // orange — congested
  if (incidentCount >= 1) return "#eab308"; // yellow — slow
  return "#22c55e"; // green
}

function getFlowLevel(incidentCount: number): string {
  if (incidentCount === 0) return "free";
  if (incidentCount <= 1) return "moderate";
  if (incidentCount <= 3) return "slow";
  return "congested";
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const cached = await getFromCache<GeoJSON.FeatureCollection>(CACHE_KEY);
    if (cached) {
      return NextResponse.json({ success: true, data: cached, source: "cache" }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
    }

    // Fetch active incidents
    const incidents = await prisma.trafficIncident.findMany({
      where: { isActive: true },
      select: {
        latitude: true,
        longitude: true,
        severity: true,
      },
    });

    const incidentPoints: IncidentPoint[] = incidents.map((inc) => ({
      lat: Number(inc.latitude),
      lng: Number(inc.longitude),
      severity: String(inc.severity),
    }));

    // Fetch road geometry from cache
    const roadGeometry = await getFromCache<GeoJSON.FeatureCollection>("roads:geometry:spain");

    if (!roadGeometry || !roadGeometry.features) {
      return NextResponse.json(
        {
          success: false,
          error: "Road geometry not cached. Call /api/roads/geometry first.",
        },
        { status: 424 }
      );
    }

    // Spatial index for O(n+m) proximity lookups
    const index = new SpatialIndex(incidentPoints);
    const severityRank: Record<string, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, VERY_HIGH: 3 };
    const features: GeoJSON.Feature[] = [];

    for (const road of roadGeometry.features) {
      if (road.geometry.type !== "LineString") continue;

      const coords = road.geometry.coordinates as [number, number][];
      if (coords.length < 2) continue;

      const midIdx = Math.floor(coords.length / 2);
      const midLng = coords[midIdx][0];
      const midLat = coords[midIdx][1];

      // O(1) grid lookup instead of O(incidents) haversine scan
      const nearby = index.nearby(midLat, midLng);
      let maxSeverity = "LOW";
      for (const inc of nearby) {
        if ((severityRank[inc.severity] ?? 0) > (severityRank[maxSeverity] ?? 0)) {
          maxSeverity = inc.severity;
        }
      }

      features.push({
        type: "Feature",
        geometry: road.geometry,
        properties: {
          ...road.properties,
          flowColor: getFlowColor(nearby.length, maxSeverity),
          flowLevel: getFlowLevel(nearby.length),
          incidentCount: nearby.length,
          maxSeverity: nearby.length > 0 ? maxSeverity : null,
        },
      });
    }

    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features,
    };

    await setInCache(CACHE_KEY, geojson, CACHE_TTL);

    const stats = {
      totalSegments: features.length,
      free: features.filter((f) => f.properties?.flowLevel === "free").length,
      moderate: features.filter((f) => f.properties?.flowLevel === "moderate").length,
      slow: features.filter((f) => f.properties?.flowLevel === "slow").length,
      congested: features.filter((f) => f.properties?.flowLevel === "congested").length,
    };

    return NextResponse.json({ success: true, data: geojson, source: "computed", stats });
  } catch (error) {
    reportApiError(error, "Traffic flow API error");
    return NextResponse.json(
      { success: false, error: "Failed to compute traffic flow" },
      { status: 500 }
    );
  }
}
