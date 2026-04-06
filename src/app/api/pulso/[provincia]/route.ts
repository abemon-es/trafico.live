/**
 * GET /api/pulso/[provincia]
 *
 * Real-time province pulse data: incidents, weather alerts, air quality,
 * fuel prices, railway alerts, and roadworks.
 *
 * Auth: same-origin + x-api-key. Rate limited. Redis-cached 60s.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";
import { applyRateLimit } from "@/lib/api-utils";
import { getOrCompute } from "@/lib/redis";
import { reportApiError } from "@/lib/api-error";
import { PROVINCES, PROVINCE_NAMES } from "@/lib/geo/ine-codes";
import { slugify } from "@/lib/geo/slugify";

const CACHE_TTL = 60; // 60 seconds — real-time dashboard

/** Resolve province slug → INE code */
function resolveProvince(slug: string): { code: string; name: string } | null {
  for (const p of PROVINCES) {
    if (slugify(p.name) === slug) {
      return { code: p.code, name: PROVINCE_NAMES[p.code] || p.name };
    }
  }
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provincia: string }> }
) {
  const authResponse = authenticateRequest(request);
  if (authResponse) return authResponse;

  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  const { provincia } = await params;
  const province = resolveProvince(provincia);

  if (!province) {
    return NextResponse.json(
      { error: "Provincia no encontrada" },
      { status: 404 }
    );
  }

  try {
    const cacheKey = `api:pulso:${province.code}`;
    const data = await getOrCompute(cacheKey, CACHE_TTL, () =>
      fetchProvinceData(province.code, province.name)
    );

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    reportApiError(error, "api/pulso", request);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

async function fetchProvinceData(code: string, name: string) {
  const now = new Date();

  const [
    incidents,
    incidentsBySeverity,
    weatherAlerts,
    airQualityStations,
    fuelPrice,
    fuelPriceYesterday,
    fuelNational,
    railwayAlerts,
    roadworks,
  ] = await Promise.all([
    // Active incidents (top 10 by severity)
    prisma.trafficIncident.findMany({
      where: { province: code, isActive: true },
      orderBy: [{ severity: "desc" }, { startedAt: "desc" }],
      take: 10,
      select: {
        id: true,
        roadNumber: true,
        description: true,
        severity: true,
        type: true,
        startedAt: true,
        latitude: true,
        longitude: true,
      },
    }),

    // Incident count by severity
    prisma.trafficIncident.groupBy({
      by: ["severity"],
      where: { province: code, isActive: true },
      _count: { _all: true },
    }),

    // Active weather alerts
    prisma.weatherAlert.findMany({
      where: { province: code, isActive: true },
      orderBy: { severity: "desc" },
      select: {
        id: true,
        type: true,
        severity: true,
        description: true,
        startedAt: true,
        endedAt: true,
      },
    }),

    // Air quality stations with latest reading
    prisma.airQualityStation.findMany({
      where: { province: code },
      include: {
        readings: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),

    // Latest fuel price for this province
    prisma.cNMCFuelPrice.findFirst({
      where: { province: code },
      orderBy: { date: "desc" },
      select: {
        date: true,
        priceGasoleoA: true,
        priceGasolina95: true,
      },
    }),

    // Yesterday's fuel price for trend
    prisma.cNMCFuelPrice.findFirst({
      where: {
        province: code,
        date: {
          lt: new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          ),
        },
      },
      orderBy: { date: "desc" },
      select: {
        priceGasoleoA: true,
        priceGasolina95: true,
      },
    }),

    // National average fuel price (latest date across all provinces)
    prisma.cNMCFuelPrice
      .aggregate({
        where: {
          date: {
            gte: new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate() - 3
            ),
          },
        },
        _avg: {
          priceGasoleoA: true,
          priceGasolina95: true,
        },
      }),

    // Active railway alerts (national — no province filter on this model)
    prisma.railwayAlert.findMany({
      where: { isActive: true },
      orderBy: { activePeriodStart: "desc" },
      take: 5,
      select: {
        id: true,
        headerText: true,
        description: true,
        effect: true,
        routeIds: true,
        activePeriodStart: true,
      },
    }),

    // Active roadworks in this province
    prisma.roadworksZone.findMany({
      where: { province: code, isActive: true },
      orderBy: { startDate: "desc" },
      take: 5,
      select: {
        id: true,
        roadNumber: true,
        description: true,
        kmStart: true,
        kmEnd: true,
        startDate: true,
        endDate: true,
      },
    }),
  ]);

  // Compute aggregate ICA
  const readings = airQualityStations
    .map((s) => s.readings[0])
    .filter(Boolean);
  const icaValues = readings
    .map((r) => r?.ica)
    .filter((v): v is number => v != null);
  const avgIca = icaValues.length > 0
    ? Math.round(icaValues.reduce((a, b) => a + b, 0) / icaValues.length)
    : null;
  const maxIca = icaValues.length > 0 ? Math.max(...icaValues) : null;

  // Severity counts map
  const severityCounts: Record<string, number> = {};
  for (const g of incidentsBySeverity) {
    severityCounts[g.severity] = g._count._all;
  }
  const totalIncidents = Object.values(severityCounts).reduce((a, b) => a + b, 0);

  // Avg pollutants
  const avgNo2 = readings.length > 0
    ? readings.reduce((s, r) => s + (r?.no2 ?? 0), 0) / readings.length
    : null;
  const avgPm10 = readings.length > 0
    ? readings.reduce((s, r) => s + (r?.pm10 ?? 0), 0) / readings.length
    : null;
  const avgPm25 = readings.length > 0
    ? readings.reduce((s, r) => s + (r?.pm25 ?? 0), 0) / readings.length
    : null;

  return {
    province: { code, name },
    updatedAt: now.toISOString(),
    incidents: {
      total: totalIncidents,
      bySeverity: severityCounts,
      items: incidents.map((i) => ({
        id: i.id,
        road: i.roadNumber,
        description: i.description,
        severity: i.severity,
        type: i.type,
        startedAt: i.startedAt.toISOString(),
      })),
    },
    weather: {
      total: weatherAlerts.length,
      items: weatherAlerts.map((a) => ({
        id: a.id,
        type: a.type,
        severity: a.severity,
        description: a.description,
        startedAt: a.startedAt.toISOString(),
        endedAt: a.endedAt?.toISOString() ?? null,
      })),
    },
    airQuality: {
      stationCount: airQualityStations.length,
      avgIca,
      maxIca,
      avgNo2: avgNo2 != null ? Math.round(avgNo2 * 10) / 10 : null,
      avgPm10: avgPm10 != null ? Math.round(avgPm10 * 10) / 10 : null,
      avgPm25: avgPm25 != null ? Math.round(avgPm25 * 10) / 10 : null,
      stations: readings.map((r) => ({
        ica: r?.ica,
        no2: r?.no2,
        pm10: r?.pm10,
        pm25: r?.pm25,
        o3: r?.o3,
      })),
    },
    fuel: {
      date: fuelPrice?.date ?? null,
      gasoleoA: fuelPrice?.priceGasoleoA
        ? Number(fuelPrice.priceGasoleoA)
        : null,
      gasolina95: fuelPrice?.priceGasolina95
        ? Number(fuelPrice.priceGasolina95)
        : null,
      yesterdayGasoleoA: fuelPriceYesterday?.priceGasoleoA
        ? Number(fuelPriceYesterday.priceGasoleoA)
        : null,
      yesterdayGasolina95: fuelPriceYesterday?.priceGasolina95
        ? Number(fuelPriceYesterday.priceGasolina95)
        : null,
      nationalAvgGasoleoA: fuelNational._avg.priceGasoleoA
        ? Number(fuelNational._avg.priceGasoleoA)
        : null,
      nationalAvgGasolina95: fuelNational._avg.priceGasolina95
        ? Number(fuelNational._avg.priceGasolina95)
        : null,
    },
    railway: {
      totalAlerts: railwayAlerts.length,
      items: railwayAlerts.map((a) => ({
        id: a.id,
        header: a.headerText,
        description: a.description,
        effect: a.effect,
        routeIds: a.routeIds,
        start: a.activePeriodStart.toISOString(),
      })),
    },
    roadworks: {
      total: roadworks.length,
      items: roadworks.map((r) => ({
        id: r.id,
        road: r.roadNumber,
        description: r.description,
        kmStart: r.kmStart ? Number(r.kmStart) : null,
        kmEnd: r.kmEnd ? Number(r.kmEnd) : null,
        startDate: r.startDate?.toISOString() ?? null,
        endDate: r.endDate?.toISOString() ?? null,
      })),
    },
  };
}
