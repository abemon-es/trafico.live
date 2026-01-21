/**
 * V16 Beacon Statistics Aggregator
 *
 * Aggregates beacon data into HourlyStats and DailyStats tables
 * for historical analysis and dashboards.
 */

import { PrismaClient } from "@prisma/client";

export async function aggregateStats(prisma: PrismaClient, now: Date): Promise<void> {
  console.log("[aggregator] Starting stats aggregation");

  try {
    // 1. HOURLY AGGREGATION
    const hourStart = new Date(now);
    hourStart.setMinutes(0, 0, 0);

    // Count active beacons
    const activeCount = await prisma.v16BeaconEvent.count({
      where: { isActive: true }
    });

    // Count new activations this hour
    const newActivations = await prisma.v16BeaconEvent.count({
      where: {
        firstSeenAt: { gte: hourStart, lt: now }
      }
    });

    // Count deactivations this hour
    const deactivations = await prisma.v16BeaconEvent.count({
      where: {
        isActive: false,
        deactivatedAt: { gte: hourStart, lt: now }
      }
    });

    // Count incidents (if any)
    const incidentCount = await prisma.trafficIncident.count({
      where: { isActive: true }
    }).catch(() => 0);

    // Province breakdown (active beacons)
    const byProvinceRaw = await prisma.v16BeaconEvent.groupBy({
      by: ["province"],
      where: { isActive: true, province: { not: null } },
      _count: true
    });
    const byProvince = Object.fromEntries(
      byProvinceRaw.map(p => [p.province!, p._count])
    );

    // Community breakdown
    const byCommunityRaw = await prisma.v16BeaconEvent.groupBy({
      by: ["community"],
      where: { isActive: true, community: { not: null } },
      _count: true
    });
    const byCommunity = Object.fromEntries(
      byCommunityRaw.map(c => [c.community!, c._count])
    );

    // Road type breakdown
    const byRoadTypeRaw = await prisma.v16BeaconEvent.groupBy({
      by: ["roadType"],
      where: { isActive: true, roadType: { not: null } },
      _count: true
    });
    const byRoadType = Object.fromEntries(
      byRoadTypeRaw.map(r => [r.roadType!, r._count])
    );

    // Severity breakdown
    const bySeverityRaw = await prisma.v16BeaconEvent.groupBy({
      by: ["severity"],
      where: { isActive: true },
      _count: true
    });
    const bySeverity = Object.fromEntries(
      bySeverityRaw.map(s => [s.severity, s._count])
    );

    // Upsert hourly stats
    await prisma.hourlyStats.upsert({
      where: { hourStart },
      create: {
        hourStart,
        v16Count: activeCount,
        incidentCount,
        newActivations,
        deactivations,
        byProvince,
        byCommunity,
        byRoadType,
        bySeverity,
        weatherAlerts: 0
      },
      update: {
        v16Count: activeCount,
        incidentCount,
        newActivations,
        deactivations,
        byProvince,
        byCommunity,
        byRoadType,
        bySeverity
      }
    });

    console.log(`[aggregator] Updated hourly stats: ${activeCount} active, ${newActivations} new, ${deactivations} deactivated`);

    // 2. DAILY AGGREGATION
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // Get all hourly stats for today
    const todayHourlyStats = await prisma.hourlyStats.findMany({
      where: {
        hourStart: { gte: todayStart }
      },
      orderBy: { hourStart: "asc" }
    });

    if (todayHourlyStats.length > 0) {
      // Calculate daily totals
      const dailyV16Total = todayHourlyStats.reduce((sum, h) => sum + h.v16Count, 0);
      const dailyIncidentTotal = todayHourlyStats.reduce((sum, h) => sum + h.incidentCount, 0);

      // Find peak hour
      const peakHourData = todayHourlyStats.reduce(
        (max, h) => h.v16Count > max.count
          ? { hour: h.hourStart.getHours(), count: h.v16Count }
          : max,
        { hour: 0, count: 0 }
      );

      // Calculate average duration from deactivated beacons today
      const avgDurationResult = await prisma.v16BeaconEvent.aggregate({
        where: {
          isActive: false,
          deactivatedAt: { gte: todayStart },
          durationSecs: { not: null }
        },
        _avg: { durationSecs: true }
      });

      // By hour of day breakdown
      const byHourOfDay = Object.fromEntries(
        todayHourlyStats.map(h => [h.hourStart.getHours(), h.v16Count])
      );

      // Aggregate province breakdown for the day
      const dailyByProvince: Record<string, number> = {};
      for (const h of todayHourlyStats) {
        const provinceData = h.byProvince as Record<string, number> | null;
        if (provinceData) {
          for (const [prov, count] of Object.entries(provinceData)) {
            dailyByProvince[prov] = (dailyByProvince[prov] || 0) + count;
          }
        }
      }

      // Aggregate community breakdown for the day
      const dailyByCommunity: Record<string, number> = {};
      for (const h of todayHourlyStats) {
        const communityData = h.byCommunity as Record<string, number> | null;
        if (communityData) {
          for (const [comm, count] of Object.entries(communityData)) {
            dailyByCommunity[comm] = (dailyByCommunity[comm] || 0) + count;
          }
        }
      }

      // Aggregate road type breakdown for the day
      const dailyByRoadType: Record<string, number> = {};
      for (const h of todayHourlyStats) {
        const roadTypeData = h.byRoadType as Record<string, number> | null;
        if (roadTypeData) {
          for (const [rt, count] of Object.entries(roadTypeData)) {
            dailyByRoadType[rt] = (dailyByRoadType[rt] || 0) + count;
          }
        }
      }

      // Upsert daily stats
      await prisma.dailyStats.upsert({
        where: { dateStart: todayStart },
        create: {
          dateStart: todayStart,
          v16Total: dailyV16Total,
          incidentTotal: dailyIncidentTotal,
          peakHour: peakHourData.hour,
          peakCount: peakHourData.count,
          avgDurationSecs: Math.round(avgDurationResult._avg.durationSecs || 0),
          byHourOfDay,
          byProvince: dailyByProvince,
          byCommunity: dailyByCommunity,
          byRoadType: dailyByRoadType,
          weatherAlertDays: 0
        },
        update: {
          v16Total: dailyV16Total,
          incidentTotal: dailyIncidentTotal,
          peakHour: peakHourData.hour,
          peakCount: peakHourData.count,
          avgDurationSecs: Math.round(avgDurationResult._avg.durationSecs || 0),
          byHourOfDay,
          byProvince: dailyByProvince,
          byCommunity: dailyByCommunity,
          byRoadType: dailyByRoadType
        }
      });

      console.log(`[aggregator] Updated daily stats: ${dailyV16Total} total beacons, peak hour ${peakHourData.hour}:00 with ${peakHourData.count}`);
    }

    console.log("[aggregator] Stats aggregation completed");

  } catch (error) {
    console.error("[aggregator] Error during aggregation:", error);
    throw error;
  }
}
