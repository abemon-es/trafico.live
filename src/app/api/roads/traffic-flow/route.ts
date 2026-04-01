import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFromCache, setInCache } from "@/lib/redis";
import { applyRateLimit } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

const CACHE_KEY = "roads:traffic-flow";
const CACHE_TTL = 60; // 1 minute — near real-time

// Haversine distance in km
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface IncidentPoint {
  lat: number;
  lng: number;
  severity: string;
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
      return NextResponse.json({ success: true, data: cached, source: "cache" });
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

    // For each road feature, compute traffic flow based on nearby incidents
    const PROXIMITY_KM = 0.5; // 500m
    const features: GeoJSON.Feature[] = [];

    for (const road of roadGeometry.features) {
      if (road.geometry.type !== "LineString") continue;

      const coords = road.geometry.coordinates as [number, number][];
      if (coords.length < 2) continue;

      // Sample the midpoint of the segment for proximity check
      const midIdx = Math.floor(coords.length / 2);
      const midLng = coords[midIdx][0];
      const midLat = coords[midIdx][1];

      // Count nearby incidents
      let nearbyCount = 0;
      let maxSeverity = "LOW";
      const severityRank: Record<string, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, VERY_HIGH: 3 };

      for (const inc of incidentPoints) {
        const dist = haversine(midLat, midLng, inc.lat, inc.lng);
        if (dist <= PROXIMITY_KM) {
          nearbyCount++;
          if ((severityRank[inc.severity] ?? 0) > (severityRank[maxSeverity] ?? 0)) {
            maxSeverity = inc.severity;
          }
        }
      }

      features.push({
        type: "Feature",
        geometry: road.geometry,
        properties: {
          ...road.properties,
          flowColor: getFlowColor(nearbyCount, maxSeverity),
          flowLevel: getFlowLevel(nearbyCount),
          incidentCount: nearbyCount,
          maxSeverity: nearbyCount > 0 ? maxSeverity : null,
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
