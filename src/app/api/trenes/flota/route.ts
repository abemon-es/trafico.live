import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { applyRateLimit } from "@/lib/api-utils";
import { getOrCompute } from "@/lib/redis";

export const revalidate = 0; // Real-time data — no static caching

/**
 * GET /api/trenes/flota
 *
 * Returns the current Renfe LD fleet snapshot as a GeoJSON FeatureCollection.
 * Each feature is a Point with train metadata as properties.
 *
 * Query Parameters:
 *   brand    — Filter by brand: AVE | Alvia | Avant | Altaria | Euromed |
 *               Trenhotel | Talgo | AV City | Intercity | MD | Regional | REG.EXP
 *   delayed  — "true" = only trains with delay > 0 minutes
 *
 * GET /api/trenes/flota?history=true&train={trainNumber}
 *
 *   Returns position history for a single train over the last 48 hours.
 *   Ordered by fetchedAt ascending. Useful for track replays.
 *
 * Redis cache:
 *   - Current snapshot: 60 seconds
 *   - History per train: 120 seconds
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);

    const history = searchParams.get("history") === "true";
    const trainNumber = searchParams.get("train");

    // ── History mode: single train, last 48 hours ─────────────────────────
    if (history) {
      if (!trainNumber) {
        return NextResponse.json(
          { success: false, error: "Missing required parameter: train" },
          { status: 400 }
        );
      }

      const cacheKey = `fleet:history:${trainNumber}`;

      const geojson = await getOrCompute(cacheKey, 120, async () => {
        const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
        const positions = await prisma.renfeFleetPosition.findMany({
          where: {
            trainNumber,
            fetchedAt: { gte: cutoff },
          },
          orderBy: { fetchedAt: "asc" },
        });

        return buildFeatureCollection(positions);
      });

      return NextResponse.json(geojson, {
        headers: {
          "Cache-Control": "public, max-age=120, stale-while-revalidate=30",
        },
      });
    }

    // ── Snapshot mode: latest position per train ──────────────────────────
    const brandFilter = searchParams.get("brand");
    const delayedOnly = searchParams.get("delayed") === "true";

    // Build a cache key that reflects the active filters
    const cacheKey = `fleet:snapshot:${brandFilter ?? "all"}:${delayedOnly ? "delayed" : "all"}`;

    const geojson = await getOrCompute(cacheKey, 60, async () => {
      // "Latest" = positions fetched within the last 5 minutes
      // (collector runs every 2 min, so 5 min gives a 1-cycle buffer)
      const windowStart = new Date(Date.now() - 5 * 60 * 1000);

      const where: Prisma.RenfeFleetPositionWhereInput = {
        fetchedAt: { gte: windowStart },
      };

      if (brandFilter) {
        where.brand = brandFilter;
      }

      if (delayedOnly) {
        where.delay = { gt: 0 };
      }

      // Fetch all positions in the window, then deduplicate to latest per train
      const positions = await prisma.renfeFleetPosition.findMany({
        where,
        orderBy: { fetchedAt: "desc" },
      });

      // Keep only the most recent position per trainNumber
      const seen = new Set<string>();
      const latest = positions.filter((p) => {
        if (seen.has(p.trainNumber)) return false;
        seen.add(p.trainNumber);
        return true;
      });

      return buildFeatureCollection(latest);
    });

    return NextResponse.json(geojson, {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=15",
      },
    });
  } catch (error) {
    reportApiError(error, "Fleet positions API error", request);
    return NextResponse.json(
      { success: false, error: "Failed to fetch fleet positions" },
      { status: 500 }
    );
  }
}

// ── GeoJSON helpers ─────────────────────────────────────────────────────────

interface FleetFeatureProperties {
  id: string;
  trainNumber: string;
  brand: string | null;
  serviceType: string | null;
  speed: number | null;
  delay: number | null;
  prevStation: string | null;
  nextStation: string | null;
  nextStationEta: string | null;
  originStation: string | null;
  destStation: string | null;
  rollingStock: string | null;
  fetchedAt: string;
}

interface FleetFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat] — GeoJSON convention
  };
  properties: FleetFeatureProperties;
}

interface FleetFeatureCollection {
  type: "FeatureCollection";
  features: FleetFeature[];
  meta: {
    count: number;
    generatedAt: string;
    source: string;
  };
}

type PositionRecord = {
  id: string;
  trainNumber: string;
  serviceType: string | null;
  brand: string | null;
  latitude: Prisma.Decimal;
  longitude: Prisma.Decimal;
  speed: number | null;
  delay: number | null;
  originStation: string | null;
  destStation: string | null;
  prevStation: string | null;
  nextStation: string | null;
  nextStationEta: Date | null;
  rollingStock: string | null;
  fetchedAt: Date;
};

function buildFeatureCollection(positions: PositionRecord[]): FleetFeatureCollection {
  const features: FleetFeature[] = positions.map((p) => ({
    type: "Feature",
    geometry: {
      type: "Point",
      // GeoJSON convention: [longitude, latitude]
      coordinates: [Number(p.longitude), Number(p.latitude)],
    },
    properties: {
      id: p.id,
      trainNumber: p.trainNumber,
      brand: p.brand,
      serviceType: p.serviceType,
      speed: p.speed,
      delay: p.delay,
      prevStation: p.prevStation,
      nextStation: p.nextStation,
      nextStationEta: p.nextStationEta?.toISOString() ?? null,
      originStation: p.originStation,
      destStation: p.destStation,
      rollingStock: p.rollingStock,
      fetchedAt: p.fetchedAt.toISOString(),
    },
  }));

  return {
    type: "FeatureCollection",
    features,
    meta: {
      count: features.length,
      generatedAt: new Date().toISOString(),
      source: "Renfe Operadora",
    },
  };
}
