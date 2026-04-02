import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { applyRateLimit } from "@/lib/api-utils";
import { getOrCompute } from "@/lib/redis";

export const dynamic = "force-dynamic";

/**
 * GET /api/accidentes/microdata
 *
 * Per-accident microdata from DGT annual files (2019-2023).
 *
 * Query Parameters:
 *   - province: INE 2-digit code (e.g. "28" for Madrid)
 *   - road: Road number filter (partial match, e.g. "A-1")
 *   - year: Filter by year (e.g. "2022")
 *   - severity: "fatal" | "hospitalized" | "minor"
 *   - weather: Weather condition filter (e.g. "rain", "fog")
 *   - from: Start date ISO string (e.g. "2022-01-01")
 *   - to: End date ISO string (e.g. "2022-12-31")
 *   - limit: Max records returned (default 100, max 1000)
 *   - offset: Pagination offset (default 0)
 *
 * Response:
 *   { data: AccidentMicrodata[], total: number, limit: number, offset: number }
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);

    const province = searchParams.get("province");
    const road = searchParams.get("road");
    const yearParam = searchParams.get("year");
    const severity = searchParams.get("severity");
    const weather = searchParams.get("weather");
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");

    // Pagination bounds
    const limit = Math.min(Math.max(parseInt(limitParam || "100", 10), 1), 1000);
    const offset = Math.max(parseInt(offsetParam || "0", 10), 0);

    // Build Prisma where clause
    const where: Prisma.AccidentMicrodataWhereInput = {};

    if (province) where.province = province;

    if (road) {
      where.roadNumber = {
        contains: road.toUpperCase(),
        mode: "insensitive",
      };
    }

    if (yearParam) {
      const y = parseInt(yearParam, 10);
      if (!isNaN(y)) where.year = y;
    }

    if (severity && ["fatal", "hospitalized", "minor"].includes(severity)) {
      where.severity = severity;
    }

    if (weather) {
      where.weatherCondition = {
        contains: weather.toLowerCase(),
        mode: "insensitive",
      };
    }

    if (fromParam || toParam) {
      where.date = {};
      if (fromParam) {
        const from = new Date(fromParam);
        if (!isNaN(from.getTime())) where.date.gte = from;
      }
      if (toParam) {
        const to = new Date(toParam);
        if (!isNaN(to.getTime())) where.date.lte = to;
      }
    }

    // Build cache key from all filter params
    const cacheKey = `accidents:microdata:${JSON.stringify({ province, road, yearParam, severity, weather, fromParam, toParam, limit, offset })}`;

    const result = await getOrCompute(cacheKey, 3600, async () => {
      const [total, data] = await Promise.all([
        prisma.accidentMicrodata.count({ where }),
        prisma.accidentMicrodata.findMany({
          where,
          orderBy: [{ date: "desc" }, { id: "asc" }],
          take: limit,
          skip: offset,
          select: {
            id: true,
            sourceId: true,
            year: true,
            date: true,
            hour: true,
            dayOfWeek: true,
            roadNumber: true,
            roadType: true,
            km: true,
            province: true,
            provinceName: true,
            municipality: true,
            isUrban: true,
            severity: true,
            fatalities: true,
            hospitalized: true,
            minorInjury: true,
            vehiclesInvolved: true,
            weatherCondition: true,
            lightCondition: true,
            roadSurface: true,
            causeDescription: true,
            involvesCar: true,
            involvesMotorcycle: true,
            involvesTruck: true,
            involvesBus: true,
            involvesBicycle: true,
            involvesPedestrian: true,
          },
        }),
      ]);

      return { data, total, limit, offset };
    });

    return NextResponse.json(result);
  } catch (err) {
    reportApiError(err, "GET /api/accidentes/microdata", request);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
