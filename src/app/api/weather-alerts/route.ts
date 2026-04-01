import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFromCache, setInCache } from "@/lib/redis";
import { applyRateLimit } from "@/lib/api-utils";

const CACHE_KEY_PREFIX = "api:weather-alerts";
const CACHE_TTL = 300; // 5 minutes

export const revalidate = 300;

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const searchParams = request.nextUrl.searchParams;
    const provinceFilter = searchParams.get("province");
    const severityFilter = searchParams.get("severity");
    const typeFilter = searchParams.get("type");

    // Build a deterministic cache key from query params
    const paramStr = new URLSearchParams(
      [...searchParams.entries()].sort(([a], [b]) => a.localeCompare(b))
    ).toString();
    const cacheKey = paramStr
      ? `${CACHE_KEY_PREFIX}:${paramStr}`
      : CACHE_KEY_PREFIX;

    const cached = await getFromCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    // Build where clause for filtered alerts
    const whereClause: Record<string, unknown> = { isActive: true };

    if (provinceFilter) {
      whereClause.province = provinceFilter;
    }
    if (severityFilter) {
      whereClause.severity = severityFilter;
    }
    if (typeFilter) {
      whereClause.type = typeFilter;
    }

    // Fetch active weather alerts (filtered)
    const alerts = await prisma.weatherAlert.findMany({
      where: whereClause,
      orderBy: [{ startedAt: "desc" }],
    });

    // Always compute global counts (unfiltered by province/severity/type)
    const [countsBySeverity, countsByType, countsByProvince] = await Promise.all([
      prisma.weatherAlert.groupBy({
        by: ["severity"],
        where: { isActive: true },
        _count: true,
      }),
      prisma.weatherAlert.groupBy({
        by: ["type"],
        where: { isActive: true },
        _count: true,
      }),
      prisma.weatherAlert.groupBy({
        by: ["province", "provinceName"],
        where: { isActive: true },
        _count: true,
        orderBy: { _count: { province: "desc" } },
      }),
    ]);

    const bySeverity: Record<string, number> = {};
    for (const item of countsBySeverity) {
      bySeverity[item.severity] = item._count;
    }

    const byType: Record<string, number> = {};
    for (const item of countsByType) {
      byType[item.type] = item._count;
    }

    const byProvince: Record<string, { count: number; name: string | null }> =
      {};
    for (const item of countsByProvince) {
      byProvince[item.province] = {
        count: item._count,
        name: item.provinceName ?? null,
      };
    }

    // Total active count (unfiltered)
    const totalActive = await prisma.weatherAlert.count({
      where: { isActive: true },
    });

    // Last fetch time from returned alerts
    const latestFetch =
      alerts.length > 0
        ? alerts.reduce(
            (latest, a) => (a.fetchedAt > latest ? a.fetchedAt : latest),
            alerts[0].fetchedAt
          )
        : new Date();

    const responseData = {
      totalActive,
      count: alerts.length,
      lastUpdated: latestFetch.toISOString(),
      counts: {
        bySeverity,
        byType,
        byProvince,
      },
      alerts: alerts.map((a) => ({
        id: a.alertId,
        type: a.type,
        severity: a.severity,
        province: a.province,
        provinceName: a.provinceName ?? null,
        startedAt: a.startedAt.toISOString(),
        endedAt: a.endedAt?.toISOString() ?? null,
        description: a.description ?? null,
        isActive: a.isActive,
      })),
    };

    await setInCache(cacheKey, responseData, CACHE_TTL);
    return NextResponse.json(responseData);
  } catch (error) {
    reportApiError(error, "Error fetching weather alerts");
    return NextResponse.json(
      { error: "Internal server error", alerts: [], counts: {}, totalActive: 0 },
      { status: 500 }
    );
  }
}
