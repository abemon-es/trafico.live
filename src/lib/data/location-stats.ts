// LocationStats CRUD — read and refresh cached aggregate stats per geo scope.
//
// LocationStats stores pre-computed counts for all data types in a given
// geographic scope (community, province, or municipality). This avoids
// expensive COUNT(*) queries on every page load.
//
// Usage:
//   const stats = await getLocationStats("province", "28");
//   await refreshLocationStats("province", "28", "Madrid");

import { prisma } from "../db";
import { getOrCompute, invalidateCache } from "../redis";
import type { Prisma } from "@prisma/client";

// Cache TTL for stats (5 minutes — allows quick invalidation after refresh)
const STATS_TTL = 300;

// -----------------------------------------------------------------------
// Read
// -----------------------------------------------------------------------

export async function getLocationStats(
  scopeType: string,
  scopeCode: string
) {
  return getOrCompute(
    `loc:stats:${scopeType}:${scopeCode}`,
    STATS_TTL,
    async () => {
      return prisma.locationStats.findUnique({
        where: { scopeType_scopeCode: { scopeType, scopeCode } },
      });
    }
  );
}

// -----------------------------------------------------------------------
// Refresh — recompute all counts and upsert into LocationStats
// -----------------------------------------------------------------------

export async function refreshLocationStats(
  scopeType: string,
  scopeCode: string,
  scopeName: string
): Promise<Prisma.LocationStatsGetPayload<object>> {
  // Build province/community where clauses.
  // For municipality: use provinceCode extracted from the first 2 digits of INE code.
  const provinceWhere =
    scopeType === "province"
      ? { province: scopeCode }
      : scopeType === "municipality"
        ? { province: scopeCode.slice(0, 2) }
        : {}; // community — no direct province field on most models

  const communityWhere =
    scopeType === "community" ? { communityCode: scopeCode } : {};

  const gasStationWhere: Prisma.GasStationWhereInput =
    scopeType === "community"
      ? { communityCode: scopeCode }
      : scopeType === "province"
        ? { province: scopeCode }
        : { municipalityCode: scopeCode }; // municipality

  const municipalityWhere =
    scopeType === "municipality" ? { municipalityCode: scopeCode } : {};

  // Run all counts concurrently
  const [
    cameras,
    radars,
    gasStations,
    evChargers,
    speedLimits,
    trafficStations,
    trafficFlows,
    riskZones,
    panels,
    zbeZones,
    articles,
    activeIncidents,
    activeV16,
    activeWeather,
    roads,
    accidentSummary,
    imdSummary,
    fuelPrices,
  ] = await Promise.all([
    // Infrastructure counts
    prisma.camera.count({ where: provinceWhere }),
    prisma.radar.count({ where: provinceWhere }),
    prisma.gasStation.count({ where: gasStationWhere }),
    prisma.eVCharger.count({ where: provinceWhere }),
    prisma.speedLimit.count({
      where:
        scopeType === "municipality"
          ? { ...municipalityWhere }
          : provinceWhere,
    }),
    prisma.trafficStation.count({ where: provinceWhere }),
    prisma.trafficFlow.count({ where: provinceWhere }),
    prisma.roadRiskZone.count({
      where: { ...provinceWhere, isActive: true },
    }),
    prisma.variablePanel.count({
      where: { ...provinceWhere, isActive: true },
    }),
    prisma.zBEZone.count({ where: {} }), // ZBEZone has no province — count all
    prisma.article.count({
      where: { ...provinceWhere, status: "PUBLISHED" },
    }),

    // Real-time counts
    prisma.trafficIncident.count({
      where: { ...provinceWhere, isActive: true },
    }),
    prisma.v16BeaconEvent.count({
      where: { ...provinceWhere, isActive: true },
    }),
    prisma.weatherAlert.count({
      where: {
        ...(scopeType !== "community" ? { province: scopeCode.slice(0, 2) || scopeCode } : {}),
        isActive: true,
      },
    }),

    // Road count
    scopeType === "province"
      ? prisma.road.count({ where: { provinces: { has: scopeCode } } })
      : Promise.resolve(0),

    // Latest accident year for this scope
    scopeType !== "community"
      ? prisma.historicalAccidents.aggregate({
          where: { province: scopeType === "province" ? scopeCode : scopeCode.slice(0, 2) },
          _max: { year: true },
        })
      : Promise.resolve({ _max: { year: null } }),

    // IMD averages
    scopeType !== "community"
      ? prisma.trafficFlow.aggregate({
          where: provinceWhere,
          _avg: { imd: true },
          _max: { imd: true },
        })
      : Promise.resolve({ _avg: { imd: null }, _max: { imd: null } }),

    // Fuel price aggregates
    prisma.gasStation.aggregate({
      where: gasStationWhere,
      _avg: {
        priceGasoleoA: true,
        priceGasolina95E5: true,
      },
      _min: {
        priceGasoleoA: true,
        priceGasolina95E5: true,
      },
    }),
  ]);

  // Get accident counts for the latest year
  let accidentsLatestYear: number | null = null;
  let fatalitiesLatestYear: number | null = null;
  const latestYear = (accidentSummary as { _max: { year: number | null } })._max.year;

  if (latestYear) {
    const accidentData = await prisma.historicalAccidents.aggregate({
      where: {
        province: scopeType === "province" ? scopeCode : scopeCode.slice(0, 2),
        year: latestYear,
      },
      _sum: {
        accidents: true,
        fatalities: true,
      },
    });
    accidentsLatestYear = accidentData._sum.accidents ?? null;
    fatalitiesLatestYear = accidentData._sum.fatalities ?? null;
  }

  const imdData = imdSummary as {
    _avg: { imd: number | null };
    _max: { imd: number | null };
  };
  const fuelData = fuelPrices as {
    _avg: {
      priceGasoleoA: import("@prisma/client").Prisma.Decimal | null;
      priceGasolina95E5: import("@prisma/client").Prisma.Decimal | null;
    };
    _min: {
      priceGasoleoA: import("@prisma/client").Prisma.Decimal | null;
      priceGasolina95E5: import("@prisma/client").Prisma.Decimal | null;
    };
  };

  const now = new Date();

  const data: Prisma.LocationStatsUncheckedCreateInput = {
    scopeType,
    scopeCode,
    scopeName,
    // Static infrastructure
    cameraCount: cameras,
    radarCount: radars,
    gasStationCount: gasStations,
    evChargerCount: evChargers,
    speedLimitCount: speedLimits,
    trafficStationCount: trafficStations,
    trafficFlowCount: trafficFlows,
    roadCount: roads,
    riskZoneCount: riskZones,
    panelCount: panels,
    zbeCount: zbeZones,
    articleCount: articles,
    // Real-time
    activeIncidentCount: activeIncidents,
    activeV16Count: activeV16,
    activeWeatherAlerts: activeWeather,
    // Fuel prices
    avgDieselPrice: fuelData._avg.priceGasoleoA ?? undefined,
    avgGasoline95Price: fuelData._avg.priceGasolina95E5 ?? undefined,
    minDieselPrice: fuelData._min.priceGasoleoA ?? undefined,
    minGasoline95Price: fuelData._min.priceGasolina95E5 ?? undefined,
    // Accidents
    accidentsLatestYear,
    fatalitiesLatestYear,
    accidentYear: latestYear ?? undefined,
    // IMD
    avgIMD: imdData._avg.imd != null ? Math.round(imdData._avg.imd) : undefined,
    maxIMD: imdData._max.imd ?? undefined,
    // Freshness
    staticUpdatedAt: now,
    realtimeUpdatedAt: now,
    pricesUpdatedAt: fuelData._avg.priceGasoleoA != null ? now : undefined,
  };

  const result = await prisma.locationStats.upsert({
    where: { scopeType_scopeCode: { scopeType, scopeCode } },
    create: data,
    update: {
      ...data,
      // Keep createdAt unchanged on updates — only update freshness markers
      createdAt: undefined,
    },
  });

  // Invalidate cached stats so next read picks up fresh data
  await invalidateCache(`loc:stats:${scopeType}:${scopeCode}`);

  return result;
}

// -----------------------------------------------------------------------
// Bulk refresh helper — refresh all scopes of a given type
// -----------------------------------------------------------------------

export async function refreshAllLocationStats(
  scopeType: "province" | "community"
): Promise<void> {
  const scopes =
    scopeType === "province"
      ? await prisma.province.findMany({ select: { code: true, name: true } })
      : await prisma.community.findMany({ select: { code: true, name: true } });

  // Refresh sequentially to avoid overwhelming the DB
  for (const scope of scopes) {
    try {
      await refreshLocationStats(scopeType, scope.code, scope.name);
    } catch (err) {
      console.error(
        `[LocationStats] Failed to refresh ${scopeType}:${scope.code}`,
        err
      );
    }
  }
}
