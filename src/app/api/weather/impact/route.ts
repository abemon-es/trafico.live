import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

const ALERT_TYPE_LABELS: Record<string, string> = {
  RAIN: "Lluvia",
  SNOW: "Nieve",
  ICE: "Hielo",
  FOG: "Niebla",
  WIND: "Viento",
  STORM: "Tormenta",
  TEMPERATURE: "Temperatura extrema",
  COASTAL: "Costero",
  OTHER: "Otro",
};

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);
    const days = Math.min(parseInt(searchParams.get("days") || "90", 10) || 90, 90);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get daily stats to correlate with weather
    const dailyStats = await prisma.dailyStats.findMany({
      where: { dateStart: { gte: startDate } },
      orderBy: { dateStart: "asc" },
    });

    // Get weather alerts for the period
    const weatherAlerts = await prisma.weatherAlert.findMany({
      where: { startedAt: { gte: startDate } },
      orderBy: { startedAt: "asc" },
    });

    // Build a map of dates with weather alerts
    const alertDates = new Set<string>();
    const alertsByType: Record<string, Set<string>> = {};

    for (const alert of weatherAlerts) {
      const date = alert.startedAt.toISOString().split("T")[0];
      alertDates.add(date);

      if (!alertsByType[alert.type]) {
        alertsByType[alert.type] = new Set();
      }
      alertsByType[alert.type].add(date);
    }

    // Calculate averages for days with and without alerts
    let withAlertsIncidents = 0;
    let withAlertsV16 = 0;
    let withAlertsDays = 0;
    let withoutAlertsIncidents = 0;
    let withoutAlertsV16 = 0;
    let withoutAlertsDays = 0;

    for (const stat of dailyStats) {
      const date = stat.dateStart.toISOString().split("T")[0];
      if (alertDates.has(date)) {
        withAlertsIncidents += stat.incidentTotal;
        withAlertsV16 += stat.v16Total;
        withAlertsDays++;
      } else {
        withoutAlertsIncidents += stat.incidentTotal;
        withoutAlertsV16 += stat.v16Total;
        withoutAlertsDays++;
      }
    }

    const avgWithAlerts = withAlertsDays > 0
      ? { avgIncidents: withAlertsIncidents / withAlertsDays, avgV16: withAlertsV16 / withAlertsDays, days: withAlertsDays }
      : { avgIncidents: 0, avgV16: 0, days: 0 };

    const avgWithoutAlerts = withoutAlertsDays > 0
      ? { avgIncidents: withoutAlertsIncidents / withoutAlertsDays, avgV16: withoutAlertsV16 / withoutAlertsDays, days: withoutAlertsDays }
      : { avgIncidents: 0, avgV16: 0, days: 0 };

    // Calculate impact multiplier
    const impactMultiplier = avgWithoutAlerts.avgIncidents > 0
      ? avgWithAlerts.avgIncidents / avgWithoutAlerts.avgIncidents
      : 1;

    // Calculate impact by alert type
    const byAlertType: Array<{
      type: string;
      label: string;
      avgIncidents: number;
      avgV16: number;
      days: number;
    }> = [];

    for (const [type, dates] of Object.entries(alertsByType)) {
      let totalIncidents = 0;
      let totalV16 = 0;
      let count = 0;

      for (const stat of dailyStats) {
        const date = stat.dateStart.toISOString().split("T")[0];
        if (dates.has(date)) {
          totalIncidents += stat.incidentTotal;
          totalV16 += stat.v16Total;
          count++;
        }
      }

      if (count > 0) {
        byAlertType.push({
          type,
          label: ALERT_TYPE_LABELS[type] || type,
          avgIncidents: totalIncidents / count,
          avgV16: totalV16 / count,
          days: count,
        });
      }
    }

    // Sort by average incidents descending
    byAlertType.sort((a, b) => b.avgIncidents - a.avgIncidents);

    // Get recent alerts
    const recentAlerts = weatherAlerts
      .slice(-10)
      .reverse()
      .map((alert) => ({
        date: alert.startedAt.toISOString().split("T")[0],
        type: alert.type,
        province: alert.provinceName || alert.province,
        severity: alert.severity,
      }));

    return NextResponse.json({
      success: true,
      data: {
        correlation: {
          withAlerts: avgWithAlerts,
          withoutAlerts: avgWithoutAlerts,
          impactMultiplier,
        },
        byAlertType,
        recentAlerts,
        periodDays: days,
      },
    });
  } catch (error) {
    console.error("Weather impact API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch weather impact data" },
      { status: 500 }
    );
  }
}
