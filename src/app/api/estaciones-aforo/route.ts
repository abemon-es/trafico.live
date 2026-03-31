import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Prisma, StationType } from "@prisma/client";

export const revalidate = 3600;

/**
 * GET /api/estaciones-aforo
 *
 * Traffic counting stations catalog from the Ministry of Transport.
 *
 * Query Parameters:
 *   - province: INE 2-digit code (e.g., "28" for Madrid)
 *   - road: Road number (e.g., "A-1")
 *   - type: Station type (PERMANENT, SEMI_PERMANENT, PRIMARY, SECONDARY, COVERAGE)
 *   - year: Data year (default: latest available)
 *   - minIMD / maxIMD: IMD range filter
 *   - limit: Max records (default 500, max 3000)
 *   - offset: Pagination offset
 *   - format: "geojson" for GeoJSON FeatureCollection output
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const province = searchParams.get("province");
    const road = searchParams.get("road");
    const type = searchParams.get("type");
    const year = searchParams.get("year");
    const minIMD = searchParams.get("minIMD");
    const maxIMD = searchParams.get("maxIMD");
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");
    const format = searchParams.get("format");

    const limit = Math.min(parseInt(limitParam || "500", 10), 3000);
    const offset = parseInt(offsetParam || "0", 10);

    const where: Prisma.TrafficStationWhereInput = {};

    if (province) where.province = province;
    if (road) where.roadNumber = { contains: road.toUpperCase(), mode: "insensitive" };
    if (type && Object.values(StationType).includes(type as StationType)) {
      where.stationType = type as StationType;
    }
    if (year) {
      where.year = parseInt(year, 10);
    }

    if (minIMD || maxIMD) {
      where.imd = {};
      if (minIMD) where.imd.gte = parseInt(minIMD, 10);
      if (maxIMD) where.imd.lte = parseInt(maxIMD, 10);
    }

    // Exclude null-island stations (lat=0 means no coordinates available)
    where.NOT = { latitude: 0 };

    const [stations, totalCount] = await Promise.all([
      prisma.trafficStation.findMany({
        where,
        orderBy: [{ imd: "desc" }],
        take: limit,
        skip: offset,
      }),
      prisma.trafficStation.count({ where }),
    ]);

    // GeoJSON output
    if (format === "geojson") {
      return NextResponse.json({
        type: "FeatureCollection",
        features: stations.map((s) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [Number(s.longitude), Number(s.latitude)],
          },
          properties: {
            id: s.id,
            stationCode: s.stationCode,
            roadNumber: s.roadNumber,
            roadType: s.roadType,
            kmPoint: Number(s.kmPoint),
            stationType: s.stationType,
            province: s.province,
            provinceName: s.provinceName,
            population: s.population,
            year: s.year,
            imd: s.imd,
            imdLigeros: s.imdLigeros,
            imdPesados: s.imdPesados,
            percentPesados: s.percentPesados ? Number(s.percentPesados) : null,
          },
        })),
      });
    }

    // Summary stats — parallelized
    const [stats, stationTypes] = await Promise.all([
      prisma.trafficStation.aggregate({
        where,
        _count: { id: true },
        _avg: { imd: true },
        _max: { imd: true },
        _min: { imd: true },
      }),
      prisma.trafficStation.groupBy({
        by: ["stationType"],
        where,
        _count: { id: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        stations: stations.map((s) => ({
          id: s.id,
          stationCode: s.stationCode,
          province: s.province,
          provinceName: s.provinceName,
          roadNumber: s.roadNumber,
          roadType: s.roadType,
          kmPoint: Number(s.kmPoint),
          stationType: s.stationType,
          lanes: s.lanes,
          population: s.population,
          latitude: Number(s.latitude),
          longitude: Number(s.longitude),
          year: s.year,
          imd: s.imd,
          imdLigeros: s.imdLigeros,
          imdPesados: s.imdPesados,
          percentPesados: s.percentPesados ? Number(s.percentPesados) : null,
          daysRecorded: s.daysRecorded,
        })),
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + stations.length < totalCount,
        },
        stats: {
          totalStations: stats._count.id,
          avgIMD: Math.round(stats._avg.imd || 0),
          maxIMD: stats._max.imd,
          minIMD: stats._min.imd,
          byType: Object.fromEntries(
            stationTypes.map((t) => [t.stationType || "UNKNOWN", t._count.id])
          ),
        },
      },
    });
  } catch (error) {
    console.error("Estaciones aforo API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch counting stations" },
      { status: 500 }
    );
  }
}
