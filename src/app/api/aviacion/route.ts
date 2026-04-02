/**
 * Aviation — Real-time Aircraft Positions API
 *
 * Returns current aircraft positions over Spanish airspace as GeoJSON.
 * Data comes from the OpenSky Network collector (TASK=opensky).
 * Positions are stored in a rolling 1-hour window.
 *
 * GET /api/aviacion
 *   ?bounds=sw_lat,sw_lng,ne_lat,ne_lng   (geographic bounding box filter)
 *   ?onGround=true|false                   (filter airborne or on-ground)
 *   ?limit=500                             (default 500, max 2000)
 *
 * Attribution: © The OpenSky Network, https://opensky-network.org (CC BY 4.0)
 */

import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";

// Cache for 30 seconds — aircraft positions update every 5 min (auth) or 30 min (anon)
export const revalidate = 30;

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);

    const bounds = searchParams.get("bounds");
    const onGroundParam = searchParams.get("onGround");
    const limit = Math.min(parseInt(searchParams.get("limit") || "500", 10), 2000);

    // Rolling 1-hour window (matches collector cleanup window)
    const since = new Date(Date.now() - 60 * 60 * 1000);

    // Build query conditions
    const where: {
      createdAt: { gte: Date };
      onGround?: boolean;
    } = {
      createdAt: { gte: since },
    };

    if (onGroundParam !== null) {
      where.onGround = onGroundParam === "true";
    }

    // Fetch the most recent snapshot per aircraft (distinct by icao24)
    // OpenSky creates a new row each run, so we get latest via orderBy+distinct
    const positions = await prisma.aircraftPosition.findMany({
      where,
      distinct: ["icao24"],
      orderBy: [{ icao24: "asc" }, { createdAt: "desc" }],
      take: limit,
    });

    // Apply geographic bounding box filter (post-query, client-driven)
    let filtered = positions;
    if (bounds) {
      const parts = bounds.split(",").map(Number);
      if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
        const [swLat, swLng, neLat, neLng] = parts;
        filtered = positions.filter((p) => {
          const lat = Number(p.latitude);
          const lng = Number(p.longitude);
          return lat >= swLat && lat <= neLat && lng >= swLng && lng <= neLng;
        });
      }
    }

    // Build GeoJSON FeatureCollection
    const geojson = {
      type: "FeatureCollection" as const,
      features: filtered.map((p) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [Number(p.longitude), Number(p.latitude)],
        },
        properties: {
          icao24: p.icao24,
          callsign: p.callsign,
          altitude: p.altitude,
          velocity: p.velocity,
          heading: p.heading,
          verticalRate: p.verticalRate,
          onGround: p.onGround,
          originCountry: p.originCountry,
          updatedAt: p.createdAt,
        },
      })),
    };

    return NextResponse.json(geojson, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    reportApiError(error, "api/aviacion] Aircraft positions error");
    return NextResponse.json(
      {
        type: "FeatureCollection",
        features: [],
        error: "Failed to fetch aircraft positions",
      },
      { status: 500 }
    );
  }
}
