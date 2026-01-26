/**
 * Spanish Road Network Catalog API
 *
 * Provides access to the complete Spanish road network catalog with filtering
 * and search capabilities.
 *
 * GET /api/roads/catalog
 *   - List all roads with optional filtering by type, province, or search query
 *
 * Query Parameters:
 *   - type: Filter by road type (AUTOPISTA, AUTOVIA, NACIONAL, COMARCAL, PROVINCIAL, URBANA, OTHER)
 *   - province: Filter by province INE code (e.g., "28" for Madrid)
 *   - search: Search by road ID or name (e.g., "A-7", "mediterraneo")
 *   - limit: Maximum number of results (default: 100, max: 500)
 *   - offset: Pagination offset (default: 0)
 *   - orderBy: Sort field (id, name, totalKm, type) (default: id)
 *   - order: Sort direction (asc, desc) (default: asc)
 *
 * @example
 *   GET /api/roads/catalog?type=AUTOVIA
 *   GET /api/roads/catalog?province=28
 *   GET /api/roads/catalog?search=mediterraneo
 *   GET /api/roads/catalog?type=AUTOPISTA&orderBy=totalKm&order=desc
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { RoadType, Prisma } from "@prisma/client";

// Valid road types
const VALID_ROAD_TYPES: RoadType[] = [
  "AUTOPISTA",
  "AUTOVIA",
  "NACIONAL",
  "COMARCAL",
  "PROVINCIAL",
  "URBANA",
  "OTHER",
];

// Valid sort fields
const VALID_ORDER_BY = ["id", "name", "totalKm", "type"];

interface RoadCatalogResponse {
  success: boolean;
  data: {
    roads: Array<{
      id: string;
      name: string | null;
      type: RoadType;
      kmStart: number | null;
      kmEnd: number | null;
      totalKm: number | null;
      provinces: string[];
      provinceNames?: string[];
    }>;
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
    filters: {
      type: RoadType | null;
      province: string | null;
      search: string | null;
    };
  };
  meta: {
    generatedAt: string;
    cacheControl: string;
  };
}

interface ErrorResponse {
  success: false;
  error: string;
  details?: string;
}

// Province code to name mapping
const PROVINCE_NAMES: Record<string, string> = {
  "01": "Alava",
  "02": "Albacete",
  "03": "Alicante",
  "04": "Almeria",
  "05": "Avila",
  "06": "Badajoz",
  "07": "Baleares",
  "08": "Barcelona",
  "09": "Burgos",
  "10": "Caceres",
  "11": "Cadiz",
  "12": "Castellon",
  "13": "Ciudad Real",
  "14": "Cordoba",
  "15": "A Coruna",
  "16": "Cuenca",
  "17": "Girona",
  "18": "Granada",
  "19": "Guadalajara",
  "20": "Gipuzkoa",
  "21": "Huelva",
  "22": "Huesca",
  "23": "Jaen",
  "24": "Leon",
  "25": "Lleida",
  "26": "La Rioja",
  "27": "Lugo",
  "28": "Madrid",
  "29": "Malaga",
  "30": "Murcia",
  "31": "Navarra",
  "32": "Ourense",
  "33": "Asturias",
  "34": "Palencia",
  "35": "Las Palmas",
  "36": "Pontevedra",
  "37": "Salamanca",
  "38": "S.C. Tenerife",
  "39": "Cantabria",
  "40": "Segovia",
  "41": "Sevilla",
  "42": "Soria",
  "43": "Tarragona",
  "44": "Teruel",
  "45": "Toledo",
  "46": "Valencia",
  "47": "Valladolid",
  "48": "Bizkaia",
  "49": "Zamora",
  "50": "Zaragoza",
  "51": "Ceuta",
  "52": "Melilla",
};

export async function GET(
  request: NextRequest
): Promise<NextResponse<RoadCatalogResponse | ErrorResponse>> {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const typeParam = searchParams.get("type")?.toUpperCase();
    const province = searchParams.get("province");
    // Sanitize search: limit length and remove special characters
    const rawSearch = searchParams.get("search");
    const search = rawSearch
      ? rawSearch.slice(0, 50).replace(/[<>'"\\]/g, "").trim() || null
      : null;
    const limitParam = parseInt(searchParams.get("limit") || "100", 10);
    const offsetParam = parseInt(searchParams.get("offset") || "0", 10);
    const orderByParam = searchParams.get("orderBy") || "id";
    const orderParam = searchParams.get("order")?.toLowerCase() || "asc";

    // Validate type parameter
    let type: RoadType | null = null;
    if (typeParam) {
      if (!VALID_ROAD_TYPES.includes(typeParam as RoadType)) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid road type",
            details: `Valid types: ${VALID_ROAD_TYPES.join(", ")}`,
          },
          { status: 400 }
        );
      }
      type = typeParam as RoadType;
    }

    // Validate province parameter (2-digit INE code)
    if (province && !/^\d{2}$/.test(province)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid province code",
          details: "Province must be a 2-digit INE code (e.g., 28 for Madrid)",
        },
        { status: 400 }
      );
    }

    // Validate limit
    const limit = Math.min(Math.max(1, limitParam), 500);
    const offset = Math.max(0, offsetParam);

    // Validate orderBy
    if (!VALID_ORDER_BY.includes(orderByParam)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid orderBy field",
          details: `Valid fields: ${VALID_ORDER_BY.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validate order direction
    const order = orderParam === "desc" ? "desc" : "asc";

    // Build where clause
    const where: Prisma.RoadWhereInput = {};

    if (type) {
      where.type = type;
    }

    if (province) {
      where.provinces = {
        has: province,
      };
    }

    if (search) {
      // Search in both id and name fields (case-insensitive)
      where.OR = [
        { id: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }

    // Build orderBy clause
    const orderBy: Prisma.RoadOrderByWithRelationInput = {
      [orderByParam]: order,
    };

    // Execute queries in parallel
    const [roads, total] = await Promise.all([
      prisma.road.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
      }),
      prisma.road.count({ where }),
    ]);

    // Transform results with province names
    const roadsWithProvinceNames = roads.map((road) => ({
      id: road.id,
      name: road.name,
      type: road.type,
      kmStart: road.kmStart ? Number(road.kmStart) : null,
      kmEnd: road.kmEnd ? Number(road.kmEnd) : null,
      totalKm: road.totalKm ? Number(road.totalKm) : null,
      provinces: road.provinces,
      provinceNames: road.provinces.map(
        (code) => PROVINCE_NAMES[code] || `Unknown (${code})`
      ),
    }));

    const response: RoadCatalogResponse = {
      success: true,
      data: {
        roads: roadsWithProvinceNames,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + roads.length < total,
        },
        filters: {
          type,
          province,
          search,
        },
      },
      meta: {
        generatedAt: new Date().toISOString(),
        cacheControl: "public, max-age=86400", // Cache for 24 hours
      },
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("Error fetching road catalog:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/roads/catalog/stats - Road catalog statistics
 */
export async function HEAD(): Promise<NextResponse> {
  try {
    const stats = await prisma.road.groupBy({
      by: ["type"],
      _count: true,
      _sum: {
        totalKm: true,
      },
    });

    const total = await prisma.road.count();

    return new NextResponse(null, {
      status: 200,
      headers: {
        "X-Total-Roads": total.toString(),
        "X-Stats": JSON.stringify(stats),
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
