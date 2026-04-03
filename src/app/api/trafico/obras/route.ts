import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { getFromCache, setInCache } from "@/lib/redis";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/trafico/obras
 *
 * Active roadworks zones from DGT NAP (connected cones + roadworks feed).
 *
 * Query Parameters:
 *   - province: INE province code (e.g. "28" for Madrid)
 *   - road:     Road number filter (e.g. "A-2", "N-1")
 *   - active:   "true" | "false" | "all"  (default: true)
 *   - format:   "json" | "geojson"         (default: json)
 *   - limit:    max records returned        (default: 200)
 *
 * Cache: 10 minutes (roadworks data changes slowly).
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);

    const province = searchParams.get("province");
    const road = searchParams.get("road");
    const activeParam = searchParams.get("active") ?? "true";
    const format = (searchParams.get("format") || "json").toLowerCase();
    const limit = Math.min(parseInt(searchParams.get("limit") || "200", 10), 1000);

    // Redis cache (10 min — roadworks change slowly)
    const cacheKey = `api:obras:${province || "all"}:${road || "all"}:${activeParam}:${format}:${limit}`;
    const cached = await getFromCache<object>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=600" },
      });
    }

    // Build where clause
    const where: Prisma.RoadworksZoneWhereInput = {};

    if (activeParam !== "all") {
      where.isActive = activeParam !== "false";
    }

    if (province) {
      where.province = province;
    }

    if (road) {
      where.roadNumber = {
        contains: road.toUpperCase(),
        mode: "insensitive",
      };
    }

    const zones = await prisma.roadworksZone.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { startDate: "desc" }],
      take: limit,
      select: {
        id: true,
        sourceId: true,
        roadNumber: true,
        roadType: true,
        kmStart: true,
        kmEnd: true,
        direction: true,
        latitude: true,
        longitude: true,
        description: true,
        startDate: true,
        endDate: true,
        isActive: true,
        province: true,
        updatedAt: true,
      },
    });

    // GeoJSON format
    if (format === "geojson") {
      const geojson = {
        type: "FeatureCollection",
        features: zones.map((z) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [Number(z.longitude), Number(z.latitude)],
          },
          properties: {
            id: z.id,
            sourceId: z.sourceId,
            roadNumber: z.roadNumber,
            roadType: z.roadType,
            kmStart: z.kmStart ? Number(z.kmStart) : null,
            kmEnd: z.kmEnd ? Number(z.kmEnd) : null,
            direction: z.direction,
            description: z.description,
            startDate: z.startDate,
            endDate: z.endDate,
            isActive: z.isActive,
            province: z.province,
            updatedAt: z.updatedAt,
          },
        })),
      };
      await setInCache(cacheKey, geojson, 600);
      return NextResponse.json(geojson, {
        headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200" },
      });
    }

    // JSON format
    const active = zones.filter((z) => z.isActive).length;

    const jsonResponse = {
      success: true,
      data: {
        total: zones.length,
        active,
        filters: {
          province: province || null,
          road: road || null,
          active: activeParam,
        },
        updatedAt: new Date().toISOString(),
        zones: zones.map((z) => ({
          id: z.id,
          sourceId: z.sourceId,
          roadNumber: z.roadNumber,
          roadType: z.roadType,
          kmStart: z.kmStart ? Number(z.kmStart) : null,
          kmEnd: z.kmEnd ? Number(z.kmEnd) : null,
          direction: z.direction,
          latitude: Number(z.latitude),
          longitude: Number(z.longitude),
          description: z.description,
          startDate: z.startDate,
          endDate: z.endDate,
          isActive: z.isActive,
          province: z.province,
          updatedAt: z.updatedAt,
        })),
      },
    };
    await setInCache(cacheKey, jsonResponse, 600);
    return NextResponse.json(jsonResponse, {
      headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200" },
    });
  } catch (error) {
    reportApiError(error, "Roadworks API error");
    return NextResponse.json(
      { success: false, error: "Failed to fetch roadworks data" },
      { status: 500 }
    );
  }
}
