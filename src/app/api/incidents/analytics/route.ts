import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFromCache, setInCache } from "@/lib/redis";

export const dynamic = "force-dynamic";

const CACHE_KEY_PREFIX = "api:incidents:analytics";
const CACHE_TTL = 300; // 5 minutes

const VALID_PERIODS = [7, 30, 90] as const;
type Period = (typeof VALID_PERIODS)[number];

const DAY_NAMES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

const TYPE_LABELS: Record<string, string> = {
  ACCIDENT: "Accidentes",
  ROADWORK: "Obras",
  CONGESTION: "Congestión",
  HAZARD: "Peligros",
  VEHICLE_BREAKDOWN: "Averías",
  WEATHER: "Meteorológicos",
  EVENT: "Eventos",
  CLOSURE: "Cortes",
  OTHER: "Otros",
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const rawDays = parseInt(searchParams.get("days") || "30", 10);
    const days: Period = (VALID_PERIODS.includes(rawDays as Period)
      ? rawDays
      : 30) as Period;

    const cacheKey = `${CACHE_KEY_PREFIX}:${days}d`;
    const cached = await getFromCache(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const intervalExpr = `${days} days`;

    // Raw SQL for hourly breakdown — only way to use EXTRACT with Prisma
    const hourlyRaw = await prisma.$queryRaw<
      Array<{ hour: number; count: bigint }>
    >`
      SELECT EXTRACT(HOUR FROM "startedAt")::int AS hour,
             COUNT(*)::bigint AS count
      FROM "TrafficIncident"
      WHERE "startedAt" > NOW() - INTERVAL ${intervalExpr}
      GROUP BY hour
      ORDER BY hour
    `;

    // Fill all 24 hours (some may have 0 incidents)
    const hourlyMap = new Map<number, number>(
      hourlyRaw.map((r) => [r.hour, Number(r.count)])
    );
    const incidentsByHour = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      count: hourlyMap.get(h) ?? 0,
    }));

    // Raw SQL for day-of-week breakdown
    const dailyRaw = await prisma.$queryRaw<
      Array<{ dow: number; count: bigint }>
    >`
      SELECT EXTRACT(DOW FROM "startedAt")::int AS dow,
             COUNT(*)::bigint AS count
      FROM "TrafficIncident"
      WHERE "startedAt" > NOW() - INTERVAL ${intervalExpr}
      GROUP BY dow
      ORDER BY dow
    `;

    const dowMap = new Map<number, number>(
      dailyRaw.map((r) => [r.dow, Number(r.count)])
    );
    // Return Mon-Sun order (1-6, 0) for Spanish convention
    const incidentsByDay = [1, 2, 3, 4, 5, 6, 0].map((dow) => ({
      day: DAY_NAMES[dow],
      count: dowMap.get(dow) ?? 0,
    }));

    // Parallel Prisma groupBy queries
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [topRoadsRaw, topProvincesRaw, byTypeRaw, totalActive, totalHistoric] =
      await Promise.all([
        // Top 15 roads
        prisma.trafficIncident.groupBy({
          by: ["roadNumber"],
          where: {
            startedAt: { gte: startDate },
            roadNumber: { not: null },
          },
          _count: true,
          orderBy: { _count: { roadNumber: "desc" } },
          take: 15,
        }),

        // Top 15 provinces
        prisma.trafficIncident.groupBy({
          by: ["provinceName"],
          where: {
            startedAt: { gte: startDate },
            provinceName: { not: null },
          },
          _count: true,
          orderBy: { _count: { provinceName: "desc" } },
          take: 15,
        }),

        // By incident type
        prisma.trafficIncident.groupBy({
          by: ["type"],
          where: { startedAt: { gte: startDate } },
          _count: true,
          orderBy: { _count: { type: "desc" } },
        }),

        // Currently active
        prisma.trafficIncident.count({ where: { isActive: true } }),

        // Total in selected period
        prisma.trafficIncident.count({
          where: { startedAt: { gte: startDate } },
        }),
      ]);

    const topRoads = topRoadsRaw.map((r) => ({
      road: r.roadNumber ?? "Desconocido",
      count: r._count,
    }));

    const topProvinces = topProvincesRaw.map((r) => ({
      province: r.provinceName ?? "Desconocido",
      count: r._count,
    }));

    const byType = byTypeRaw.map((r) => ({
      type: r.type,
      label: TYPE_LABELS[r.type] ?? r.type,
      count: r._count,
    }));

    const responseData = {
      incidentsByHour,
      incidentsByDay,
      topRoads,
      topProvinces,
      byType,
      totalActive,
      totalHistoric,
      periodDays: days,
      generatedAt: new Date().toISOString(),
    };

    await setInCache(cacheKey, responseData, CACHE_TTL);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("[analytics] Error fetching incident analytics:", error);
    return NextResponse.json(
      { error: "Error al obtener los datos de análisis" },
      { status: 500 }
    );
  }
}
