import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { getFromCache, setInCache } from "@/lib/redis";

// Cache for 10 minutes — historical SASEMAR data changes infrequently
export const revalidate = 600;

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 5000;

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type")?.toUpperCase();
    const zone = searchParams.get("zone");
    const province = searchParams.get("province");
    const severity = searchParams.get("severity")?.toLowerCase();
    const yearParam = searchParams.get("year");
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const limit = Math.min(
      parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT,
      MAX_LIMIT
    );

    // Build cache key based on filters (includes new date/year params).
    const cacheKey = `api:maritimo:emergencies:${type ?? "all"}:${zone ?? "all"}:${province ?? "all"}:${severity ?? "all"}:${yearParam ?? "all"}:${fromParam ?? "all"}:${toParam ?? "all"}:${limit}`;
    const cached = await getFromCache<object>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } });
    }

    // SASEMAR data is historical (2019-2023 currently). The old 30-day filter
    // excluded every row. Default to full dataset; narrow via ?year=YYYY or
    // ?from/?to (ISO). ?limit caps payload size.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};
    if (yearParam) {
      const yearNum = parseInt(yearParam, 10);
      if (Number.isFinite(yearNum)) where.year = yearNum;
    }
    if (fromParam || toParam) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const range: Record<string, any> = {};
      if (fromParam) range.gte = new Date(fromParam);
      if (toParam) range.lte = new Date(toParam);
      where.occurredAt = range;
    }

    if (type) {
      where.type = type;
    }

    if (zone) {
      where.zone = { contains: zone, mode: "insensitive" };
    }

    if (province) {
      where.province = province;
    }

    if (severity) {
      where.severity = { contains: severity, mode: "insensitive" };
    }

    const emergencies = await prisma.maritimeEmergency.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      take: limit,
      select: {
        id: true,
        sourceId: true,
        year: true,
        occurredAt: true,
        reportedAt: true,
        type: true,
        subtype: true,
        severity: true,
        latitude: true,
        longitude: true,
        zone: true,
        description: true,
        province: true,
        provinceName: true,
        vesselType: true,
        personsInvolved: true,
        personsSaved: true,
        personsMissing: true,
        personsDeceased: true,
      },
    });

    const response = {
      success: true,
      data: {
        emergencies: emergencies.map((e) => ({
          id: e.id,
          sourceId: e.sourceId,
          year: e.year,
          // Fall back to Jan 1 of the year when exact date is unavailable
          occurredAt: e.occurredAt?.toISOString() ?? new Date(`${e.year}-01-01T00:00:00Z`).toISOString(),
          reportedAt: e.reportedAt?.toISOString() ?? null,
          type: e.type,
          subtype: e.subtype ?? null,
          severity: e.severity ?? null,
          lat: e.latitude !== null ? Number(e.latitude) : null,
          lng: e.longitude !== null ? Number(e.longitude) : null,
          zone: e.zone ?? null,
          description: e.description ?? null,
          province: e.province ?? null,
          provinceName: e.provinceName ?? null,
          vesselType: e.vesselType ?? null,
          personsInvolved: e.personsInvolved ?? null,
          personsSaved: e.personsSaved ?? null,
          personsMissing: e.personsMissing ?? null,
          personsDeceased: e.personsDeceased ?? null,
        })),
        count: emergencies.length,
      },
    };

    // Cache for 10 minutes
    await setInCache(cacheKey, response, 600);

    return NextResponse.json(response, { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } });
  } catch (error) {
    reportApiError(error, "api/maritimo/emergencies] Error");
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch maritime emergencies",
        data: { emergencies: [], count: 0 },
      },
      { status: 500 }
    );
  }
}
