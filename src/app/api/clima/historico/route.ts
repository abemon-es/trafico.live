import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { getOrCompute } from "@/lib/redis";

/**
 * GET /api/clima/historico
 *
 * Returns daily climate records with optional temporal aggregation.
 *
 * Query Parameters:
 *   - station:  AEMET stationCode (e.g. "3195") — filter to single station
 *   - province: INE 2-digit code (e.g. "28") — filter stations by province
 *   - from:     ISO date "YYYY-MM-DD" (default: 365 days ago)
 *   - to:       ISO date "YYYY-MM-DD" (default: yesterday)
 *   - metric:   "temp" | "precipitation" | "wind" | "all" (default: "all")
 *   - groupBy:  "day" (default) | "week" | "month"
 *               week/month: avg temp, sum precipitation, max wind gust
 *
 * Response:
 *   {
 *     data: [...],
 *     station?: { id, stationCode, name, ... },  // when single station requested
 *     meta: { from, to, metric, groupBy, total }
 *   }
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);

    const stationCode = searchParams.get("station") ?? undefined;
    const province = searchParams.get("province") ?? undefined;
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const metric = searchParams.get("metric") ?? "all";
    const groupBy = searchParams.get("groupBy") ?? "day";

    // Validate metric
    const validMetrics = ["temp", "precipitation", "wind", "all"];
    if (!validMetrics.includes(metric)) {
      return NextResponse.json(
        { error: `Invalid metric. Valid values: ${validMetrics.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate groupBy
    const validGroupBy = ["day", "week", "month"];
    if (!validGroupBy.includes(groupBy)) {
      return NextResponse.json(
        { error: `Invalid groupBy. Valid values: ${validGroupBy.join(", ")}` },
        { status: 400 }
      );
    }

    // Date range defaults: last 365 days
    const now = new Date();
    const defaultFrom = new Date(now);
    defaultFrom.setUTCFullYear(defaultFrom.getUTCFullYear() - 1);
    defaultFrom.setUTCHours(0, 0, 0, 0);

    const defaultTo = new Date(now);
    defaultTo.setUTCDate(defaultTo.getUTCDate() - 1);
    defaultTo.setUTCHours(0, 0, 0, 0);

    const fromDate = fromParam ? new Date(`${fromParam}T00:00:00Z`) : defaultFrom;
    const toDate = toParam ? new Date(`${toParam}T00:00:00Z`) : defaultTo;

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD." },
        { status: 400 }
      );
    }

    if (fromDate > toDate) {
      return NextResponse.json(
        { error: "'from' must be before or equal to 'to'" },
        { status: 400 }
      );
    }

    const cacheKey = [
      "clima:historico",
      stationCode ?? "any",
      province ?? "any",
      fromDate.toISOString().slice(0, 10),
      toDate.toISOString().slice(0, 10),
      metric,
      groupBy,
    ].join(":");

    const result = await getOrCompute(
      cacheKey,
      3600, // 1 hour
      async () => buildResponse(stationCode, province, fromDate, toDate, metric, groupBy)
    );

    return NextResponse.json(result);
  } catch (error) {
    reportApiError(error, "Climate historico API error");
    return NextResponse.json(
      { error: "Failed to fetch climate history" },
      { status: 500 }
    );
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Response builder
// ──────────────────────────────────────────────────────────────────────────────

type Metric = "temp" | "precipitation" | "wind" | "all";
type GroupBy = "day" | "week" | "month";

async function buildResponse(
  stationCode: string | undefined,
  province: string | undefined,
  fromDate: Date,
  toDate: Date,
  metric: string,
  groupBy: string
) {
  const m = metric as Metric;
  const g = groupBy as GroupBy;

  // Resolve station filter
  let stationIds: string[] | undefined;
  let stationDetail: object | undefined;

  if (stationCode) {
    const station = await prisma.climateStation.findUnique({
      where: { stationCode },
    });
    if (!station) {
      return {
        data: [],
        meta: {
          from: fromDate.toISOString().slice(0, 10),
          to: toDate.toISOString().slice(0, 10),
          metric: m,
          groupBy: g,
          total: 0,
        },
        error: `Station '${stationCode}' not found`,
      };
    }
    stationIds = [station.id];
    stationDetail = {
      id: station.id,
      stationCode: station.stationCode,
      name: station.name,
      province: station.province,
      provinceName: station.provinceName,
      latitude: Number(station.latitude),
      longitude: Number(station.longitude),
      altitude: station.altitude,
    };
  } else if (province) {
    const stations = await prisma.climateStation.findMany({
      where: { province, isActive: true },
      select: { id: true },
    });
    stationIds = stations.map((s) => s.id);
    if (stationIds.length === 0) {
      return {
        data: [],
        meta: {
          from: fromDate.toISOString().slice(0, 10),
          to: toDate.toISOString().slice(0, 10),
          metric: m,
          groupBy: g,
          total: 0,
        },
      };
    }
  }

  // Fetch raw daily records
  const where = {
    date: {
      gte: fromDate,
      lte: toDate,
    },
    ...(stationIds ? { stationId: { in: stationIds } } : {}),
  };

  // Always fetch all fields — the formatter filters what's returned in the response.
  // Selecting partial fields per metric creates divergent Prisma types that are
  // hard to unify in TypeScript, and the query cost is negligible on this schema.
  const rawRecords = await prisma.climateRecord.findMany({
    where,
    orderBy: [{ date: "asc" }, { stationId: "asc" }],
  });

  // Group / aggregate
  const data = g === "day"
    ? formatDayRecords(rawRecords, m)
    : aggregateRecords(rawRecords, g, m);

  return {
    data,
    ...(stationDetail ? { station: stationDetail } : {}),
    meta: {
      from: fromDate.toISOString().slice(0, 10),
      to: toDate.toISOString().slice(0, 10),
      metric: m,
      groupBy: g,
      total: data.length,
    },
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Formatters
// ──────────────────────────────────────────────────────────────────────────────

type RawRecord = Awaited<ReturnType<typeof prisma.climateRecord.findMany>>[number];

function formatDayRecords(records: RawRecord[], metric: Metric) {
  return records.map((r) => ({
    date: (r.date as Date).toISOString().slice(0, 10),
    stationId: r.stationId,
    ...(metric === "temp" || metric === "all"
      ? {
          tempMin: r.tempMin !== null && r.tempMin !== undefined ? Number(r.tempMin) : null,
          tempMax: r.tempMax !== null && r.tempMax !== undefined ? Number(r.tempMax) : null,
          tempAvg: r.tempAvg !== null && r.tempAvg !== undefined ? Number(r.tempAvg) : null,
        }
      : {}),
    ...(metric === "precipitation" || metric === "all"
      ? {
          precipitation: r.precipitation !== null && r.precipitation !== undefined ? Number(r.precipitation) : null,
          snowfall: r.snowfall !== null && r.snowfall !== undefined ? Number(r.snowfall) : null,
        }
      : {}),
    ...(metric === "wind" || metric === "all"
      ? {
          windSpeed: r.windSpeed !== null && r.windSpeed !== undefined ? Number(r.windSpeed) : null,
          windGust: r.windGust !== null && r.windGust !== undefined ? Number(r.windGust) : null,
          windDirection: r.windDirection ?? null,
        }
      : {}),
    ...(metric === "all"
      ? {
          sunHours: r.sunHours !== null && r.sunHours !== undefined ? Number(r.sunHours) : null,
          humidity: r.humidity !== null && r.humidity !== undefined ? Number(r.humidity) : null,
          pressure: r.pressure !== null && r.pressure !== undefined ? Number(r.pressure) : null,
        }
      : {}),
  }));
}

/** Get ISO year-week string "YYYY-WNN" for a given date */
function isoWeekKey(date: Date): string {
  // Thursday in current week determines the year (ISO 8601)
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayOfWeek = d.getUTCDay() || 7; // Mon=1 ... Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek); // Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Get "YYYY-MM" month key */
function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

interface AggBucket {
  period: string;
  count: number;
  tempMinValues: number[];
  tempMaxValues: number[];
  tempAvgValues: number[];
  precipitationSum: number;
  snowfallSum: number;
  windSpeedValues: number[];
  windGustMax: number;
  sunHoursSum: number;
  humidityValues: number[];
  pressureValues: number[];
}

function newBucket(period: string): AggBucket {
  return {
    period,
    count: 0,
    tempMinValues: [],
    tempMaxValues: [],
    tempAvgValues: [],
    precipitationSum: 0,
    snowfallSum: 0,
    windSpeedValues: [],
    windGustMax: 0,
    sunHoursSum: 0,
    humidityValues: [],
    pressureValues: [],
  };
}

function avg(arr: number[]): number | null {
  if (arr.length === 0) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function roundOrNull(n: number | null, decimals = 1): number | null {
  if (n === null) return null;
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}

function aggregateRecords(records: RawRecord[], groupBy: "week" | "month", metric: Metric) {
  const buckets = new Map<string, AggBucket>();

  for (const r of records) {
    const date = r.date as Date;
    const key = groupBy === "week" ? isoWeekKey(date) : monthKey(date);

    if (!buckets.has(key)) buckets.set(key, newBucket(key));
    const b = buckets.get(key)!;
    b.count++;

    if (metric === "temp" || metric === "all") {
      if (r.tempMin !== null && r.tempMin !== undefined) b.tempMinValues.push(Number(r.tempMin));
      if (r.tempMax !== null && r.tempMax !== undefined) b.tempMaxValues.push(Number(r.tempMax));
      if (r.tempAvg !== null && r.tempAvg !== undefined) b.tempAvgValues.push(Number(r.tempAvg));
    }
    if (metric === "precipitation" || metric === "all") {
      if (r.precipitation !== null && r.precipitation !== undefined) b.precipitationSum += Number(r.precipitation);
      if (r.snowfall !== null && r.snowfall !== undefined) b.snowfallSum += Number(r.snowfall);
    }
    if (metric === "wind" || metric === "all") {
      if (r.windSpeed !== null && r.windSpeed !== undefined) b.windSpeedValues.push(Number(r.windSpeed));
      const gust = r.windGust !== null && r.windGust !== undefined ? Number(r.windGust) : 0;
      if (gust > b.windGustMax) b.windGustMax = gust;
    }
    if (metric === "all") {
      if (r.sunHours !== null && r.sunHours !== undefined) b.sunHoursSum += Number(r.sunHours);
      if (r.humidity !== null && r.humidity !== undefined) b.humidityValues.push(Number(r.humidity));
      if (r.pressure !== null && r.pressure !== undefined) b.pressureValues.push(Number(r.pressure));
    }
  }

  return Array.from(buckets.values())
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((b) => ({
      period: b.period,
      daysIncluded: b.count,
      ...(metric === "temp" || metric === "all"
        ? {
            tempMinAvg: roundOrNull(avg(b.tempMinValues)),
            tempMaxAvg: roundOrNull(avg(b.tempMaxValues)),
            tempAvg: roundOrNull(avg(b.tempAvgValues)),
          }
        : {}),
      ...(metric === "precipitation" || metric === "all"
        ? {
            precipitationSum: roundOrNull(b.precipitationSum),
            snowfallSum: roundOrNull(b.snowfallSum),
          }
        : {}),
      ...(metric === "wind" || metric === "all"
        ? {
            windSpeedAvg: roundOrNull(avg(b.windSpeedValues)),
            windGustMax: roundOrNull(b.windGustMax > 0 ? b.windGustMax : null),
          }
        : {}),
      ...(metric === "all"
        ? {
            sunHoursSum: roundOrNull(b.sunHoursSum),
            humidityAvg: roundOrNull(avg(b.humidityValues), 0),
            pressureAvg: roundOrNull(avg(b.pressureValues)),
          }
        : {}),
    }));
}
