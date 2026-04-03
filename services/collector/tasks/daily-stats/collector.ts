/**
 * Daily Stats Aggregation Collector
 *
 * Runs once daily (after midnight) to enrich the DailyStats row for
 * yesterday with platform-wide counts, national fuel price averages,
 * and incident breakdowns by cause and severity.
 *
 * The V16 aggregator already populates v16Total / incidentTotal earlier
 * in the day — this collector merges additional fields without
 * overwriting existing data.
 */

import { PrismaClient } from "@prisma/client";

export async function run(prisma: PrismaClient): Promise<void> {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const todayStart = new Date(yesterday);
  todayStart.setDate(todayStart.getDate() + 1);

  console.log(`[daily-stats] Aggregating stats for ${yesterday.toISOString().slice(0, 10)}`);

  // ---------------------------------------------------------------
  // 1. Platform-wide entity counts (current snapshot)
  // ---------------------------------------------------------------
  const [cameraCount, radarCount, gasStationCount, chargerCount, detectorCount] =
    await Promise.all([
      prisma.camera.count(),
      prisma.radar.count(),
      prisma.gasStation.count(),
      prisma.eVCharger.count(),
      prisma.trafficDetector.count(),
    ]);

  console.log(
    `[daily-stats] Counts — cameras: ${cameraCount}, radars: ${radarCount}, ` +
    `gas stations: ${gasStationCount}, chargers: ${chargerCount}, detectors: ${detectorCount}`
  );

  // ---------------------------------------------------------------
  // 2. National average fuel prices from FuelPriceDailyStats
  // ---------------------------------------------------------------
  const fuelStats = await prisma.fuelPriceDailyStats.findUnique({
    where: { date_scope: { date: yesterday, scope: "national" } },
  });

  const avgGasoleoA = fuelStats?.avgGasoleoA ?? null;
  const avgGasolina95 = fuelStats?.avgGasolina95 ?? null;
  const avgGasolina98 = fuelStats?.avgGasolina98 ?? null;

  if (fuelStats) {
    console.log(
      `[daily-stats] Fuel prices — gasoleoA: ${avgGasoleoA}, gasolina95: ${avgGasolina95}, gasolina98: ${avgGasolina98}`
    );
  } else {
    console.log(`[daily-stats] No national fuel stats found for ${yesterday.toISOString().slice(0, 10)}`);
  }

  // ---------------------------------------------------------------
  // 3. Incident breakdowns (completed incidents from yesterday)
  // ---------------------------------------------------------------
  const incidentWhere = {
    firstSeenAt: { gte: yesterday, lt: todayStart },
  };

  const [byCauseRaw, bySeverityRaw] = await Promise.all([
    prisma.trafficIncident.groupBy({
      by: ["causeType"],
      where: { ...incidentWhere, causeType: { not: null } },
      _count: true,
    }),
    prisma.trafficIncident.groupBy({
      by: ["severity"],
      where: incidentWhere,
      _count: true,
    }),
  ]);

  const byIncidentCause = Object.fromEntries(
    byCauseRaw.map((r) => [r.causeType!, r._count])
  );
  const bySeverity = Object.fromEntries(
    bySeverityRaw.map((r) => [r.severity, r._count])
  );

  console.log(`[daily-stats] Incident causes: ${JSON.stringify(byIncidentCause)}`);
  console.log(`[daily-stats] Incident severity: ${JSON.stringify(bySeverity)}`);

  // ---------------------------------------------------------------
  // 4. Upsert into DailyStats (merge, don't overwrite V16 fields)
  // ---------------------------------------------------------------
  const enrichmentData = {
    cameraCount,
    radarCount,
    gasStationCount,
    chargerCount,
    detectorCount,
    avgGasoleoA,
    avgGasolina95,
    avgGasolina98,
    byIncidentCause: Object.keys(byIncidentCause).length > 0 ? byIncidentCause : undefined,
    bySeverity: Object.keys(bySeverity).length > 0 ? bySeverity : undefined,
  };

  await prisma.dailyStats.upsert({
    where: { dateStart: yesterday },
    create: {
      dateStart: yesterday,
      ...enrichmentData,
    },
    update: enrichmentData,
  });

  console.log(`[daily-stats] Upserted DailyStats for ${yesterday.toISOString().slice(0, 10)}`);

  // ---------------------------------------------------------------
  // 4b. RailwayDailyStats — aggregate from fleet positions + alerts
  // ---------------------------------------------------------------
  try {
    const dayStart = new Date(yesterday);
    const dayEnd = new Date(yesterday);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    // Fleet positions (RenfeFleetPosition or RailwayDelaySnapshot)
    const fleetAgg = await prisma.renfeFleetPosition.aggregate({
      where: { createdAt: { gte: dayStart, lt: dayEnd } },
      _count: { _all: true },
      _avg: { delay: true },
      _max: { delay: true },
    });

    const avgTrains = fleetAgg._count._all > 0
      ? Math.round(fleetAgg._count._all / 24) // rough: total snapshots / 24h
      : 0;

    if (avgTrains > 0) {
      const avgDelay = fleetAgg._avg.delay ? Number(fleetAgg._avg.delay) : 0;
      const maxDelay = fleetAgg._max.delay ? Number(fleetAgg._max.delay) : 0;
      const punctualityRate = fleetAgg._count._all > 0
        ? Math.min(100, Math.max(0, 100 - (avgDelay / 5) * 100)) // rough: <5min = 100%
        : 100;

      const dayAlerts = await prisma.railwayAlert.count({
        where: { createdAt: { gte: dayStart, lt: dayEnd } },
      });

      await prisma.railwayDailyStats.upsert({
        where: { date: yesterday },
        create: {
          date: yesterday,
          avgTrains,
          avgDelay,
          maxDelay,
          punctualityRate,
          totalAlerts: dayAlerts,
          totalCancellations: 0,
        },
        update: {
          avgTrains,
          avgDelay,
          maxDelay,
          punctualityRate,
          totalAlerts: dayAlerts,
        },
      });
      console.log(`[daily-stats] RailwayDailyStats: avgTrains=${avgTrains} avgDelay=${avgDelay.toFixed(1)}min punctuality=${punctualityRate.toFixed(1)}%`);
    } else {
      console.log(`[daily-stats] No fleet position data for ${yesterday.toISOString().slice(0, 10)}`);
    }
  } catch (err) {
    console.error("[daily-stats] RailwayDailyStats failed:", (err as Error).message);
  }

  // ---------------------------------------------------------------
  // 5. Refresh LocationStats (province + community level)
  // ---------------------------------------------------------------
  console.log("[daily-stats] Refreshing LocationStats...");

  const provinces = await prisma.province.findMany({ select: { code: true, name: true } });
  const communities = await prisma.community.findMany({ select: { code: true, name: true } });

  let locUpdated = 0;
  for (const scope of [...provinces.map(p => ({ type: "province", ...p })), ...communities.map(c => ({ type: "community", ...c }))]) {
    try {
      const gasWhere = scope.type === "province"
        ? { province: scope.code }
        : { communityCode: scope.code };
      const provWhere = scope.type === "province"
        ? { province: scope.code }
        : {};

      const [cameras, radars, gas, chargers, incidents, v16s, weather, roads] = await Promise.all([
        prisma.camera.count({ where: provWhere }),
        prisma.radar.count({ where: provWhere }),
        prisma.gasStation.count({ where: gasWhere }),
        prisma.eVCharger.count({ where: provWhere }),
        prisma.trafficIncident.count({ where: { ...provWhere, isActive: true } }),
        prisma.v16BeaconEvent.count({ where: { ...provWhere, isActive: true } }),
        prisma.weatherAlert.count({ where: { ...(scope.type === "province" ? { province: scope.code } : {}), isActive: true } }),
        scope.type === "province" ? prisma.road.count({ where: { provinces: { has: scope.code } } }) : Promise.resolve(0),
      ]);

      const fuelAgg = await prisma.gasStation.aggregate({
        where: gasWhere,
        _avg: { priceGasoleoA: true, priceGasolina95E5: true },
        _min: { priceGasoleoA: true, priceGasolina95E5: true },
      });

      await prisma.locationStats.upsert({
        where: { scopeType_scopeCode: { scopeType: scope.type, scopeCode: scope.code } },
        create: {
          scopeType: scope.type,
          scopeCode: scope.code,
          scopeName: scope.name,
          cameraCount: cameras, radarCount: radars, gasStationCount: gas,
          evChargerCount: chargers, roadCount: roads,
          activeIncidentCount: incidents, activeV16Count: v16s, activeWeatherAlerts: weather,
          avgDieselPrice: fuelAgg._avg.priceGasoleoA ?? undefined,
          avgGasoline95Price: fuelAgg._avg.priceGasolina95E5 ?? undefined,
          minDieselPrice: fuelAgg._min.priceGasoleoA ?? undefined,
          minGasoline95Price: fuelAgg._min.priceGasolina95E5 ?? undefined,
          staticUpdatedAt: now, realtimeUpdatedAt: now,
          pricesUpdatedAt: fuelAgg._avg.priceGasoleoA != null ? now : undefined,
        },
        update: {
          scopeName: scope.name,
          cameraCount: cameras, radarCount: radars, gasStationCount: gas,
          evChargerCount: chargers, roadCount: roads,
          activeIncidentCount: incidents, activeV16Count: v16s, activeWeatherAlerts: weather,
          avgDieselPrice: fuelAgg._avg.priceGasoleoA ?? undefined,
          avgGasoline95Price: fuelAgg._avg.priceGasolina95E5 ?? undefined,
          minDieselPrice: fuelAgg._min.priceGasoleoA ?? undefined,
          minGasoline95Price: fuelAgg._min.priceGasolina95E5 ?? undefined,
          staticUpdatedAt: now, realtimeUpdatedAt: now,
          pricesUpdatedAt: fuelAgg._avg.priceGasoleoA != null ? now : undefined,
        },
      });
      locUpdated++;
    } catch (err) {
      console.error(`[daily-stats] LocationStats ${scope.type}:${scope.code} failed:`, (err as Error).message);
    }
  }

  console.log(`[daily-stats] LocationStats: ${locUpdated}/${provinces.length + communities.length} scopes updated`);
  console.log("[daily-stats] Done");
}
