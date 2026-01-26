import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Cache for 5 minutes
export const revalidate = 300;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Filters
    const province = searchParams.get("province");
    const port = searchParams.get("port");
    const is24h = searchParams.get("is24h");
    const bbox = searchParams.get("bbox");

    // Pagination
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build where clause
    const where: Record<string, unknown> = {};

    if (province) {
      where.province = province.padStart(2, "0");
    }

    if (port) {
      where.port = {
        contains: port,
        mode: "insensitive",
      };
    }

    if (is24h === "true") {
      where.is24h = true;
    }

    if (bbox) {
      const [minLng, minLat, maxLng, maxLat] = bbox.split(",").map(Number);
      where.latitude = { gte: minLat, lte: maxLat };
      where.longitude = { gte: minLng, lte: maxLng };
    }

    const [stations, total] = await Promise.all([
      prisma.maritimeStation.findMany({
        where,
        orderBy: { priceGasoleoA: "asc" },
        take: limit,
        skip: offset,
      }),
      prisma.maritimeStation.count({ where }),
    ]);

    const responseStations = stations.map((s) => ({
      id: s.id,
      name: s.name,
      latitude: Number(s.latitude),
      longitude: Number(s.longitude),
      port: s.port,
      locality: s.locality,
      province: s.province,
      provinceName: s.provinceName,
      priceGasoleoA: s.priceGasoleoA ? Number(s.priceGasoleoA) : null,
      priceGasoleoB: s.priceGasoleoB ? Number(s.priceGasoleoB) : null,
      priceGasolina95E5: s.priceGasolina95E5 ? Number(s.priceGasolina95E5) : null,
      priceGasolina98E5: s.priceGasolina98E5 ? Number(s.priceGasolina98E5) : null,
      schedule: s.schedule,
      is24h: s.is24h,
      lastPriceUpdate: s.lastPriceUpdate.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      count: responseStations.length,
      total,
      stations: responseStations,
    });
  } catch (error) {
    console.error("Error fetching maritime stations:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch maritime stations", stations: [] },
      { status: 500 }
    );
  }
}
