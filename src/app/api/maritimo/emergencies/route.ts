import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { getFromCache, setInCache } from "@/lib/redis";

// Cache for 10 minutes — historical SASEMAR data changes infrequently
export const revalidate = 600;

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type")?.toUpperCase();
    const zone = searchParams.get("zone");
    const province = searchParams.get("province");
    const severity = searchParams.get("severity")?.toLowerCase();

    // Build cache key based on filters
    const cacheKey = `api:maritimo:emergencies:${type ?? "all"}:${zone ?? "all"}:${province ?? "all"}:${severity ?? "all"}`;
    const cached = await getFromCache<object>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } });
    }

    const since = new Date(Date.now() - THIRTY_DAYS_MS);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {
      occurredAt: { gte: since },
    };

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
          occurredAt: e.occurredAt?.toISOString() ?? null,
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
