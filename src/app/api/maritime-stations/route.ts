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
    const port = searchParams.get("port");
    const is24h = searchParams.get("is24h");
    const bbox = searchParams.get("bbox");

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
      pageSize = Math.min(Math.max(1, parseInt(pageSizeParam || "20")), 500);
      limit = pageSize;
      offset = (page - 1) * pageSize;
    } else {
      // Legacy limit/offset pagination
      limit = Math.min(parseInt(limitParam || "100"), 500);
      offset = parseInt(offsetParam || "0");
      pageSize = limit;
      page = Math.floor(offset / limit) + 1;
    }

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

    const responseStations = stations.map((s) => {
      // Normalize priceGasoleoB: MINETUR API reports bulk pricing per 1000L for fishing ports
      // Convert to per-liter to match other fuel prices
      const gasoleoB = s.priceGasoleoB ? Number(s.priceGasoleoB) : null;
      const normalizedGasoleoB = gasoleoB && gasoleoB > 10 ? gasoleoB / 1000 : gasoleoB;

      return {
        id: s.id,
        name: s.name,
        latitude: Number(s.latitude),
        longitude: Number(s.longitude),
        port: s.port,
        locality: s.locality,
        province: s.province,
        provinceName: s.provinceName,
        priceGasoleoA: s.priceGasoleoA ? Number(s.priceGasoleoA) : null,
        priceGasoleoB: normalizedGasoleoB,
        priceGasolina95E5: s.priceGasolina95E5 ? Number(s.priceGasolina95E5) : null,
        priceGasolina98E5: s.priceGasolina98E5 ? Number(s.priceGasolina98E5) : null,
        schedule: s.schedule,
        is24h: s.is24h,
        lastPriceUpdate: s.lastPriceUpdate.toISOString(),
      };
    });

    // Calculate pagination
    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      success: true,
      data: responseStations,
      pagination: {
        total,
        page,
        pageSize,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching maritime stations:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch maritime stations", data: [], pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 } },
      { status: 500 }
    );
  }
}
