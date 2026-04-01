import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

interface ZBEZone {
  id: string;
  name: string;
  cityName: string;
  polygon: unknown;
  centroid: { lat: number; lng: number } | null;
  restrictions: Record<string, string>;
  schedule: Record<string, string | null> | null;
  activeAllYear: boolean;
  fineAmount: number | null;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
  sourceUrl: string | null;
  lastUpdated: Date;
}

interface ZBEResponse {
  success: boolean;
  data?: {
    zones: ZBEZone[];
    summary: {
      totalZones: number;
      activeZones: number;
      cities: string[];
    };
  };
  error?: string;
}

/**
 * GET /api/zbe
 *
 * List all ZBE (Low Emission Zones) in Spain
 *
 * Query parameters:
 * - city: Filter by city name (e.g., "Madrid", "Barcelona")
 * - active: Filter by active status ("true" or "false")
 * - includePolygons: Include polygon data in response ("true" or "false", default "true")
 */
export async function GET(request: NextRequest): Promise<NextResponse<ZBEResponse>> {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse as NextResponse<ZBEResponse>;

  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city");
    const activeParam = searchParams.get("active");
    const includePolygons = searchParams.get("includePolygons") !== "false";

    const now = new Date();

    // Build where clause
    const where: Record<string, unknown> = {};

    // Filter by city name (case-insensitive)
    if (city) {
      where.cityName = {
        contains: city,
        mode: "insensitive",
      };
    }

    // Filter by active status (based on effectiveFrom/effectiveUntil dates)
    if (activeParam === "true") {
      where.effectiveFrom = { lte: now };
      where.OR = [
        { effectiveUntil: null },
        { effectiveUntil: { gte: now } },
      ];
    } else if (activeParam === "false") {
      where.OR = [
        { effectiveFrom: { gt: now } },
        { effectiveUntil: { lt: now } },
      ];
    }

    // Select fields based on includePolygons parameter
    const select = {
      id: true,
      name: true,
      cityName: true,
      polygon: includePolygons,
      centroid: true,
      restrictions: true,
      schedule: true,
      activeAllYear: true,
      fineAmount: true,
      effectiveFrom: true,
      effectiveUntil: true,
      sourceUrl: true,
      lastUpdated: true,
    };

    // Fetch ZBE zones
    const zones = await prisma.zBEZone.findMany({
      where,
      select,
      orderBy: [{ cityName: "asc" }, { name: "asc" }],
    });

    // Get unique cities
    const allCities = await prisma.zBEZone.findMany({
      select: { cityName: true },
      distinct: ["cityName"],
    });

    // Count active zones
    const activeZonesCount = await prisma.zBEZone.count({
      where: {
        effectiveFrom: { lte: now },
        OR: [
          { effectiveUntil: null },
          { effectiveUntil: { gte: now } },
        ],
      },
    });

    // Transform zones to ensure proper typing
    const transformedZones: ZBEZone[] = zones.map((zone) => ({
      id: zone.id,
      name: zone.name,
      cityName: zone.cityName,
      polygon: includePolygons ? zone.polygon : null,
      centroid: zone.centroid as { lat: number; lng: number } | null,
      restrictions: zone.restrictions as Record<string, string>,
      schedule: zone.schedule as Record<string, string | null> | null,
      activeAllYear: zone.activeAllYear,
      fineAmount: zone.fineAmount ? Number(zone.fineAmount) : null,
      effectiveFrom: zone.effectiveFrom,
      effectiveUntil: zone.effectiveUntil,
      sourceUrl: zone.sourceUrl,
      lastUpdated: zone.lastUpdated,
    }));

    return NextResponse.json({
      success: true,
      data: {
        zones: transformedZones,
        summary: {
          totalZones: zones.length,
          activeZones: activeZonesCount,
          cities: allCities.map((c) => c.cityName).sort(),
        },
      },
    });
  } catch (error) {
    reportApiError(error, "ZBE API error");
    return NextResponse.json(
      { success: false, error: "Failed to fetch ZBE zones" },
      { status: 500 }
    );
  }
}
