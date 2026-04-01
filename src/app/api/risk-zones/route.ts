import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";

export const revalidate = 3600; // Cache for 1 hour

interface RiskZoneResponse {
  id: string;
  type: string;
  roadNumber: string;
  kmStart: number;
  kmEnd: number;
  geometry: unknown;
  severity: string;
  description: string | null;
  animalType: string | null;
  incidentCount: number | null;
  lastUpdated: string;
}

interface RiskZonesAPIResponse {
  success: boolean;
  data?: {
    zones: RiskZoneResponse[];
    summary: {
      total: number;
      byType: Record<string, number>;
      bySeverity: Record<string, number>;
      topRoads: { road: string; count: number }[];
    };
  };
  error?: string;
}

/**
 * GET /api/risk-zones
 *
 * List all risk zones (animal, cyclist, pedestrian, motorcycle)
 *
 * Query parameters:
 * - type: Filter by risk type ("ANIMAL", "CYCLIST", "PEDESTRIAN", "MOTORCYCLE")
 * - road: Filter by road number (e.g., "A-1", "N-340")
 * - severity: Filter by severity ("LOW", "MEDIUM", "HIGH", "CRITICAL")
 * - includeGeometry: Include geometry data ("true" or "false", default "true")
 */
export async function GET(request: NextRequest): Promise<NextResponse<RiskZonesAPIResponse>> {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse as NextResponse<RiskZonesAPIResponse>;

  try {
    const searchParams = request.nextUrl.searchParams;
    const filterType = searchParams.get("type");
    const filterRoad = searchParams.get("road");
    const filterSeverity = searchParams.get("severity");
    const includeGeometry = searchParams.get("includeGeometry") !== "false";

    // Build where clause
    const where: Record<string, unknown> = {};

    if (filterType) {
      where.type = filterType.toUpperCase();
    }

    if (filterRoad) {
      where.roadNumber = filterRoad;
    }

    if (filterSeverity) {
      where.severity = filterSeverity.toUpperCase();
    }

    // Fetch risk zones
    const dbZones = await prisma.riskZone.findMany({
      where,
      orderBy: [{ severity: "desc" }, { roadNumber: "asc" }, { kmStart: "asc" }],
    });

    // Transform zones
    const zones: RiskZoneResponse[] = dbZones.map((zone) => ({
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
      lastUpdated: zone.lastUpdated.toISOString(),
    }));

    // Calculate summary statistics
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const roadCounts: Record<string, number> = {};

    for (const zone of dbZones) {
      byType[zone.type] = (byType[zone.type] || 0) + 1;
      bySeverity[zone.severity] = (bySeverity[zone.severity] || 0) + 1;
      roadCounts[zone.roadNumber] = (roadCounts[zone.roadNumber] || 0) + 1;
    }

    const topRoads = Object.entries(roadCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([road, count]) => ({ road, count }));

    return NextResponse.json({
      success: true,
      data: {
        zones,
        summary: {
          total: zones.length,
          byType,
          bySeverity,
          topRoads,
        },
      },
    });
  } catch (error) {
    console.error("Risk Zones API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch risk zones" },
      { status: 500 }
    );
  }
}
