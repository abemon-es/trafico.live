import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { getFromCache, setInCache } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);
    const days = Math.min(parseInt(searchParams.get("days") || "30", 10) || 30, 90);

    const cacheKey = `historico:duration:${days}`;
    const cached = await getFromCache(cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
    }

    // Get deactivated V16 beacon events with duration data
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const beaconsWithDuration = await prisma.v16BeaconEvent.findMany({
      where: {
        firstSeenAt: { gte: startDate },
        durationSecs: { not: null },
        isActive: false,
      },
      select: {
        durationSecs: true,
        province: true,
        provinceName: true,
        roadType: true,
        severity: true,
      },
      take: 2000,
    });

    if (beaconsWithDuration.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          stats: null,
          distribution: [],
          byProvince: [],
          byRoadType: [],
          message: "No hay datos de duración disponibles aún",
        },
      });
    }

    const durations = beaconsWithDuration
      .map((b) => b.durationSecs as number)
      .sort((a, b) => a - b);

    // Calculate statistics
    const sum = durations.reduce((a, b) => a + b, 0);
    const avg = Math.round(sum / durations.length);
    const median = durations[Math.floor(durations.length / 2)];
    const min = durations[0];
    const max = durations[durations.length - 1];

    // Percentiles
    const p90 = durations[Math.floor(durations.length * 0.9)];
    const p95 = durations[Math.floor(durations.length * 0.95)];

    // Duration distribution (buckets)
    const buckets = [
      { label: "< 5 min", max: 300 },
      { label: "5-15 min", min: 300, max: 900 },
      { label: "15-30 min", min: 900, max: 1800 },
      { label: "30-60 min", min: 1800, max: 3600 },
      { label: "1-2 horas", min: 3600, max: 7200 },
      { label: "> 2 horas", min: 7200 },
    ];

    const distribution = buckets.map((bucket) => {
      const count = durations.filter((d) => {
        if (bucket.min !== undefined && bucket.max !== undefined) {
          return d >= bucket.min && d < bucket.max;
        } else if (bucket.min !== undefined) {
          return d >= bucket.min;
        } else if (bucket.max !== undefined) {
          return d < bucket.max;
        }
        return false;
      }).length;
      return {
        label: bucket.label,
        count,
        percentage: Math.round((count / durations.length) * 100),
      };
    });

    // Average duration by province
    const provinceMap: Record<string, { total: number; count: number; name: string }> = {};
    beaconsWithDuration.forEach((b) => {
      if (b.province && b.provinceName && b.durationSecs) {
        if (!provinceMap[b.province]) {
          provinceMap[b.province] = { total: 0, count: 0, name: b.provinceName };
        }
        provinceMap[b.province].total += b.durationSecs;
        provinceMap[b.province].count += 1;
      }
    });

    const byProvince = Object.entries(provinceMap)
      .map(([code, data]) => ({
        code,
        name: data.name,
        avgDurationSecs: Math.round(data.total / data.count),
        count: data.count,
      }))
      .sort((a, b) => b.avgDurationSecs - a.avgDurationSecs)
      .slice(0, 10);

    // Average duration by road type
    const roadTypeMap: Record<string, { total: number; count: number }> = {};
    beaconsWithDuration.forEach((b) => {
      if (b.roadType && b.durationSecs) {
        if (!roadTypeMap[b.roadType]) {
          roadTypeMap[b.roadType] = { total: 0, count: 0 };
        }
        roadTypeMap[b.roadType].total += b.durationSecs;
        roadTypeMap[b.roadType].count += 1;
      }
    });

    const byRoadType = Object.entries(roadTypeMap)
      .map(([type, data]) => ({
        type,
        avgDurationSecs: Math.round(data.total / data.count),
        count: data.count,
      }))
      .sort((a, b) => b.avgDurationSecs - a.avgDurationSecs);

    const response = {
      success: true,
      data: {
        stats: {
          count: durations.length,
          avgSecs: avg,
          medianSecs: median,
          minSecs: min,
          maxSecs: max,
          p90Secs: p90,
          p95Secs: p95,
          // Human-readable
          avgMinutes: Math.round(avg / 60),
          medianMinutes: Math.round(median / 60),
        },
        distribution,
        byProvince,
        byRoadType,
        periodDays: days,
      },
    };

    await setInCache(cacheKey, response, 300);
    return NextResponse.json(response, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
  } catch (error) {
    reportApiError(error, "Historico duration API error");
    return NextResponse.json(
      { success: false, error: "Failed to fetch duration statistics" },
      { status: 500 }
    );
  }
}
