import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PROVINCE_TO_COMMUNITY } from "@/lib/geo/province-mapping";
import { applyRateLimit } from "@/lib/api-utils";

// Cache the response for 1 hour (speed limits rarely change)
export const revalidate = 3600;

interface SpeedLimitSegment {
  kmStart: number;
  kmEnd: number;
  speedLimit: number;
  speedLimitType: string;
  vehicleType: string | null;
  direction: string | null;
  isConditional: boolean;
  conditionType: string | null;
  province: string | null;
  provinceName: string | null;
}

interface RoadSpeedLimitsResponse {
  roadNumber: string;
  roadType: string | null;
  totalSegments: number;
  totalKm: number;
  defaultSpeedLimit: number;
  segments: SpeedLimitSegment[];
  summary: {
    speedLimits: Record<number, { segments: number; km: number }>;
    provinces: string[];
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roadId: string }> }
) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { roadId } = await params;
    const roadNumber = decodeURIComponent(roadId).toUpperCase();

    const searchParams = request.nextUrl.searchParams;
    const kmPoint = searchParams.get("km");
    const direction = searchParams.get("direction");
    const vehicleType = searchParams.get("vehicleType");

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      roadNumber,
    };

    // Filter by km point (find limits that include this km)
    if (kmPoint) {
      const km = parseFloat(kmPoint);
      where.kmStart = { lte: km };
      where.kmEnd = { gte: km };
    }

    // Filter by direction
    if (direction) {
      where.OR = [
        { direction: direction.toUpperCase() },
        { direction: "BOTH" },
        { direction: null },
      ];
    }

    // Filter by vehicle type
    if (vehicleType) {
      where.OR = [
        ...(where.OR || []),
        { vehicleType: vehicleType.toUpperCase() },
        { vehicleType: "ALL" },
        { vehicleType: null },
      ];
    }

    // Fetch speed limits for this road
    const dbLimits = await prisma.speedLimit.findMany({
      where,
      orderBy: [
        { kmStart: "asc" },
        { speedLimitType: "asc" },
      ],
    });

    if (dbLimits.length === 0) {
      return NextResponse.json(
        {
          error: `No speed limits found for road ${roadNumber}`,
          roadNumber,
          totalSegments: 0,
          segments: [],
        },
        { status: 404 }
      );
    }

    // Get road info if available
    const roadInfo = await prisma.road.findUnique({
      where: { id: roadNumber },
      select: { type: true, kmStart: true, kmEnd: true },
    });

    // Transform to response format
    const segments: SpeedLimitSegment[] = dbLimits.map((sl) => ({
      kmStart: Number(sl.kmStart),
      kmEnd: Number(sl.kmEnd),
      speedLimit: sl.speedLimit,
      speedLimitType: sl.speedLimitType,
      vehicleType: sl.vehicleType,
      direction: sl.direction,
      isConditional: sl.isConditional,
      conditionType: sl.conditionType,
      province: sl.province,
      provinceName: sl.provinceName,
    }));

    // Calculate summary statistics
    const speedLimits: Record<number, { segments: number; km: number }> = {};
    const provinces = new Set<string>();
    let totalKm = 0;

    for (const segment of segments) {
      const km = segment.kmEnd - segment.kmStart;
      totalKm += km;

      if (!speedLimits[segment.speedLimit]) {
        speedLimits[segment.speedLimit] = { segments: 0, km: 0 };
      }
      speedLimits[segment.speedLimit].segments += 1;
      speedLimits[segment.speedLimit].km += km;

      if (segment.provinceName) {
        provinces.add(segment.provinceName);
      }
    }

    // Round km values
    for (const limit of Object.keys(speedLimits)) {
      speedLimits[Number(limit)].km = Math.round(speedLimits[Number(limit)].km * 10) / 10;
    }

    // Determine default (most common) speed limit
    let defaultSpeedLimit = 0;
    let maxKm = 0;
    for (const [limit, stats] of Object.entries(speedLimits)) {
      if (stats.km > maxKm) {
        maxKm = stats.km;
        defaultSpeedLimit = Number(limit);
      }
    }

    const response: RoadSpeedLimitsResponse = {
      roadNumber,
      roadType: roadInfo?.type || dbLimits[0]?.roadType || null,
      totalSegments: segments.length,
      totalKm: Math.round(totalKm * 10) / 10,
      defaultSpeedLimit,
      segments,
      summary: {
        speedLimits,
        provinces: Array.from(provinces).sort(),
      },
    };

    return NextResponse.json(response, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
  } catch (error) {
    reportApiError(error, "Error fetching road speed limits");
    return NextResponse.json(
      {
        error: "Failed to fetch speed limit data",
        roadNumber: "",
        totalSegments: 0,
        segments: [],
      },
      { status: 500 }
    );
  }
}
