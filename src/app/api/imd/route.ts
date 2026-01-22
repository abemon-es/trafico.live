import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const revalidate = 3600; // Cache for 1 hour (IMD data is relatively static)

interface TrafficFlowResponse {
  id: string;
  roadNumber: string;
  roadType: string | null;
  kmStart: number;
  kmEnd: number;
  province: string | null;
  provinceName: string | null;
  year: number;
  imd: number;
  imdPesados: number | null;
  percentPesados: number | null;
}

interface IMDAPIResponse {
  success: boolean;
  data?: {
    flows: TrafficFlowResponse[];
    summary: {
      total: number;
      avgIMD: number;
      maxIMD: { road: string; km: string; imd: number } | null;
      byRoadType: Record<string, { count: number; avgIMD: number }>;
      byProvince: { province: string; avgIMD: number; segments: number }[];
      topRoads: { road: string; avgIMD: number; segments: number }[];
    };
    filters: {
      years: number[];
      roadTypes: string[];
      provinces: string[];
    };
  };
  error?: string;
}

/**
 * GET /api/imd
 *
 * Traffic flow data (IMD - Intensidad Media Diaria / Average Daily Traffic)
 *
 * Query parameters:
 * - road: Filter by road number (e.g., "A-1", "N-340")
 * - province: Filter by province code (e.g., "28" for Madrid)
 * - year: Filter by year (e.g., "2023")
 * - roadType: Filter by road type ("AUTOPISTA", "AUTOVIA", "NACIONAL", etc.)
 * - minIMD: Minimum IMD threshold
 * - maxIMD: Maximum IMD threshold
 * - limit: Maximum number of results (default 500)
 */
export async function GET(request: NextRequest): Promise<NextResponse<IMDAPIResponse>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filterRoad = searchParams.get("road");
    const filterProvince = searchParams.get("province");
    const filterYear = searchParams.get("year");
    const filterRoadType = searchParams.get("roadType");
    const minIMD = searchParams.get("minIMD");
    const maxIMD = searchParams.get("maxIMD");
    const limit = parseInt(searchParams.get("limit") || "500", 10);

    // Build where clause
    const where: Record<string, unknown> = {};

    if (filterRoad) {
      where.roadNumber = filterRoad;
    }

    if (filterProvince) {
      where.province = filterProvince;
    }

    if (filterYear) {
      where.year = parseInt(filterYear, 10);
    }

    if (filterRoadType) {
      where.roadType = filterRoadType.toUpperCase();
    }

    if (minIMD || maxIMD) {
      where.imd = {};
      if (minIMD) (where.imd as Record<string, number>).gte = parseInt(minIMD, 10);
      if (maxIMD) (where.imd as Record<string, number>).lte = parseInt(maxIMD, 10);
    }

    // Fetch traffic flow data
    const dbFlows = await prisma.trafficFlow.findMany({
      where,
      orderBy: [{ imd: "desc" }, { roadNumber: "asc" }],
      take: limit,
    });

    // Transform flows
    const flows: TrafficFlowResponse[] = dbFlows.map((flow) => ({
      id: flow.id,
      roadNumber: flow.roadNumber,
      roadType: flow.roadType,
      kmStart: Number(flow.kmStart),
      kmEnd: Number(flow.kmEnd),
      province: flow.province,
      provinceName: flow.provinceName,
      year: flow.year,
      imd: flow.imd,
      imdPesados: flow.imdPesados,
      percentPesados: flow.percentPesados ? Number(flow.percentPesados) : null,
    }));

    // Calculate summary statistics
    const totalIMD = dbFlows.reduce((sum, f) => sum + f.imd, 0);
    const avgIMD = dbFlows.length > 0 ? Math.round(totalIMD / dbFlows.length) : 0;

    // Find max IMD segment
    let maxIMDSegment: { road: string; km: string; imd: number } | null = null;
    if (dbFlows.length > 0) {
      const maxFlow = dbFlows.reduce((max, f) => (f.imd > max.imd ? f : max), dbFlows[0]);
      maxIMDSegment = {
        road: maxFlow.roadNumber,
        km: `${Number(maxFlow.kmStart)}-${Number(maxFlow.kmEnd)}`,
        imd: maxFlow.imd,
      };
    }

    // Group by road type
    const byRoadType: Record<string, { count: number; totalIMD: number }> = {};
    for (const flow of dbFlows) {
      const type = flow.roadType || "OTHER";
      if (!byRoadType[type]) {
        byRoadType[type] = { count: 0, totalIMD: 0 };
      }
      byRoadType[type].count++;
      byRoadType[type].totalIMD += flow.imd;
    }

    const byRoadTypeFormatted: Record<string, { count: number; avgIMD: number }> = {};
    for (const [type, data] of Object.entries(byRoadType)) {
      byRoadTypeFormatted[type] = {
        count: data.count,
        avgIMD: Math.round(data.totalIMD / data.count),
      };
    }

    // Group by province
    const byProvinceMap: Record<string, { name: string; count: number; totalIMD: number }> = {};
    for (const flow of dbFlows) {
      const prov = flow.province || "Unknown";
      if (!byProvinceMap[prov]) {
        byProvinceMap[prov] = { name: flow.provinceName || prov, count: 0, totalIMD: 0 };
      }
      byProvinceMap[prov].count++;
      byProvinceMap[prov].totalIMD += flow.imd;
    }

    const byProvince = Object.entries(byProvinceMap)
      .map(([, data]) => ({
        province: data.name,
        avgIMD: Math.round(data.totalIMD / data.count),
        segments: data.count,
      }))
      .sort((a, b) => b.avgIMD - a.avgIMD)
      .slice(0, 10);

    // Top roads by average IMD
    const byRoadMap: Record<string, { count: number; totalIMD: number }> = {};
    for (const flow of dbFlows) {
      if (!byRoadMap[flow.roadNumber]) {
        byRoadMap[flow.roadNumber] = { count: 0, totalIMD: 0 };
      }
      byRoadMap[flow.roadNumber].count++;
      byRoadMap[flow.roadNumber].totalIMD += flow.imd;
    }

    const topRoads = Object.entries(byRoadMap)
      .map(([road, data]) => ({
        road,
        avgIMD: Math.round(data.totalIMD / data.count),
        segments: data.count,
      }))
      .sort((a, b) => b.avgIMD - a.avgIMD)
      .slice(0, 15);

    // Get available filters
    const [yearsResult, roadTypesResult, provincesResult] = await Promise.all([
      prisma.trafficFlow.findMany({
        select: { year: true },
        distinct: ["year"],
        orderBy: { year: "desc" },
      }),
      prisma.trafficFlow.findMany({
        select: { roadType: true },
        distinct: ["roadType"],
        where: { roadType: { not: null } },
      }),
      prisma.trafficFlow.findMany({
        select: { provinceName: true },
        distinct: ["provinceName"],
        where: { provinceName: { not: null } },
        orderBy: { provinceName: "asc" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        flows,
        summary: {
          total: flows.length,
          avgIMD,
          maxIMD: maxIMDSegment,
          byRoadType: byRoadTypeFormatted,
          byProvince,
          topRoads,
        },
        filters: {
          years: yearsResult.map((y) => y.year),
          roadTypes: roadTypesResult.map((r) => r.roadType).filter(Boolean) as string[],
          provinces: provincesResult.map((p) => p.provinceName).filter(Boolean) as string[],
        },
      },
    });
  } catch (error) {
    console.error("IMD API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch traffic flow data" },
      { status: 500 }
    );
  }
}
