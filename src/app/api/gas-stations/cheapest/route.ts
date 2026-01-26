import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";

// Cache for 5 minutes
export const revalidate = 300;

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const searchParams = request.nextUrl.searchParams;

    // Filters
    const province = searchParams.get("province");
    const community = searchParams.get("community");
    const road = searchParams.get("road");
    const fuel = searchParams.get("fuel") || "gasoleoA";
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);

    // Build where clause
    const where: Record<string, unknown> = {};

    if (province) {
      where.province = province.padStart(2, "0");
    }

    if (community) {
      where.communityCode = community.padStart(2, "0");
    }

    if (road) {
      where.nearestRoad = road.toUpperCase();
    }

    // Get cheapest for diesel
    const cheapestDiesel = await prisma.gasStation.findMany({
      where: {
        ...where,
        priceGasoleoA: { not: null },
      },
      orderBy: { priceGasoleoA: "asc" },
      take: limit,
    });

    // Get cheapest for gasoline 95
    const cheapestGas95 = await prisma.gasStation.findMany({
      where: {
        ...where,
        priceGasolina95E5: { not: null },
      },
      orderBy: { priceGasolina95E5: "asc" },
      take: limit,
    });

    // Get cheapest for gasoline 98
    const cheapestGas98 = await prisma.gasStation.findMany({
      where: {
        ...where,
        priceGasolina98E5: { not: null },
      },
      orderBy: { priceGasolina98E5: "asc" },
      take: limit,
    });

    // Get cheapest for GLP
    const cheapestGLP = await prisma.gasStation.findMany({
      where: {
        ...where,
        priceGLP: { not: null },
      },
      orderBy: { priceGLP: "asc" },
      take: limit,
    });

    const transform = (stations: typeof cheapestDiesel) =>
      stations.map((s) => ({
        id: s.id,
        name: s.name,
        latitude: Number(s.latitude),
        longitude: Number(s.longitude),
        address: s.address,
        locality: s.locality,
        municipality: s.municipality,
        province: s.province,
        provinceName: s.provinceName,
        nearestRoad: s.nearestRoad,
        roadKm: s.roadKm ? Number(s.roadKm) : null,
        priceGasoleoA: s.priceGasoleoA ? Number(s.priceGasoleoA) : null,
        priceGasolina95E5: s.priceGasolina95E5 ? Number(s.priceGasolina95E5) : null,
        priceGasolina98E5: s.priceGasolina98E5 ? Number(s.priceGasolina98E5) : null,
        priceGLP: s.priceGLP ? Number(s.priceGLP) : null,
        schedule: s.schedule,
        is24h: s.is24h,
      }));

    return NextResponse.json({
      success: true,
      cheapest: {
        gasoleoA: transform(cheapestDiesel),
        gasolina95E5: transform(cheapestGas95),
        gasolina98E5: transform(cheapestGas98),
        glp: transform(cheapestGLP),
      },
    });
  } catch (error) {
    console.error("Error fetching cheapest gas stations:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch cheapest gas stations" },
      { status: 500 }
    );
  }
}
