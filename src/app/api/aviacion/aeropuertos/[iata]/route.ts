/**
 * Airport Detail API
 *
 * GET /api/aviacion/aeropuertos/[iata]
 *
 * Returns full airport detail: basic info, passenger statistics, nearby aircraft
 * count (30 km radius), and runway data.
 *
 * The [iata] param is matched against IATA (case-insensitive) first, then ICAO.
 *
 * Attribution: AENA Aeropuertos, OpenSky Network (CC BY 4.0), OurAirports
 */

import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { getFromCache, setInCache } from "@/lib/redis";

const CACHE_KEY_PREFIX = "api:aviacion:aeropuerto";
const CACHE_TTL = 300; // 5 minutes — matches page revalidate

// Bounding-box approximation: ~30 km in degrees at mid-latitudes (Spain ~40N)
const RADIUS_DEG_LAT = 30 / 111.32;
const RADIUS_DEG_LNG = 30 / (111.32 * Math.cos((40 * Math.PI) / 180));

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ iata: string }> }
) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { iata } = await params;
    const code = iata.toUpperCase();

    const cacheKey = `${CACHE_KEY_PREFIX}:${code}`;
    const cached = await getFromCache(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
        },
      });
    }

    // Look up by IATA first, then ICAO
    const airport = await prisma.airport.findFirst({
      where: {
        OR: [{ iata: code }, { icao: code }],
      },
      include: {
        statistics: {
          orderBy: { periodStart: "desc" },
          take: 120, // ~10 years of monthly data
        },
      },
    });

    if (!airport) {
      return NextResponse.json(
        { success: false, error: `Aeropuerto no encontrado: ${iata}` },
        { status: 404 }
      );
    }

    const lat = Number(airport.latitude);
    const lng = Number(airport.longitude);

    // Count nearby aircraft (30 km bounding box, last hour)
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const nearbyAircraft = await prisma.aircraftPosition.count({
      where: {
        createdAt: { gte: since },
        latitude: {
          gte: lat - RADIUS_DEG_LAT,
          lte: lat + RADIUS_DEG_LAT,
        },
        longitude: {
          gte: lng - RADIUS_DEG_LNG,
          lte: lng + RADIUS_DEG_LNG,
        },
      },
    });

    const result = {
      success: true,
      data: {
        airport: {
          id: airport.id,
          icao: airport.icao,
          iata: airport.iata,
          name: airport.name,
          city: airport.city,
          province: airport.province,
          latitude: lat,
          longitude: lng,
          elevation: airport.elevation,
          isAena: airport.isAena,
        },
        statistics: airport.statistics.map((s) => ({
          metric: s.metric,
          value: Number(s.value),
          periodType: s.periodType,
          periodStart: s.periodStart,
        })),
        nearbyAircraft,
      },
    };

    await setInCache(cacheKey, result, CACHE_TTL);

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    reportApiError(error, "api/aviacion/aeropuertos/[iata]");
    return NextResponse.json(
      { success: false, error: "Error al obtener datos del aeropuerto" },
      { status: 500 }
    );
  }
}
