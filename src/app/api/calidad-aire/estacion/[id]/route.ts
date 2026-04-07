/**
 * GET /api/calidad-aire/estacion/[id]
 *
 * Station detail + latest reading + 24h history.
 * [id] = MITECO stationId (e.g. "ES1985A").
 */

import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { authenticateRequest } from "@/lib/auth";
import { getFromCache, setInCache } from "@/lib/redis";

const CACHE_KEY_PREFIX = "api:calidad-aire:estacion";
const CACHE_TTL = 300; // 5 minutes

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResponse = authenticateRequest(request);
  if (authResponse) return authResponse;

  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { id } = await params;
    const stationId = decodeURIComponent(id);

    // Cache
    const cacheKey = `${CACHE_KEY_PREFIX}:${stationId}`;
    const cached = await getFromCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    // Station
    const station = await prisma.airQualityStation.findUnique({
      where: { stationId },
    });

    if (!station) {
      return NextResponse.json(
        { success: false, error: "Estacion no encontrada" },
        { status: 404 }
      );
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Latest reading + 24h history in parallel
    const [latestReading, history] = await Promise.all([
      prisma.airQualityReading.findFirst({
        where: { stationId: station.id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.airQualityReading.findMany({
        where: {
          stationId: station.id,
          createdAt: { gte: twentyFourHoursAgo },
        },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          no2: true,
          pm10: true,
          pm25: true,
          o3: true,
          so2: true,
          co: true,
          ica: true,
          icaLabel: true,
          createdAt: true,
        },
      }),
    ]);

    const responseData = {
      success: true,
      data: {
        station: {
          id: station.id,
          stationId: station.stationId,
          name: station.name,
          city: station.city,
          province: station.province,
          network: station.network,
          latitude: Number(station.latitude),
          longitude: Number(station.longitude),
          elevation: station.elevation,
          updatedAt: station.updatedAt,
        },
        latestReading: latestReading
          ? {
              ica: latestReading.ica,
              icaLabel: latestReading.icaLabel,
              no2: latestReading.no2,
              pm10: latestReading.pm10,
              pm25: latestReading.pm25,
              o3: latestReading.o3,
              so2: latestReading.so2,
              co: latestReading.co,
              createdAt: latestReading.createdAt,
            }
          : null,
        history: history.map((r) => ({
          ica: r.ica,
          icaLabel: r.icaLabel,
          no2: r.no2,
          pm10: r.pm10,
          pm25: r.pm25,
          o3: r.o3,
          so2: r.so2,
          co: r.co,
          createdAt: r.createdAt,
        })),
      },
    };

    await setInCache(cacheKey, responseData, CACHE_TTL);
    return NextResponse.json(responseData);
  } catch (error) {
    reportApiError(error, "Air quality station API error", request);
    return NextResponse.json(
      { success: false, error: "Error al obtener datos de la estacion" },
      { status: 500 }
    );
  }
}
