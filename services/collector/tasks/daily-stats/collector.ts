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
  console.log("[daily-stats] Done");
}
