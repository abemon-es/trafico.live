import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { RiskType, Severity } from "@prisma/client";
import { getFromCache, setInCache } from "@/lib/redis";
import { applyRateLimit } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

interface RiskZoneResponse {
  id: string;
  type: RiskType;
  roadNumber: string;
  kmStart: number;
  kmEnd: number;
  geometry: unknown;
  severity: Severity;
  description: string | null;
  animalType: string | null;
  incidentCount: number | null;
  lastUpdated: Date;
}

interface SummaryByType {
  type: RiskType;
  count: number;
  byRoad: { road: string; count: number }[];
}

/**
 * GET /api/roads/risk-zones
 *
 * List static risk zones from DGT data:
 * - TEFIVA (animal collision zones)
 * - Motorcycle risk zones
 * - Cyclist risk zones
 * - Pedestrian risk zones
 *
 * Query parameters:
 * - type: Filter by risk type (MOTORCYCLE, ANIMAL, CYCLIST, PEDESTRIAN)
 * - road: Filter by road number (case-insensitive partial match)
 * - severity: Filter by severity (LOW, MEDIUM, HIGH, VERY_HIGH)
 * - animal: Filter animal zones by animal type (deer, wild_boar, etc.)
 * - includeGeometry: Include geometry data ("true" or "false", default "true")
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get("type") as RiskType | null;
    const roadFilter = searchParams.get("road");
    const severityFilter = searchParams.get("severity") as Severity | null;
    const animalFilter = searchParams.get("animal");
    const includeGeometry = searchParams.get("includeGeometry") !== "false";
    const isUnfiltered = !typeFilter && !roadFilter && !severityFilter && !animalFilter;

    // Cache unfiltered requests (data changes infrequently)
    const cacheKey = `roads:risk-zones:${typeFilter ?? ""}:${roadFilter ?? ""}:${severityFilter ?? ""}:${animalFilter ?? ""}`;
    if (isUnfiltered) {
      const cached = await getFromCache(cacheKey);
      if (cached) return NextResponse.json(cached);
    }

    // Build where clause
    const where: Record<string, unknown> = {};

    if (typeFilter) {
      where.type = typeFilter;
    }

    if (roadFilter) {
      where.roadNumber = {
        contains: roadFilter,
        mode: "insensitive",
      };
    }

    if (severityFilter) {
      where.severity = severityFilter;
    }

    if (animalFilter) {
      where.type = "ANIMAL";
      where.animalType = {
        contains: animalFilter,
        mode: "insensitive",
      };
    }

    // Fetch risk zones (cap at 500 when no specific road filter to avoid oversized responses)
    const zones = await prisma.riskZone.findMany({
      where,
      ...(!roadFilter && { take: 500 }),
      select: {
        id: true,
        type: true,
        roadNumber: true,
        kmStart: true,
        kmEnd: true,
        geometry: includeGeometry,
        severity: true,
        description: true,
        animalType: true,
        incidentCount: true,
        lastUpdated: true,
      },
      orderBy: [
        { severity: "desc" },
        { roadNumber: "asc" },
        { kmStart: "asc" },
      ],
    });

    // Transform zones
    const transformedZones: RiskZoneResponse[] = zones.map((zone) => ({
      id: zone.id,
      type: zone.type,
      roadNumber: zone.roadNumber,
      kmStart: Number(zone.kmStart),
      kmEnd: Number(zone.kmEnd),
      geometry: includeGeometry ? zone.geometry : null,
      severity: zone.severity,
      description: zone.description,
      animalType: zone.animalType,
      incidentCount: zone.incidentCount,
      lastUpdated: zone.lastUpdated,
    }));

    // Get summaries
    const byType = await prisma.riskZone.groupBy({
      by: ["type"],
      _count: true,
      where, // Apply same filters
    });

    const bySeverity = await prisma.riskZone.groupBy({
      by: ["severity"],
      _count: true,
      where,
    });

    // Get roads with most risk zones
    const byRoad = await prisma.riskZone.groupBy({
      by: ["roadNumber", "type"],
      _count: true,
      where,
      orderBy: { _count: { roadNumber: "desc" } },
    });

    // Build detailed summary by type
    const summaryByType: SummaryByType[] = byType.map((t) => {
      const roadsForType = byRoad
        .filter((r) => r.type === t.type)
        .map((r) => ({ road: r.roadNumber, count: r._count }))
        .slice(0, 10);

      return {
        type: t.type,
        count: t._count,
        byRoad: roadsForType,
      };
    });

    // Get total incident count for animal zones
    const animalStats = zones
      .filter((z) => z.type === "ANIMAL" && z.incidentCount)
      .reduce(
        (acc, z) => {
          const animal = z.animalType || "unknown";
          if (!acc[animal]) acc[animal] = { count: 0, zones: 0 };
          acc[animal].count += z.incidentCount || 0;
          acc[animal].zones += 1;
          return acc;
        },
        {} as Record<string, { count: number; zones: number }>
      );

    const responseBody = {
      success: true,
      data: {
        zones: transformedZones,
        summary: {
          totalZones: zones.length,
          byType: byType.map((t) => ({ type: t.type, count: t._count })),
          bySeverity: bySeverity.map((s) => ({ severity: s.severity, count: s._count })),
          detailedByType: summaryByType,
          animalStats: Object.keys(animalStats).length > 0 ? animalStats : null,
        },
      },
    };

    if (isUnfiltered) {
      await setInCache(cacheKey, responseBody, 3600);
    }

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error("Risk zones API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch risk zones" },
      { status: 500 }
    );
  }
}
