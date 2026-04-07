/**
 * GET /api/clima/estacion/[id]
 *
 * Station detail + latest records + monthly averages.
 * [id] = AEMET stationCode (indicativo).
 */

import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { authenticateRequest } from "@/lib/auth";
import { getFromCache, setInCache } from "@/lib/redis";

const CACHE_KEY_PREFIX = "api:clima:estacion";
const CACHE_TTL = 3600; // 1 hour

interface MonthlyRow {
  month: Date;
  avg_min: number | null;
  avg_max: number | null;
  avg_avg: number | null;
  total_precip: number | null;
  avg_wind: number | null;
  avg_sun: number | null;
}

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
    const stationCode = decodeURIComponent(id);

    // Cache
    const cacheKey = `${CACHE_KEY_PREFIX}:${stationCode}`;
    const cached = await getFromCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    // Station
    const station = await prisma.climateStation.findUnique({
      where: { stationCode },
    });

    if (!station) {
      return NextResponse.json(
        { success: false, error: "Estacion no encontrada" },
        { status: 404 }
      );
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Latest records + monthly averages in parallel
    const [latestRecords, monthly] = await Promise.all([
      prisma.climateRecord.findMany({
        where: {
          stationId: station.id,
          date: { gte: thirtyDaysAgo },
        },
        orderBy: { date: "desc" },
        select: {
          id: true,
          date: true,
          tempMin: true,
          tempMax: true,
          tempAvg: true,
          precipitation: true,
          snowfall: true,
          windSpeed: true,
          windGust: true,
          windDirection: true,
          sunHours: true,
          humidity: true,
          pressure: true,
        },
      }),
      prisma.$queryRaw<MonthlyRow[]>`
        SELECT DATE_TRUNC('month', date) as month,
          AVG("tempMin"::numeric) as avg_min,
          AVG("tempMax"::numeric) as avg_max,
          AVG("tempAvg"::numeric) as avg_avg,
          SUM(precipitation::numeric) as total_precip,
          AVG("windSpeed"::numeric) as avg_wind,
          AVG("sunHours"::numeric) as avg_sun
        FROM "ClimateRecord"
        WHERE "stationId" = ${station.id}
          AND date >= NOW() - INTERVAL '12 months'
        GROUP BY month
        ORDER BY month
      `,
    ]);

    const responseData = {
      success: true,
      data: {
        station: {
          id: station.id,
          stationCode: station.stationCode,
          name: station.name,
          province: station.province,
          provinceName: station.provinceName,
          latitude: Number(station.latitude),
          longitude: Number(station.longitude),
          altitude: station.altitude,
          isActive: station.isActive,
        },
        latestRecords: latestRecords.map((r) => ({
          date: r.date,
          tempMin: r.tempMin != null ? Number(r.tempMin) : null,
          tempMax: r.tempMax != null ? Number(r.tempMax) : null,
          tempAvg: r.tempAvg != null ? Number(r.tempAvg) : null,
          precipitation: r.precipitation != null ? Number(r.precipitation) : null,
          snowfall: r.snowfall != null ? Number(r.snowfall) : null,
          windSpeed: r.windSpeed != null ? Number(r.windSpeed) : null,
          windGust: r.windGust != null ? Number(r.windGust) : null,
          windDirection: r.windDirection,
          sunHours: r.sunHours != null ? Number(r.sunHours) : null,
          humidity: r.humidity,
          pressure: r.pressure != null ? Number(r.pressure) : null,
        })),
        monthlyAverages: monthly.map((m) => ({
          month: m.month,
          avgMin: m.avg_min != null ? Number(m.avg_min) : null,
          avgMax: m.avg_max != null ? Number(m.avg_max) : null,
          avgAvg: m.avg_avg != null ? Number(m.avg_avg) : null,
          totalPrecip: m.total_precip != null ? Number(m.total_precip) : null,
          avgWind: m.avg_wind != null ? Number(m.avg_wind) : null,
          avgSun: m.avg_sun != null ? Number(m.avg_sun) : null,
        })),
      },
    };

    await setInCache(cacheKey, responseData, CACHE_TTL);
    return NextResponse.json(responseData);
  } catch (error) {
    reportApiError(error, "Climate station API error", request);
    return NextResponse.json(
      { success: false, error: "Error al obtener datos de la estacion climatica" },
      { status: 500 }
    );
  }
}
