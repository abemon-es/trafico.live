import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { applyRateLimit } from "@/lib/api-utils";
import { getOrCompute } from "@/lib/redis";

export const dynamic = "force-dynamic";

/**
 * GET /api/trafico/prediccion
 *
 * Traffic prediction API — three modes:
 *   - heatmap (default): 168-cell weekly intensity heatmap from HourlyTrafficProfile
 *   - comparison: live vs. predicted deviation for current moment (Madrid timezone)
 *   - forecast: per-hour predictions for the next N hours (1–12) with confidence scores
 *
 * Query Parameters:
 *   - mode: "heatmap" | "comparison" | "forecast" (default: "heatmap")
 *   - hours: 1–12 (forecast mode only, default: 3)
 */

type HeatmapRow = {
  dayOfWeek: number;
  hour: number;
  avg_intensity: number;
  avg_sl: number;
  total_samples: bigint;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get current Madrid time components. */
function getMadridTime(): { dayOfWeek: number; hour: number; madridNow: Date } {
  const madridNow = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Madrid" })
  );
  return {
    dayOfWeek: madridNow.getDay(), // 0 = Sunday
    hour: madridNow.getHours(),
    madridNow,
  };
}

/** Classify intensity deviation as a label. */
function classifyDeviation(pct: number): string {
  const abs = Math.abs(pct);
  if (abs < 10) return "normal";
  if (pct < 0) return "below_normal";
  if (abs < 30) return "above_normal";
  return "much_above_normal";
}

/** Confidence score based on sample count. */
function getConfidence(sampleCount: number): number {
  if (sampleCount < 100) return 0.3;
  if (sampleCount < 500) return 0.6;
  if (sampleCount < 1000) return 0.8;
  return 0.95;
}

// ---------------------------------------------------------------------------
// Heatmap — 168 cells (7 days × 24 hours), 5 min cache
// ---------------------------------------------------------------------------

async function handleHeatmap() {
  return getOrCompute<object>("prediction:heatmap", 300, async () => {
    const rows = await prisma.$queryRaw<HeatmapRow[]>`
      SELECT "dayOfWeek", "hour",
        ROUND(SUM("avgIntensity" * "sampleCount")::numeric / NULLIF(SUM("sampleCount"), 0))::int AS avg_intensity,
        ROUND(SUM(COALESCE("avgServiceLevel", 0) * "sampleCount") / NULLIF(SUM("sampleCount"), 0), 2) AS avg_sl,
        SUM("sampleCount") AS total_samples
      FROM "HourlyTrafficProfile"
      WHERE "source" = 'MADRID'
      GROUP BY "dayOfWeek", "hour"
      ORDER BY "dayOfWeek", "hour"
    `;

    const heatmap = rows.map((r) => ({
      dayOfWeek: r.dayOfWeek,
      hour: r.hour,
      avgIntensity: r.avg_intensity,
      avgServiceLevel: Number(r.avg_sl),
      sampleCount: Number(r.total_samples),
    }));

    return {
      success: true,
      data: {
        heatmap,
        metadata: {
          sensorCount: 6117,
          source: "MADRID",
          lastUpdated: new Date().toISOString(),
        },
      },
    };
  });
}

// ---------------------------------------------------------------------------
// Comparison — live vs predicted for current moment, 1 min cache
// ---------------------------------------------------------------------------

async function handleComparison() {
  return getOrCompute<object>("prediction:comparison", 60, async () => {
    const { dayOfWeek, hour, madridNow } = getMadridTime();

    // Live readings from last 10 minutes
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    const readings = await prisma.trafficIntensity.findMany({
      where: { source: "MADRID", recordedAt: { gte: tenMinAgo }, error: false },
      select: { intensity: true, serviceLevel: true, recordedAt: true },
    });

    // Predicted average for this (dayOfWeek, hour)
    const profileRows = await prisma.$queryRaw<HeatmapRow[]>`
      SELECT "dayOfWeek", "hour",
        ROUND(SUM("avgIntensity" * "sampleCount")::numeric / NULLIF(SUM("sampleCount"), 0))::int AS avg_intensity,
        ROUND(SUM(COALESCE("avgServiceLevel", 0) * "sampleCount") / NULLIF(SUM("sampleCount"), 0), 2) AS avg_sl,
        SUM("sampleCount") AS total_samples
      FROM "HourlyTrafficProfile"
      WHERE "source" = 'MADRID'
        AND "dayOfWeek" = ${dayOfWeek}
        AND "hour" = ${hour}
      GROUP BY "dayOfWeek", "hour"
    `;

    const predicted =
      profileRows.length > 0
        ? {
            avgIntensity: profileRows[0].avg_intensity,
            avgServiceLevel: Number(profileRows[0].avg_sl),
            sampleCount: Number(profileRows[0].total_samples),
          }
        : null;

    // Current aggregate
    let current: {
      avgIntensity: number;
      avgServiceLevel: number;
      sensorCount: number;
      recordedAt: string;
    } | null = null;

    if (readings.length > 0) {
      const totalIntensity = readings.reduce((s, r) => s + r.intensity, 0);
      const totalServiceLevel = readings.reduce((s, r) => s + r.serviceLevel, 0);
      const latestRecordedAt = readings
        .map((r) => r.recordedAt)
        .sort((a, b) => b.getTime() - a.getTime())[0];

      current = {
        avgIntensity: Math.round(totalIntensity / readings.length),
        avgServiceLevel:
          Math.round((totalServiceLevel / readings.length) * 100) / 100,
        sensorCount: readings.length,
        recordedAt: latestRecordedAt.toISOString(),
      };
    }

    // Deviation
    let deviation: {
      intensityPercent: number;
      serviceLevelDelta: number;
      label: string;
    } | null = null;

    if (current && predicted && predicted.avgIntensity > 0) {
      const intensityPercent =
        Math.round(
          ((current.avgIntensity - predicted.avgIntensity) /
            predicted.avgIntensity) *
            10000
        ) / 100;
      const serviceLevelDelta =
        Math.round((current.avgServiceLevel - predicted.avgServiceLevel) * 100) /
        100;

      deviation = {
        intensityPercent,
        serviceLevelDelta,
        label: classifyDeviation(intensityPercent),
      };
    }

    return {
      success: true,
      data: {
        current,
        predicted,
        deviation,
        context: {
          dayOfWeek,
          hour,
          madridTime: madridNow.toISOString(),
        },
      },
    };
  });
}

// ---------------------------------------------------------------------------
// Forecast — next N hours with fade-adjusted deviation, 1 min cache
// ---------------------------------------------------------------------------

async function handleForecast(hoursParam: number) {
  const hours = Math.max(1, Math.min(12, hoursParam));

  return getOrCompute<object>(`prediction:forecast:${hours}`, 60, async () => {
    const { dayOfWeek, hour: currentHour, madridNow } = getMadridTime();

    // Get current deviation from comparison data (reuse comparison logic inline
    // to avoid double caching issues — keep it simple)
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    const liveReadings = await prisma.trafficIntensity.findMany({
      where: { source: "MADRID", recordedAt: { gte: tenMinAgo }, error: false },
      select: { intensity: true },
    });

    // Predicted for current slot
    const currentProfileRows = await prisma.$queryRaw<HeatmapRow[]>`
      SELECT "dayOfWeek", "hour",
        ROUND(SUM("avgIntensity" * "sampleCount")::numeric / NULLIF(SUM("sampleCount"), 0))::int AS avg_intensity,
        SUM("sampleCount") AS total_samples
      FROM "HourlyTrafficProfile"
      WHERE "source" = 'MADRID'
        AND "dayOfWeek" = ${dayOfWeek}
        AND "hour" = ${currentHour}
      GROUP BY "dayOfWeek", "hour"
    `;

    let currentDeviationPct = 0;
    if (
      liveReadings.length > 0 &&
      currentProfileRows.length > 0 &&
      currentProfileRows[0].avg_intensity > 0
    ) {
      const currentAvg =
        liveReadings.reduce((s, r) => s + r.intensity, 0) / liveReadings.length;
      currentDeviationPct =
        Math.round(
          ((currentAvg - currentProfileRows[0].avg_intensity) /
            currentProfileRows[0].avg_intensity) *
            10000
        ) / 100;
    }

    // Build future hour slots
    const futureSlots: Array<{ dayOfWeek: number; hour: number; offset: number }> =
      [];
    for (let i = 1; i <= hours; i++) {
      const futureDate = new Date(madridNow.getTime() + i * 60 * 60 * 1000);
      futureSlots.push({
        dayOfWeek: futureDate.getDay(),
        hour: futureDate.getHours(),
        offset: i,
      });
    }

    // Batch-fetch profiles for all future slots using a WHERE IN approach
    const conditions = futureSlots.map(
      (s) =>
        Prisma.sql`("dayOfWeek" = ${s.dayOfWeek} AND "hour" = ${s.hour})`
    );

    const profileRows = await prisma.$queryRaw<HeatmapRow[]>`
      SELECT "dayOfWeek", "hour",
        ROUND(SUM("avgIntensity" * "sampleCount")::numeric / NULLIF(SUM("sampleCount"), 0))::int AS avg_intensity,
        ROUND(SUM(COALESCE("avgServiceLevel", 0) * "sampleCount") / NULLIF(SUM("sampleCount"), 0), 2) AS avg_sl,
        SUM("sampleCount") AS total_samples
      FROM "HourlyTrafficProfile"
      WHERE "source" = 'MADRID'
        AND (${Prisma.join(conditions, " OR ")})
      GROUP BY "dayOfWeek", "hour"
    `;

    // Index profiles by (dayOfWeek, hour) for O(1) lookup
    const profileMap = new Map<string, HeatmapRow>();
    for (const row of profileRows) {
      profileMap.set(`${row.dayOfWeek}:${row.hour}`, row);
    }

    // Build forecast entries with faded deviation adjustment
    const forecast = futureSlots.map(({ dayOfWeek: dow, hour, offset }) => {
      const profile = profileMap.get(`${dow}:${hour}`);

      if (!profile) {
        return {
          hour,
          dayOfWeek: dow,
          avgIntensity: null,
          avgServiceLevel: null,
          confidence: 0,
        };
      }

      const sampleCount = Number(profile.total_samples);
      const baseIntensity = profile.avg_intensity;
      const baseServiceLevel = Number(profile.avg_sl);

      // Fade factor: 100% at h+1, 50% at h+2, 25% at h+3, etc.
      const fadeFactor = 1 / offset;
      const adjustedIntensity = Math.round(
        baseIntensity * (1 + (currentDeviationPct / 100) * fadeFactor)
      );

      return {
        hour,
        dayOfWeek: dow,
        avgIntensity: adjustedIntensity,
        avgServiceLevel: baseServiceLevel,
        confidence: getConfidence(sampleCount),
      };
    });

    return {
      success: true,
      data: {
        forecast,
        currentDeviation: currentDeviationPct,
        requestedHours: hours,
      },
    };
  });
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") || "heatmap";

    if (!["heatmap", "comparison", "forecast"].includes(mode)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid mode. Valid: heatmap, comparison, forecast",
        },
        { status: 400 }
      );
    }

    if (mode === "heatmap") {
      const result = await handleHeatmap();
      return NextResponse.json(result);
    }

    if (mode === "comparison") {
      const result = await handleComparison();
      return NextResponse.json(result);
    }

    // forecast
    const hoursRaw = parseInt(searchParams.get("hours") || "3", 10);
    const hours = isNaN(hoursRaw) ? 3 : hoursRaw; // clamp happens inside handleForecast
    const result = await handleForecast(hours);
    return NextResponse.json(result);
  } catch (error) {
    reportApiError(error, "Traffic prediction API error", request);
    return NextResponse.json(
      { success: false, error: "Failed to fetch traffic prediction" },
      { status: 500 }
    );
  }
}
