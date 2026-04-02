import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { getFromCache, setInCache } from "@/lib/redis";

// Cache the response for 60 seconds
export const revalidate = 60;

interface Stats {
  v16Active: number;
  v16Change: number | null;
  incidents: number;
  incidentsChange: number | null;
  cameras: number;
  chargers: number;
  zbeZones: number;
  lastUpdated: string;
  source: string;
  bySeverity: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    VERY_HIGH: number;
  };
  byRoadType: Record<string, number>;
  bySource: Record<string, number>;
  byIncidentType: Record<string, number>;
  historical?: {
    years: number[];
    totalAccidents: Record<number, number>;
    totalFatalities: Record<number, number>;
    trend: "up" | "down" | "stable";
  };
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Check Redis cache first — this endpoint runs 13 parallel DB queries
    const cacheKey = "api:stats:all";
    const cached = await getFromCache<Stats>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } });
    }

    // Query current counts from database in parallel
    const [
      v16Count,
      incidentCount,
      v16BySeverity,
      v16ByRoadType,
      incidentsByType,
      incidentsBySource,
      previousHourStats,
      historicalByYear,
      chargerCount,
      cameraCount,
      zbeCount,
    ] = await Promise.all([
      // Active V16 beacons count
      prisma.v16BeaconEvent.count({ where: { isActive: true } }),

      // Active incidents count
      prisma.trafficIncident.count({ where: { isActive: true } }),

      // V16 by severity
      prisma.v16BeaconEvent.groupBy({
        by: ["severity"],
        where: { isActive: true },
        _count: true,
      }),

      // V16 by road type
      prisma.v16BeaconEvent.groupBy({
        by: ["roadType"],
        where: { isActive: true },
        _count: true,
      }),

      // Incidents by type
      prisma.trafficIncident.groupBy({
        by: ["type"],
        where: { isActive: true },
        _count: true,
      }),

      // Incidents by source
      prisma.trafficIncident.groupBy({
        by: ["source"],
        where: { isActive: true },
        _count: true,
      }),

      // Previous hour stats for comparison
      prisma.hourlyStats.findFirst({
        where: {
          hourStart: {
            lt: new Date(new Date().setMinutes(0, 0, 0)),
          },
        },
        orderBy: { hourStart: "desc" },
      }),

      // Historical accident data by year
      prisma.historicalAccidents.groupBy({
        by: ["year"],
        _sum: {
          accidents: true,
          fatalities: true,
        },
      }),

      // EV charger count from database (populated by charger-collector)
      prisma.eVCharger.count(),

      // Camera count from database (populated by camera-collector)
      prisma.camera.count(),

      // ZBE zone count from database (populated by zbe-collector)
      prisma.zBEZone.count(),
    ]);

    // Build severity breakdown
    const bySeverity = { LOW: 0, MEDIUM: 0, HIGH: 0, VERY_HIGH: 0 };
    for (const item of v16BySeverity) {
      const sev = item.severity as keyof typeof bySeverity;
      if (sev in bySeverity) {
        bySeverity[sev] = item._count;
      }
    }

    // Build road type breakdown (with readable names)
    const roadTypeLabels: Record<string, string> = {
      AUTOPISTA: "Autopista",
      AUTOVIA: "Autovía",
      NACIONAL: "Nacional",
      COMARCAL: "Comarcal",
      PROVINCIAL: "Provincial",
      OTHER: "Otras",
    };
    const byRoadType: Record<string, number> = {};
    for (const item of v16ByRoadType) {
      const label = item.roadType ? (roadTypeLabels[item.roadType] || item.roadType) : "Otras";
      byRoadType[label] = (byRoadType[label] || 0) + item._count;
    }

    // Build incident type breakdown
    const byIncidentType: Record<string, number> = {};
    for (const item of incidentsByType) {
      byIncidentType[item.type] = item._count;
    }

    // Build source breakdown
    const bySource: Record<string, number> = {};
    for (const item of incidentsBySource) {
      if (item.source) {
        bySource[item.source] = item._count;
      }
    }

    // Calculate changes from previous hour
    const v16Change = previousHourStats
      ? v16Count - previousHourStats.v16Count
      : null;
    const incidentsChange = previousHourStats
      ? incidentCount - previousHourStats.incidentCount
      : null;

    // Build historical data
    const totalAccidents: Record<number, number> = {};
    const totalFatalities: Record<number, number> = {};
    const years: number[] = [];

    for (const item of historicalByYear) {
      years.push(item.year);
      totalAccidents[item.year] = item._sum.accidents || 0;
      totalFatalities[item.year] = item._sum.fatalities || 0;
    }
    years.sort();

    // Calculate trend (compare last two years)
    let trend: "up" | "down" | "stable" = "stable";
    if (years.length >= 2) {
      const lastYear = years[years.length - 1];
      const prevYear = years[years.length - 2];
      const change = (totalAccidents[lastYear] - totalAccidents[prevYear]) / totalAccidents[prevYear];
      if (change > 0.02) trend = "up";
      else if (change < -0.02) trend = "down";
    }

    const historical = years.length > 0
      ? { years, totalAccidents, totalFatalities, trend }
      : undefined;

    // Get most recent fetch time
    const [latestV16, latestIncident] = await Promise.all([
      prisma.v16BeaconEvent.findFirst({
        where: { isActive: true },
        orderBy: { fetchedAt: "desc" },
        select: { fetchedAt: true },
      }),
      prisma.trafficIncident.findFirst({
        where: { isActive: true },
        orderBy: { fetchedAt: "desc" },
        select: { fetchedAt: true },
      }),
    ]);

    const lastUpdated = [latestV16?.fetchedAt, latestIncident?.fetchedAt]
      .filter(Boolean)
      .sort((a, b) => (b as Date).getTime() - (a as Date).getTime())[0]
      || new Date();

    const stats: Stats = {
      v16Active: v16Count,
      v16Change,
      incidents: incidentCount,
      incidentsChange,
      cameras: cameraCount,
      chargers: chargerCount,
      zbeZones: zbeCount,
      lastUpdated: lastUpdated.toISOString(),
      source: "database",
      bySeverity,
      byRoadType,
      bySource,
      byIncidentType,
      historical,
    };

    // Cache for 60s — saves 13 DB queries per request
    await setInCache(cacheKey, stats, 60);

    return NextResponse.json(stats, { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } });
  } catch (error) {
    reportApiError(error, "Error fetching stats from database");
    return NextResponse.json(
      {
        error: "Internal server error",
        isError: true,
        v16Active: 0,
        incidents: 0,
        cameras: 0,
        chargers: 0,
        zbeZones: 0,
        lastUpdated: new Date().toISOString(),
        source: "error",
        bySeverity: { LOW: 0, MEDIUM: 0, HIGH: 0, VERY_HIGH: 0 },
        byRoadType: {},
        bySource: {},
        byIncidentType: {},
      },
      { status: 500 }
    );
  }
}
