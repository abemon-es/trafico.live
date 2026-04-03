import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { getOrCompute } from "@/lib/redis";

export const dynamic = "force-dynamic";

/**
 * GET /api/prediccion/congestion
 *
 * Predicts congestion levels for the next N hours based on HourlyTrafficProfile
 * aggregates + current live TrafficIntensity readings (Madrid sensors).
 *
 * Query params:
 *   - hours   — forecast horizon 1-12 (default: 6)
 *   - sensor  — specific sensor ID to filter profile (optional)
 */

type ProfileRow = {
  dayOfWeek: number;
  hour: number;
  avg_intensity: number;
  avg_sl: number;
  total_samples: bigint;
};

/** Map average service level (0-3 float) to a congestion label. */
function getCongestionLevel(
  avgServiceLevel: number
): "free" | "light" | "moderate" | "heavy" | "gridlock" {
  if (avgServiceLevel < 0.3) return "free";
  if (avgServiceLevel < 0.8) return "light";
  if (avgServiceLevel < 1.5) return "moderate";
  if (avgServiceLevel < 2.3) return "heavy";
  return "gridlock";
}

/** Sample count → confidence score. */
function getConfidence(sampleCount: number, isEstimated: boolean): number {
  let base: number;
  if (sampleCount < 100) base = 0.3;
  else if (sampleCount < 500) base = 0.6;
  else if (sampleCount < 1000) base = 0.8;
  else base = 0.95;
  return isEstimated ? Math.min(base, 0.5) : base;
}

/** Check if a (dayOfWeek, hour) slot is in peak commute hours. */
function isPeakHour(dow: number, hour: number): boolean {
  // JS getDay(): 0=Sun, 6=Sat — treat as weekend
  const isWeekend = dow === 0 || dow === 6;
  if (isWeekend) return false;
  return (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
}

/** Madrid current time: JS getDay() (0=Sun), hour 0-23. */
function getMadridTime(): {
  dayOfWeek: number;
  hour: number;
  madridNow: Date;
} {
  const madridNow = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Madrid" })
  );
  return {
    dayOfWeek: madridNow.getDay(),
    hour: madridNow.getHours(),
    madridNow,
  };
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);

    // --- Parse & validate params ---
    const hoursRaw = parseInt(searchParams.get("hours") || "6", 10);
    const sensorRaw = searchParams.get("sensor");
    const sensorId = sensorRaw ? parseInt(sensorRaw, 10) : null;

    if (isNaN(hoursRaw) || hoursRaw < 1 || hoursRaw > 12) {
      return NextResponse.json(
        { success: false, error: "Invalid hours. Must be 1-12." },
        { status: 400 }
      );
    }
    if (sensorRaw !== null && (sensorId === null || isNaN(sensorId as number))) {
      return NextResponse.json(
        { success: false, error: "Invalid sensor ID." },
        { status: 400 }
      );
    }

    const cacheKey = `prediccion:congestion:${hoursRaw}:${sensorId ?? "all"}`;

    const result = await getOrCompute<object>(cacheKey, 120, async () => {
      const { dayOfWeek, hour: currentHour, madridNow } = getMadridTime();

      // ---------------------------------------------------------------
      // 1. Live current readings for deviation calculation
      // ---------------------------------------------------------------
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
      const liveWhere: Record<string, unknown> = {
        source: "MADRID",
        recordedAt: { gte: tenMinAgo },
        error: false,
      };
      if (sensorId !== null) liveWhere.sensorId = sensorId;

      const liveReadings = await prisma.trafficIntensity.findMany({
        where: liveWhere,
        select: { sensorId: true, intensity: true, serviceLevel: true, recordedAt: true },
      });

      // ---------------------------------------------------------------
      // 2. Current predicted profile (for computing live deviation)
      // ---------------------------------------------------------------
      const currentProfileWhere: Record<string, unknown> = {
        source: "MADRID",
        dayOfWeek: currentHour, // will be overridden below
      };

      const currentProfileRows = await prisma.$queryRaw<ProfileRow[]>`
        SELECT "dayOfWeek", "hour",
          ROUND(SUM("avgIntensity" * "sampleCount")::numeric / NULLIF(SUM("sampleCount"), 0))::int AS avg_intensity,
          ROUND(SUM(COALESCE("avgServiceLevel", 0) * "sampleCount") / NULLIF(SUM("sampleCount"), 0), 2) AS avg_sl,
          SUM("sampleCount") AS total_samples
        FROM "HourlyTrafficProfile"
        WHERE "source" = 'MADRID'
          AND "dayOfWeek" = ${dayOfWeek}
          AND "hour" = ${currentHour}
          ${sensorId !== null ? prisma.$queryRaw`AND "sensorId" = ${sensorId}` : prisma.$queryRaw``}
        GROUP BY "dayOfWeek", "hour"
      `;

      // Void unused variable warning
      void currentProfileWhere;

      // ---------------------------------------------------------------
      // 3. Current deviation %
      // ---------------------------------------------------------------
      let currentDeviationPct = 0;
      let currentAvgIntensity: number | null = null;
      let currentAvgSL: number | null = null;

      if (liveReadings.length > 0) {
        currentAvgIntensity = Math.round(
          liveReadings.reduce((s, r) => s + r.intensity, 0) / liveReadings.length
        );
        currentAvgSL =
          Math.round(
            (liveReadings.reduce((s, r) => s + r.serviceLevel, 0) / liveReadings.length) * 100
          ) / 100;

        if (
          currentProfileRows.length > 0 &&
          currentProfileRows[0].avg_intensity > 0
        ) {
          currentDeviationPct =
            Math.round(
              ((currentAvgIntensity - currentProfileRows[0].avg_intensity) /
                currentProfileRows[0].avg_intensity) *
                10000
            ) / 100;
        }
      }

      // ---------------------------------------------------------------
      // 4. Build future hour slots
      // ---------------------------------------------------------------
      const futureSlots: Array<{
        dayOfWeek: number;
        hour: number;
        offset: number;
        slotDate: Date;
      }> = [];
      for (let i = 1; i <= hoursRaw; i++) {
        const futureDate = new Date(madridNow.getTime() + i * 60 * 60 * 1000);
        futureSlots.push({
          dayOfWeek: futureDate.getDay(),
          hour: futureDate.getHours(),
          offset: i,
          slotDate: futureDate,
        });
      }

      // ---------------------------------------------------------------
      // 5. Fetch profile rows for all future slots in one batch
      // ---------------------------------------------------------------
      // Build a list of unique (dayOfWeek, hour) pairs
      const uniquePairs = [
        ...new Map(
          futureSlots.map((s) => [`${s.dayOfWeek}:${s.hour}`, s])
        ).values(),
      ];

      // Build WHERE conditions using Prisma.join
      const { Prisma } = await import("@prisma/client");
      const conditions = uniquePairs.map(
        (s) =>
          Prisma.sql`("dayOfWeek" = ${s.dayOfWeek} AND "hour" = ${s.hour})`
      );

      const profileRows = await prisma.$queryRaw<ProfileRow[]>`
        SELECT "dayOfWeek", "hour",
          ROUND(SUM("avgIntensity" * "sampleCount")::numeric / NULLIF(SUM("sampleCount"), 0))::int AS avg_intensity,
          ROUND(SUM(COALESCE("avgServiceLevel", 0) * "sampleCount") / NULLIF(SUM("sampleCount"), 0), 2) AS avg_sl,
          SUM("sampleCount") AS total_samples
        FROM "HourlyTrafficProfile"
        WHERE "source" = 'MADRID'
          AND (${Prisma.join(conditions, " OR ")})
          ${sensorId !== null ? Prisma.sql`AND "sensorId" = ${sensorId}` : Prisma.sql``}
        GROUP BY "dayOfWeek", "hour"
      `;

      const profileMap = new Map<string, ProfileRow>();
      for (const row of profileRows) {
        profileMap.set(`${row.dayOfWeek}:${row.hour}`, row);
      }

      // Fallback: per-hour aggregates across all days
      const neededHours = [...new Set(futureSlots.map((s) => s.hour))];
      const fallbackRows = await prisma.$queryRaw<ProfileRow[]>`
        SELECT "hour" AS "dayOfWeek", "hour",
          ROUND(SUM("avgIntensity" * "sampleCount")::numeric / NULLIF(SUM("sampleCount"), 0))::int AS avg_intensity,
          ROUND(SUM(COALESCE("avgServiceLevel", 0) * "sampleCount") / NULLIF(SUM("sampleCount"), 0), 2) AS avg_sl,
          SUM("sampleCount") AS total_samples
        FROM "HourlyTrafficProfile"
        WHERE "source" = 'MADRID'
          AND "hour" = ANY(${neededHours})
          ${sensorId !== null ? Prisma.sql`AND "sensorId" = ${sensorId}` : Prisma.sql``}
        GROUP BY "hour"
      `;
      const fallbackMap = new Map<number, ProfileRow>();
      for (const row of fallbackRows) fallbackMap.set(row.hour, row);

      // ---------------------------------------------------------------
      // 6. Build predictions with faded deviation adjustment
      // ---------------------------------------------------------------
      const predictions = futureSlots.map(({ dayOfWeek: dow, hour, offset }) => {
        const profile = profileMap.get(`${dow}:${hour}`);
        const fb = !profile ? fallbackMap.get(hour) : null;
        const source = profile || fb;
        const isEstimated = !profile && !!fb;

        if (!source) {
          return {
            hour,
            dayOfWeek: dow,
            isPeak: isPeakHour(dow, hour),
            expectedIntensity: null,
            serviceLevel: null,
            confidence: 0,
            estimated: false,
            congestionLevel: "free" as const,
          };
        }

        const sampleCount = Number(source.total_samples);
        const baseIntensity = source.avg_intensity;
        const baseSL = Number(source.avg_sl);

        // Fade the current deviation towards 0 as horizon grows
        const fadeFactor = 1 / offset;
        const adjustedIntensity = Math.round(
          baseIntensity * (1 + (currentDeviationPct / 100) * fadeFactor)
        );

        // Weekend/holiday adjustment: weekends are typically lighter
        const isWeekend = dow === 0 || dow === 6;
        const dayTypeSL = isWeekend ? Math.max(0, baseSL - 0.15) : baseSL;

        return {
          hour,
          dayOfWeek: dow,
          isPeak: isPeakHour(dow, hour),
          expectedIntensity: adjustedIntensity,
          serviceLevel: Math.round(dayTypeSL * 100) / 100,
          confidence: getConfidence(sampleCount, isEstimated),
          estimated: isEstimated,
          congestionLevel: getCongestionLevel(dayTypeSL),
        };
      });

      // ---------------------------------------------------------------
      // 7. Live vs predicted summary
      // ---------------------------------------------------------------
      let currentVsPredicted: {
        deviation: number;
        status: string;
        liveIntensity: number | null;
        predictedIntensity: number | null;
      } | null = null;

      if (currentAvgIntensity !== null && currentProfileRows.length > 0) {
        let statusLabel = "normal";
        if (Math.abs(currentDeviationPct) < 10) statusLabel = "normal";
        else if (currentDeviationPct < 0) statusLabel = "por_debajo_de_lo_esperado";
        else if (currentDeviationPct < 30) statusLabel = "superior_a_lo_esperado";
        else statusLabel = "muy_superior_a_lo_esperado";

        currentVsPredicted = {
          deviation: currentDeviationPct,
          status: statusLabel,
          liveIntensity: currentAvgIntensity,
          predictedIntensity: currentProfileRows[0].avg_intensity,
        };
      }

      return {
        success: true,
        data: {
          predictions,
          currentVsPredicted,
          currentConditions: liveReadings.length > 0
            ? {
                avgIntensity: currentAvgIntensity,
                avgServiceLevel: currentAvgSL,
                sensorCount: liveReadings.length,
                congestionLevel: currentAvgSL !== null ? getCongestionLevel(currentAvgSL) : null,
                recordedAt: liveReadings
                  .map((r) => r.recordedAt)
                  .sort((a, b) => b.getTime() - a.getTime())[0]
                  .toISOString(),
              }
            : null,
          context: {
            requestedHours: hoursRaw,
            sensor: sensorId,
            madridTime: madridNow.toISOString(),
            dayOfWeek: dayOfWeek,
            currentHour,
          },
        },
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    reportApiError(error, "Congestion prediction API error", request);
    return NextResponse.json(
      { success: false, error: "Failed to compute congestion prediction" },
      { status: 500 }
    );
  }
}
