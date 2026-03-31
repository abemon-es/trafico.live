import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { RoadType, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // Cache for 1 hour

/**
 * GET /api/trafico/imd
 *
 * Query IMD (Intensidad Media Diaria) traffic flow data
 *
 * Query Parameters:
 *   - year: Filter by year (e.g., 2023)
 *   - province: Filter by province INE code (e.g., "28" for Madrid)
 *   - roadNumber: Filter by road number (e.g., "A-1", "M-30")
 *   - roadType: Filter by road type (AUTOPISTA, AUTOVIA, NACIONAL, COMARCAL, PROVINCIAL, OTHER)
 *   - minIMD: Minimum IMD value
 *   - maxIMD: Maximum IMD value
 *   - limit: Maximum number of records (default 100, max 1000)
 *   - offset: Pagination offset
 *   - groupBy: Group results by "year", "province", "road", or "roadType"
 *
 * Examples:
 *   GET /api/trafico/imd?year=2023&province=28
 *   GET /api/trafico/imd?roadNumber=A-1&limit=50
 *   GET /api/trafico/imd?groupBy=province&year=2023
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const year = searchParams.get("year");
    const province = searchParams.get("province");
    const roadNumber = searchParams.get("roadNumber");
    const roadType = searchParams.get("roadType");
    const minIMD = searchParams.get("minIMD");
    const maxIMD = searchParams.get("maxIMD");
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");
    const groupBy = searchParams.get("groupBy");

    // Pagination
    const limit = Math.min(parseInt(limitParam || "100", 10), 1000);
    const offset = parseInt(offsetParam || "0", 10);

    // Build where clause
    const where: Prisma.TrafficFlowWhereInput = {};

    if (year) where.year = parseInt(year, 10);
    if (province) where.province = province;
    if (roadNumber)
      where.roadNumber = { contains: roadNumber.toUpperCase(), mode: "insensitive" };
    if (roadType && Object.values(RoadType).includes(roadType as RoadType)) {
      where.roadType = roadType as RoadType;
    }

    // IMD range filtering
    if (minIMD || maxIMD) {
      where.imd = {};
      if (minIMD) where.imd.gte = parseInt(minIMD, 10);
      if (maxIMD) where.imd.lte = parseInt(maxIMD, 10);
    }

    // Handle groupBy aggregations
    if (groupBy) {
      return handleGroupedQuery(groupBy, where);
    }

    // Get total count for pagination
    const totalCount = await prisma.trafficFlow.count({ where });

    // Fetch records
    const records = await prisma.trafficFlow.findMany({
      where,
      orderBy: [{ year: "desc" }, { imd: "desc" }],
      take: limit,
      skip: offset,
    });

    // Calculate statistics
    const stats = await calculateStats(where);

    return NextResponse.json({
      success: true,
      data: {
        records: records.map(formatRecord),
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + records.length < totalCount,
        },
        stats,
      },
    });
  } catch (error) {
    console.error("IMD API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch IMD data" },
      { status: 500 }
    );
  }
}

/**
 * Handle grouped aggregation queries
 */
async function handleGroupedQuery(
  groupBy: string,
  where: Prisma.TrafficFlowWhereInput
): Promise<NextResponse> {
  switch (groupBy) {
    case "year": {
      const grouped = await prisma.trafficFlow.groupBy({
        by: ["year"],
        where,
        _count: { id: true },
        _avg: { imd: true, percentPesados: true },
        _sum: { imd: true },
        _max: { imd: true },
        _min: { imd: true },
        orderBy: { year: "asc" },
      });

      return NextResponse.json({
        success: true,
        data: {
          groupBy: "year",
          results: grouped.map((g) => ({
            year: g.year,
            recordCount: g._count.id,
            avgIMD: Math.round(g._avg.imd || 0),
            totalIMD: g._sum.imd,
            maxIMD: g._max.imd,
            minIMD: g._min.imd,
            avgPercentPesados: g._avg.percentPesados
              ? Math.round(Number(g._avg.percentPesados) * 100) / 100
              : null,
          })),
        },
      });
    }

    case "province": {
      const grouped = await prisma.trafficFlow.groupBy({
        by: ["province", "provinceName"],
        where,
        _count: { id: true },
        _avg: { imd: true, percentPesados: true },
        _max: { imd: true },
        orderBy: { _avg: { imd: "desc" } },
      });

      return NextResponse.json({
        success: true,
        data: {
          groupBy: "province",
          results: grouped
            .filter((g) => g.province)
            .map((g) => ({
              province: g.province,
              provinceName: g.provinceName,
              recordCount: g._count.id,
              avgIMD: Math.round(g._avg.imd || 0),
              maxIMD: g._max.imd,
              avgPercentPesados: g._avg.percentPesados
                ? Math.round(Number(g._avg.percentPesados) * 100) / 100
                : null,
            })),
        },
      });
    }

    case "road": {
      const grouped = await prisma.trafficFlow.groupBy({
        by: ["roadNumber", "roadType"],
        where,
        _count: { id: true },
        _avg: { imd: true, percentPesados: true },
        _max: { imd: true },
        orderBy: { _avg: { imd: "desc" } },
        take: 50, // Top 50 roads
      });

      return NextResponse.json({
        success: true,
        data: {
          groupBy: "road",
          results: grouped.map((g) => ({
            roadNumber: g.roadNumber,
            roadType: g.roadType,
            segmentCount: g._count.id,
            avgIMD: Math.round(g._avg.imd || 0),
            maxIMD: g._max.imd,
            avgPercentPesados: g._avg.percentPesados
              ? Math.round(Number(g._avg.percentPesados) * 100) / 100
              : null,
          })),
        },
      });
    }

    case "roadType": {
      const grouped = await prisma.trafficFlow.groupBy({
        by: ["roadType"],
        where,
        _count: { id: true },
        _avg: { imd: true, percentPesados: true },
        _max: { imd: true },
        _min: { imd: true },
        orderBy: { _avg: { imd: "desc" } },
      });

      return NextResponse.json({
        success: true,
        data: {
          groupBy: "roadType",
          results: grouped.map((g) => ({
            roadType: g.roadType || "UNKNOWN",
            recordCount: g._count.id,
            avgIMD: Math.round(g._avg.imd || 0),
            maxIMD: g._max.imd,
            minIMD: g._min.imd,
            avgPercentPesados: g._avg.percentPesados
              ? Math.round(Number(g._avg.percentPesados) * 100) / 100
              : null,
          })),
        },
      });
    }

    default:
      return NextResponse.json(
        {
          success: false,
          error: `Invalid groupBy value: ${groupBy}. Use 'year', 'province', 'road', or 'roadType'`,
        },
        { status: 400 }
      );
  }
}

/**
 * Calculate summary statistics
 */
async function calculateStats(where: Prisma.TrafficFlowWhereInput) {
  const [totalRecords, yearRange, roadCount, avgIMD] = await Promise.all([
    prisma.trafficFlow.count({ where }),
    prisma.trafficFlow.aggregate({
      where,
      _min: { year: true },
      _max: { year: true },
    }),
    prisma.trafficFlow.groupBy({
      by: ["roadNumber"],
      where,
    }),
    prisma.trafficFlow.aggregate({
      where,
      _avg: { imd: true, percentPesados: true },
      _max: { imd: true },
      _min: { imd: true },
    }),
  ]);

  return {
    totalRecords,
    yearRange: {
      min: yearRange._min.year,
      max: yearRange._max.year,
    },
    uniqueRoads: roadCount.length,
    avgIMD: Math.round(avgIMD._avg.imd || 0),
    maxIMD: avgIMD._max.imd,
    minIMD: avgIMD._min.imd,
    avgPercentPesados: avgIMD._avg.percentPesados
      ? Math.round(Number(avgIMD._avg.percentPesados) * 100) / 100
      : null,
  };
}

/**
 * Format a record for API response
 */
function formatRecord(record: {
  id: string;
  roadNumber: string;
  roadType: string | null;
  kmStart: unknown;
  kmEnd: unknown;
  province: string | null;
  provinceName: string | null;
  year: number;
  imd: number;
  imdLigeros: number | null;
  imdPesados: number | null;
  percentPesados: unknown;
  vhKmTotal: unknown;
  vhKmLigeros: unknown;
  vhKmPesados: unknown;
  segmentLength: unknown;
  sourceId: number | null;
}) {
  return {
    id: record.id,
    roadNumber: record.roadNumber,
    roadType: record.roadType,
    kmStart: Number(record.kmStart),
    kmEnd: Number(record.kmEnd),
    province: record.province,
    provinceName: record.provinceName,
    year: record.year,
    imd: record.imd,
    imdLigeros: record.imdLigeros,
    imdPesados: record.imdPesados,
    percentPesados: record.percentPesados ? Number(record.percentPesados) : null,
    vhKmTotal: record.vhKmTotal ? Number(record.vhKmTotal) : null,
    vhKmLigeros: record.vhKmLigeros ? Number(record.vhKmLigeros) : null,
    vhKmPesados: record.vhKmPesados ? Number(record.vhKmPesados) : null,
    segmentLength: record.segmentLength
      ? Number(record.segmentLength)
      : Math.round((Number(record.kmEnd) - Number(record.kmStart)) * 100) / 100,
    trafficCategory: categorizeTraffic(record.imd),
  };
}

/**
 * Categorize traffic volume
 */
function categorizeTraffic(imd: number): string {
  if (imd >= 100000) return "MUY_ALTO"; // Very high (urban highways)
  if (imd >= 50000) return "ALTO"; // High
  if (imd >= 20000) return "MEDIO_ALTO"; // Medium-high
  if (imd >= 10000) return "MEDIO"; // Medium
  if (imd >= 5000) return "MEDIO_BAJO"; // Medium-low
  if (imd >= 1000) return "BAJO"; // Low
  return "MUY_BAJO"; // Very low
}
