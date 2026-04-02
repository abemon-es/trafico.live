// Incident analytics for the Intelligence section of location pages.
// Provides heatmap, monthly trend, and weather-incident correlation data.
//
// Uses raw SQL for complex aggregations that Prisma's query API cannot express
// (EXTRACT, date grouping, cross-table date joins).

import { getOrCompute } from "../redis";
import { prisma } from "../db";
import type { GeoEntity } from "../geo/types";

// -----------------------------------------------------------------------
// TTL constants (seconds)
// -----------------------------------------------------------------------

const TTL = {
  REALTIME: 120,
  FREQUENT: 300,
  DAILY: 3_600,
  WEEKLY: 86_400,
  MONTHLY: 604_800,
} as const;

// -----------------------------------------------------------------------
// Cache key helper
// -----------------------------------------------------------------------

function cacheKey(entity: GeoEntity, section: string): string {
  const scope =
    entity.municipalityCode ??
    entity.provinceCode ??
    entity.communityCode ??
    entity.roadId ??
    entity.slug;
  return `loc:${entity.level}:${scope}:${section}`;
}

// -----------------------------------------------------------------------
// Return types
// -----------------------------------------------------------------------

export interface HeatmapCell {
  day: number;
  hour: number;
  count: number;
}

export interface IncidentHeatmapData {
  cells: HeatmapCell[];
  total: number;
  peakDay: number;
  peakHour: number;
  peakCount: number;
}

export interface MonthlyTrendMonth {
  month: string;
  count: number;
  prevYearCount: number | null;
}

export interface MonthlyTrendData {
  months: MonthlyTrendMonth[];
  ytdTotal: number;
}

export interface AlertTypeCount {
  type: string;
  count: number;
}

export interface WeatherCorrelationData {
  alertDays: number;
  avgIncidentsWithAlert: number;
  avgIncidentsWithout: number;
  percentageIncrease: number;
  totalAlerts: number;
  alertsByType: AlertTypeCount[];
}

// -----------------------------------------------------------------------
// 1. Incident Heatmap (hour-of-day x day-of-week)
// -----------------------------------------------------------------------

/**
 * Returns incident counts grouped by hour-of-day and day-of-week for the
 * last 12 months. Used to render a heatmap showing when incidents peak.
 */
export async function getIncidentHeatmap(
  entity: GeoEntity
): Promise<IncidentHeatmapData> {
  return getOrCompute(cacheKey(entity, "heatmap"), TTL.DAILY, async () => {
    const province = entity.provinceCode ?? entity.communityCode ?? null;
    if (!province) {
      return { cells: [], total: 0, peakDay: 0, peakHour: 0, peakCount: 0 };
    }

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const rows = await prisma.$queryRawUnsafe<
      { day_of_week: number; hour_of_day: number; count: number }[]
    >(
      `SELECT
        EXTRACT(DOW FROM "startedAt")::int AS day_of_week,
        EXTRACT(HOUR FROM "startedAt")::int AS hour_of_day,
        COUNT(*)::int AS count
      FROM "TrafficIncident"
      WHERE "province" = $1
        AND "startedAt" >= $2
      GROUP BY day_of_week, hour_of_day
      ORDER BY day_of_week, hour_of_day`,
      province,
      twelveMonthsAgo
    );

    const cells: HeatmapCell[] = rows.map((r) => ({
      day: r.day_of_week,
      hour: r.hour_of_day,
      count: r.count,
    }));

    const total = cells.reduce((sum, c) => sum + c.count, 0);

    let peakDay = 0;
    let peakHour = 0;
    let peakCount = 0;
    for (const c of cells) {
      if (c.count > peakCount) {
        peakDay = c.day;
        peakHour = c.hour;
        peakCount = c.count;
      }
    }

    return { cells, total, peakDay, peakHour, peakCount };
  });
}

// -----------------------------------------------------------------------
// 2. Monthly Incident Trend (with YoY comparison)
// -----------------------------------------------------------------------

/**
 * Returns incident counts per month for the last 12 months, with the
 * same month from the previous year for year-over-year comparison.
 */
export async function getMonthlyIncidentTrend(
  entity: GeoEntity
): Promise<MonthlyTrendData> {
  return getOrCompute(
    cacheKey(entity, "monthlyTrend"),
    TTL.DAILY,
    async () => {
      const province = entity.provinceCode ?? entity.communityCode ?? null;
      if (!province) {
        return { months: [], ytdTotal: 0 };
      }

      // Fetch last 24 months so we can compare current 12 with previous 12
      const twentyFourMonthsAgo = new Date();
      twentyFourMonthsAgo.setMonth(twentyFourMonthsAgo.getMonth() - 24);

      const rows = await prisma.$queryRawUnsafe<
        { month: string; count: number }[]
      >(
        `SELECT
          TO_CHAR("startedAt", 'YYYY-MM') AS month,
          COUNT(*)::int AS count
        FROM "TrafficIncident"
        WHERE "province" = $1
          AND "startedAt" >= $2
        GROUP BY month
        ORDER BY month`,
        province,
        twentyFourMonthsAgo
      );

      // Build a lookup map: "YYYY-MM" -> count
      const countByMonth = new Map<string, number>();
      for (const row of rows) {
        countByMonth.set(row.month, row.count);
      }

      // Build the last 12 months with YoY comparison
      const months: MonthlyTrendMonth[] = [];
      const now = new Date();
      let ytdTotal = 0;

      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const prevD = new Date(d.getFullYear() - 1, d.getMonth(), 1);
        const prevKey = `${prevD.getFullYear()}-${String(prevD.getMonth() + 1).padStart(2, "0")}`;

        const count = countByMonth.get(key) ?? 0;
        const prevYearCount = countByMonth.get(prevKey) ?? null;

        months.push({ month: key, count, prevYearCount });
        ytdTotal += count;
      }

      return { months, ytdTotal };
    }
  );
}

// -----------------------------------------------------------------------
// 3. Weather-Incident Correlation
// -----------------------------------------------------------------------

/**
 * Compares average daily incident counts on days with weather alerts vs
 * days without, plus a breakdown of alerts by type.
 */
export async function getWeatherIncidentCorrelation(
  entity: GeoEntity
): Promise<WeatherCorrelationData> {
  return getOrCompute(
    cacheKey(entity, "weatherCorrelation"),
    TTL.DAILY,
    async () => {
      const province = entity.provinceCode ?? entity.communityCode ?? null;
      if (!province) {
        return {
          alertDays: 0,
          avgIncidentsWithAlert: 0,
          avgIncidentsWithout: 0,
          percentageIncrease: 0,
          totalAlerts: 0,
          alertsByType: [],
        };
      }

      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      // Count distinct days with weather alerts and total incidents on those days
      const alertDayStats = await prisma.$queryRawUnsafe<
        { alert_days: number; incidents_on_alert_days: number }[]
      >(
        `WITH alert_dates AS (
          SELECT DISTINCT DATE("startedAt") AS d
          FROM "WeatherAlert"
          WHERE "province" = $1
            AND "startedAt" >= $2
        ),
        incidents_per_day AS (
          SELECT DATE("startedAt") AS d, COUNT(*)::int AS cnt
          FROM "TrafficIncident"
          WHERE "province" = $1
            AND "startedAt" >= $2
          GROUP BY DATE("startedAt")
        )
        SELECT
          (SELECT COUNT(*)::int FROM alert_dates) AS alert_days,
          COALESCE(SUM(ipd.cnt), 0)::int AS incidents_on_alert_days
        FROM alert_dates ad
        JOIN incidents_per_day ipd ON ipd.d = ad.d`,
        province,
        twelveMonthsAgo
      );

      // Count total days and total incidents in the period
      const totalStats = await prisma.$queryRawUnsafe<
        { total_days: number; total_incidents: number }[]
      >(
        `SELECT
          COUNT(DISTINCT DATE("startedAt"))::int AS total_days,
          COUNT(*)::int AS total_incidents
        FROM "TrafficIncident"
        WHERE "province" = $1
          AND "startedAt" >= $2`,
        province,
        twelveMonthsAgo
      );

      const alertDays = alertDayStats[0]?.alert_days ?? 0;
      const incidentsOnAlertDays = alertDayStats[0]?.incidents_on_alert_days ?? 0;
      const totalDays = totalStats[0]?.total_days ?? 0;
      const totalIncidents = totalStats[0]?.total_incidents ?? 0;

      const nonAlertDays = Math.max(totalDays - alertDays, 1);
      const incidentsOnNonAlertDays = totalIncidents - incidentsOnAlertDays;

      const avgWithAlert = alertDays > 0 ? incidentsOnAlertDays / alertDays : 0;
      const avgWithout = nonAlertDays > 0 ? incidentsOnNonAlertDays / nonAlertDays : 0;
      const percentageIncrease =
        avgWithout > 0
          ? Math.round(((avgWithAlert - avgWithout) / avgWithout) * 100)
          : 0;

      // Total alerts count
      const totalAlerts = await prisma.weatherAlert.count({
        where: {
          province,
          startedAt: { gte: twelveMonthsAgo },
        },
      });

      // Alerts by type
      const alertsByTypeRaw = await prisma.weatherAlert.groupBy({
        by: ["type"],
        where: {
          province,
          startedAt: { gte: twelveMonthsAgo },
        },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      });

      const alertsByType: AlertTypeCount[] = alertsByTypeRaw.map((r) => ({
        type: r.type,
        count: r._count.id,
      }));

      return {
        alertDays,
        avgIncidentsWithAlert: Math.round(avgWithAlert * 10) / 10,
        avgIncidentsWithout: Math.round(avgWithout * 10) / 10,
        percentageIncrease,
        totalAlerts,
        alertsByType,
      };
    }
  );
}
