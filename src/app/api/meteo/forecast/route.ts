/**
 * GET /api/meteo/forecast
 *
 * Returns AEMET 7-day municipal weather forecast data.
 *
 * Query Parameters:
 *   - municipio: INE 5-digit municipio code (e.g. "28079" for Madrid)
 *   - province:  INE 2-digit province code (e.g. "28" for Madrid) — aggregates across municipios
 *   - from:      ISO date string — lower bound on validAt (default: now)
 *   - to:        ISO date string — upper bound on validAt (default: +7 days)
 *
 * Either `municipio` or `province` must be provided.
 *
 * Response includes `latestForecastAt` in meta so consumers know data freshness.
 *
 * Cache: 5 min Redis TTL
 * Rate limit: via applyRateLimit (Redis-backed)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { getOrCompute } from "@/lib/redis";
import { reportApiError } from "@/lib/api-error";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const CACHE_TTL = 300; // 5 minutes
const MAX_ROWS = 500; // safety cap

// Raw row type returned from weather_forecasts table
interface WeatherForecastRow {
  id: string;
  stationId: string;
  municipioCode: string;
  province: string;
  forecastAt: Date;
  validAt: Date;
  horizonHours: number;
  tempMin: Prisma.Decimal | null;
  tempMax: Prisma.Decimal | null;
  tempFeel: Prisma.Decimal | null;
  precipProb: Prisma.Decimal | null;
  precipMm: Prisma.Decimal | null;
  windSpeed: Prisma.Decimal | null;
  windDirDeg: number | null;
  windGust: Prisma.Decimal | null;
  skyState: string | null;
  skyLabel: string | null;
  humidityPct: Prisma.Decimal | null;
  uvIndex: Prisma.Decimal | null;
}

interface LatestRow {
  forecastAt: Date;
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);

    const municipio = searchParams.get("municipio");
    const province = searchParams.get("province");
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    if (!municipio && !province) {
      return NextResponse.json(
        { error: "Either `municipio` or `province` query parameter is required" },
        { status: 400 }
      );
    }

    // Parse date bounds — default to now → +7 days
    const now = new Date();
    const defaultTo = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const fromDate = fromParam ? new Date(fromParam) : now;
    const toDate = toParam ? new Date(toParam) : defaultTo;

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid `from` or `to` date parameter" },
        { status: 400 }
      );
    }

    // Build deterministic cache key
    const cacheKey = `meteo:forecast:${municipio ?? ""}:${province ?? ""}:${fromDate.toISOString().slice(0, 13)}:${toDate.toISOString().slice(0, 13)}`;

    const result = await getOrCompute(cacheKey, CACHE_TTL, async () => {
      let forecasts: WeatherForecastRow[];
      let latestRow: LatestRow | null;

      if (municipio) {
        [forecasts, latestRow] = await Promise.all([
          prisma.$queryRaw<WeatherForecastRow[]>`
            SELECT * FROM weather_forecasts
            WHERE "stationId" = ${municipio}
              AND "validAt" >= ${fromDate}
              AND "validAt" <= ${toDate}
            ORDER BY "stationId" ASC, "validAt" ASC
            LIMIT ${MAX_ROWS}
          `,
          prisma.$queryRaw<LatestRow[]>`
            SELECT "forecastAt" FROM weather_forecasts
            WHERE "stationId" = ${municipio}
            ORDER BY "forecastAt" DESC
            LIMIT 1
          `.then((rows) => rows[0] ?? null),
        ]);
      } else {
        [forecasts, latestRow] = await Promise.all([
          prisma.$queryRaw<WeatherForecastRow[]>`
            SELECT * FROM weather_forecasts
            WHERE province = ${province!}
              AND "validAt" >= ${fromDate}
              AND "validAt" <= ${toDate}
            ORDER BY "stationId" ASC, "validAt" ASC
            LIMIT ${MAX_ROWS}
          `,
          prisma.$queryRaw<LatestRow[]>`
            SELECT "forecastAt" FROM weather_forecasts
            WHERE province = ${province!}
            ORDER BY "forecastAt" DESC
            LIMIT 1
          `.then((rows) => rows[0] ?? null),
        ]);
      }

      return {
        data: forecasts.map((f) => ({
          id: f.id,
          stationId: f.stationId,
          municipioCode: f.municipioCode,
          province: f.province,
          forecastAt: f.forecastAt instanceof Date ? f.forecastAt.toISOString() : String(f.forecastAt),
          validAt: f.validAt instanceof Date ? f.validAt.toISOString() : String(f.validAt),
          horizonHours: f.horizonHours,
          temperature: {
            min: f.tempMin !== null ? Number(f.tempMin) : null,
            max: f.tempMax !== null ? Number(f.tempMax) : null,
            feel: f.tempFeel !== null ? Number(f.tempFeel) : null,
          },
          precipitation: {
            probabilityPct: f.precipProb !== null ? Number(f.precipProb) : null,
            mm: f.precipMm !== null ? Number(f.precipMm) : null,
          },
          wind: {
            speedKmh: f.windSpeed !== null ? Number(f.windSpeed) : null,
            directionDeg: f.windDirDeg !== null ? Number(f.windDirDeg) : null,
            gustKmh: f.windGust !== null ? Number(f.windGust) : null,
          },
          sky: {
            state: f.skyState,
            label: f.skyLabel,
          },
          humidityPct: f.humidityPct !== null ? Number(f.humidityPct) : null,
          uvIndex: f.uvIndex !== null ? Number(f.uvIndex) : null,
        })),
        meta: {
          total: forecasts.length,
          municipio: municipio ?? null,
          province: province ?? null,
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
          latestForecastAt: latestRow?.forecastAt instanceof Date
            ? latestRow.forecastAt.toISOString()
            : latestRow?.forecastAt
              ? String(latestRow.forecastAt)
              : null,
          cachedAt: new Date().toISOString(),
          source: "AEMET OpenData",
        },
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    reportApiError(error, "meteo/forecast API error", request);
    return NextResponse.json(
      { error: "Failed to fetch weather forecast" },
      { status: 500 }
    );
  }
}
