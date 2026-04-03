import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { getFromCache, setInCache } from "@/lib/redis";

const CACHE_KEY_PREFIX = "api:gas-stations";
const CACHE_TTL = 300; // 5 minutes — prices update 3x/day

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
  priceGasoleoB: number | null;
  priceGasolina95E5: number | null;
  priceGasolina95E10: number | null;
  priceGasolina98E5: number | null;
  priceGasolina98E10: number | null;
  priceGLP: number | null;
  priceGNC: number | null;
  priceGNL: number | null;
  priceHidrogeno: number | null;
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
    const includeRestricted = searchParams.get("includeRestricted") === "true";
    const bbox = searchParams.get("bbox"); // "minLng,minLat,maxLng,maxLat"

    // Pagination - support both page/pageSize and limit/offset
    const pageParam = searchParams.get("page");
    const pageSizeParam = searchParams.get("pageSize");
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");

    let limit: number;
    let offset: number;
    let page: number;
    let pageSize: number;

    if (pageParam || pageSizeParam) {
      // Page-based pagination
      page = Math.max(1, parseInt(pageParam || "1"));
      pageSize = Math.min(Math.max(1, parseInt(pageSizeParam || "20")), 1000);
      limit = pageSize;
      offset = (page - 1) * pageSize;
    } else {
      // Legacy limit/offset pagination
      limit = Math.min(parseInt(limitParam || "100"), 1000);
      offset = parseInt(offsetParam || "0");
      pageSize = limit;
      page = Math.floor(offset / limit) + 1;
    }

    // Sorting
    const sort = searchParams.get("sort") || "name";
    const order = searchParams.get("order") || "asc";

    // Cache key — sorted params for determinism
    const paramStr = Array.from(searchParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("&");
    const cacheKey = paramStr ? `${CACHE_KEY_PREFIX}:${paramStr}` : CACHE_KEY_PREFIX;
    const cached = await getFromCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    // Build where clause
    const where: Record<string, unknown> = {};

    // Default: only public stations (exclude restricted/wholesale depots)
    if (!includeRestricted) {
      where.OR = [
        { saleType: "P" },
        { saleType: null },
      ];
    }

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
      priceGasoleoB: s.priceGasoleoB ? Number(s.priceGasoleoB) : null,
      priceGasolina95E5: s.priceGasolina95E5 ? Number(s.priceGasolina95E5) : null,
      priceGasolina95E10: s.priceGasolina95E10 ? Number(s.priceGasolina95E10) : null,
      priceGasolina98E5: s.priceGasolina98E5 ? Number(s.priceGasolina98E5) : null,
      priceGasolina98E10: s.priceGasolina98E10 ? Number(s.priceGasolina98E10) : null,
      priceGLP: s.priceGLP ? Number(s.priceGLP) : null,
      priceGNC: s.priceGNC ? Number(s.priceGNC) : null,
      priceGNL: s.priceGNL ? Number(s.priceGNL) : null,
      priceHidrogeno: s.priceHidrogeno ? Number(s.priceHidrogeno) : null,
      schedule: s.schedule,
      is24h: s.is24h,
      lastPriceUpdate: s.lastPriceUpdate.toISOString(),
    }));

    // Get unique values for filters
    const uniqueProvinces = [...new Set(stations.map((s) => s.provinceName).filter(Boolean))];
    const uniqueBrands = [...new Set(stations.map((s) => s.name).filter(Boolean))].slice(0, 50);

    // Calculate pagination
    const totalPages = Math.ceil(total / pageSize);

    const responseData = {
      success: true,
      data: responseStations,
      pagination: {
        total,
        page,
        pageSize,
        totalPages,
      },
      filters: {
        provinces: uniqueProvinces.sort(),
        brands: uniqueBrands.sort(),
      },
    };

    await setInCache(cacheKey, responseData, CACHE_TTL);
    return NextResponse.json(responseData);
  } catch (error) {
    reportApiError(error, "Error fetching gas stations");
    return NextResponse.json(
      { success: false, error: "Failed to fetch gas stations", data: [], pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 } },
      { status: 500 }
    );
  }
}
