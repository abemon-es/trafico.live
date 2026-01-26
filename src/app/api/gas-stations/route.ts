import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";

// Cache for 5 minutes (prices update 3x daily)
export const revalidate = 300;

interface GasStationResponse {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string | null;
  postalCode: string | null;
  locality: string | null;
  municipality: string | null;
  province: string | null;
  provinceName: string | null;
  communityCode: string | null;
  nearestRoad: string | null;
  roadKm: number | null;
  priceGasoleoA: number | null;
  priceGasolina95E5: number | null;
  priceGasolina98E5: number | null;
  priceGLP: number | null;
  schedule: string | null;
  is24h: boolean;
  lastPriceUpdate: string;
}

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const searchParams = request.nextUrl.searchParams;

    // Filters
    const province = searchParams.get("province");
    const community = searchParams.get("community");
    const municipality = searchParams.get("municipality");
    const road = searchParams.get("road");
    const brand = searchParams.get("brand");
    const fuel = searchParams.get("fuel") || "gasoleoA";
    const is24h = searchParams.get("is24h");
    const bbox = searchParams.get("bbox"); // "minLng,minLat,maxLng,maxLat"

    // Pagination
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Sorting
    const sort = searchParams.get("sort") || "price";
    const order = searchParams.get("order") || "asc";

    // Build where clause
    const where: Record<string, unknown> = {};

    if (province) {
      where.province = province.padStart(2, "0");
    }

    if (community) {
      where.communityCode = community.padStart(2, "0");
    }

    if (municipality) {
      where.municipalityCode = municipality;
    }

    if (road) {
      where.nearestRoad = road.toUpperCase();
    }

    if (brand) {
      where.name = {
        contains: brand,
        mode: "insensitive",
      };
    }

    if (is24h === "true") {
      where.is24h = true;
    }

    // Bounding box for map (validated)
    if (bbox) {
      const parts = bbox.split(",").map(Number);
      if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
        const [minLng, minLat, maxLng, maxLat] = parts;
        // Validate coordinates are within reasonable bounds for Spain/Portugal area
        const isValidLat = (lat: number) => lat >= 27 && lat <= 44; // Canarias to Pyrenees
        const isValidLng = (lng: number) => lng >= -19 && lng <= 5; // Canarias to Balearics
        if (isValidLat(minLat) && isValidLat(maxLat) && isValidLng(minLng) && isValidLng(maxLng)) {
          where.latitude = { gte: minLat, lte: maxLat };
          where.longitude = { gte: minLng, lte: maxLng };
        }
      }
    }

    // Only stations with selected fuel
    const fuelField = `price${fuel.charAt(0).toUpperCase() + fuel.slice(1)}` as string;
    where[fuelField] = { not: null };

    // Build orderBy
    let orderBy: Record<string, string> = {};
    if (sort === "price") {
      orderBy[fuelField] = order;
    } else if (sort === "name") {
      orderBy.name = order;
    } else if (sort === "locality") {
      orderBy.locality = order;
    }

    // Fetch stations
    const [stations, total] = await Promise.all([
      prisma.gasStation.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
      }),
      prisma.gasStation.count({ where }),
    ]);

    // Transform response
    const responseStations: GasStationResponse[] = stations.map((s) => ({
      id: s.id,
      name: s.name,
      latitude: Number(s.latitude),
      longitude: Number(s.longitude),
      address: s.address,
      postalCode: s.postalCode,
      locality: s.locality,
      municipality: s.municipality,
      province: s.province,
      provinceName: s.provinceName,
      communityCode: s.communityCode,
      nearestRoad: s.nearestRoad,
      roadKm: s.roadKm ? Number(s.roadKm) : null,
      priceGasoleoA: s.priceGasoleoA ? Number(s.priceGasoleoA) : null,
      priceGasolina95E5: s.priceGasolina95E5 ? Number(s.priceGasolina95E5) : null,
      priceGasolina98E5: s.priceGasolina98E5 ? Number(s.priceGasolina98E5) : null,
      priceGLP: s.priceGLP ? Number(s.priceGLP) : null,
      schedule: s.schedule,
      is24h: s.is24h,
      lastPriceUpdate: s.lastPriceUpdate.toISOString(),
    }));

    // Get unique values for filters
    const uniqueProvinces = [...new Set(stations.map((s) => s.provinceName).filter(Boolean))];
    const uniqueBrands = [...new Set(stations.map((s) => s.name).filter(Boolean))].slice(0, 50);

    return NextResponse.json({
      success: true,
      count: responseStations.length,
      total,
      stations: responseStations,
      filters: {
        provinces: uniqueProvinces.sort(),
        brands: uniqueBrands.sort(),
      },
    });
  } catch (error) {
    console.error("Error fetching gas stations:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch gas stations", stations: [] },
      { status: 500 }
    );
  }
}
