import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PROVINCE_TO_COMMUNITY } from "@/lib/geo/province-mapping";
import { applyRateLimit } from "@/lib/api-utils";

// Cache the response for 1 hour (speed limits rarely change)
export const revalidate = 3600;

interface SpeedLimitResponseItem {
  id: string;
  roadNumber: string;
  roadType: string | null;
  kmStart: number;
  kmEnd: number;
  speedLimit: number;
  speedLimitType: string;
  vehicleType: string | null;
  laneType: string | null;
  direction: string | null;
  isConditional: boolean;
  conditionType: string | null;
  timeStart: string | null;
  timeEnd: string | null;
  weatherType: string | null;
  province: string | null;
  provinceName: string | null;
  community: string | null;
  coordinates?: {
    start?: { lat: number; lng: number };
    end?: { lat: number; lng: number };
  };
}

interface SpeedLimitsResponse {
  count: number;
  limits: SpeedLimitResponseItem[];
  stats?: {
    bySpeedLimit: Record<number, number>;
    byRoadType: Record<string, number>;
    byLimitType: Record<string, number>;
    avgSpeedLimit: number;
  };
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const searchParams = request.nextUrl.searchParams;

    // Filter parameters
    const roadNumber = searchParams.get("road");
    const filterProvince = searchParams.get("province");
    const filterSpeedLimit = searchParams.get("speedLimit");
    const filterRoadType = searchParams.get("roadType");
    const filterLimitType = searchParams.get("limitType");
    const filterVehicleType = searchParams.get("vehicleType");
    const kmPoint = searchParams.get("km");
    const includeStats = searchParams.get("stats") === "true";
    const limit = parseInt(searchParams.get("limit") || "1000", 10);

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // Filter by road number
    if (roadNumber) {
      where.roadNumber = roadNumber.toUpperCase();
    }

    // Filter by province
    if (filterProvince) {
      where.province = filterProvince.padStart(2, "0");
    }

    // Filter by speed limit value
    if (filterSpeedLimit) {
      where.speedLimit = parseInt(filterSpeedLimit, 10);
    }

    // Filter by road type
    if (filterRoadType) {
      where.roadType = filterRoadType.toUpperCase();
    }

    // Filter by limit type (GENERAL, URBAN, etc.)
    if (filterLimitType) {
      where.speedLimitType = filterLimitType.toUpperCase();
    }

    // Filter by vehicle type
    if (filterVehicleType) {
      where.vehicleType = filterVehicleType.toUpperCase();
    }

    // Filter by km point (find limits that include this km)
    if (kmPoint && roadNumber) {
      const km = parseFloat(kmPoint);
      where.kmStart = { lte: km };
      where.kmEnd = { gte: km };
    }

    // Fetch from database
    const dbLimits = await prisma.speedLimit.findMany({
      where,
      orderBy: [
        { roadNumber: "asc" },
        { kmStart: "asc" },
      ],
      take: Math.min(limit, 5000), // Cap at 5000 results
    });

    // Transform to response format
    const limits: SpeedLimitResponseItem[] = dbLimits.map((sl) => {
      const community = sl.province ? PROVINCE_TO_COMMUNITY[sl.province] || null : null;

      const item: SpeedLimitResponseItem = {
        id: sl.id,
        roadNumber: sl.roadNumber,
        roadType: sl.roadType,
        kmStart: Number(sl.kmStart),
        kmEnd: Number(sl.kmEnd),
        speedLimit: sl.speedLimit,
        speedLimitType: sl.speedLimitType,
        vehicleType: sl.vehicleType,
        laneType: sl.laneType,
        direction: sl.direction,
        isConditional: sl.isConditional,
        conditionType: sl.conditionType,
        timeStart: sl.timeStart,
        timeEnd: sl.timeEnd,
        weatherType: sl.weatherType,
        province: sl.province,
        provinceName: sl.provinceName,
        community,
      };

      // Include coordinates if available
      if (sl.startLat && sl.startLng) {
        item.coordinates = {
          start: { lat: Number(sl.startLat), lng: Number(sl.startLng) },
        };
        if (sl.endLat && sl.endLng) {
          item.coordinates.end = { lat: Number(sl.endLat), lng: Number(sl.endLng) };
        }
      }

      return item;
    });

    const response: SpeedLimitsResponse = {
      count: limits.length,
      limits,
    };

    // Include stats if requested
    if (includeStats) {
      const bySpeedLimit: Record<number, number> = {};
      const byRoadType: Record<string, number> = {};
      const byLimitType: Record<string, number> = {};
      let totalSpeed = 0;

      for (const limit of limits) {
        bySpeedLimit[limit.speedLimit] = (bySpeedLimit[limit.speedLimit] || 0) + 1;
        byRoadType[limit.roadType || "UNKNOWN"] = (byRoadType[limit.roadType || "UNKNOWN"] || 0) + 1;
        byLimitType[limit.speedLimitType] = (byLimitType[limit.speedLimitType] || 0) + 1;
        totalSpeed += limit.speedLimit;
      }

      response.stats = {
        bySpeedLimit,
        byRoadType,
        byLimitType,
        avgSpeedLimit: limits.length > 0 ? Math.round(totalSpeed / limits.length) : 0,
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching speed limits:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch speed limit data",
        count: 0,
        limits: [],
      },
      { status: 500 }
    );
  }
}
