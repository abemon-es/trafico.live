import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getProvincesForCommunity,
  PROVINCE_TO_COMMUNITY,
} from "@/lib/geo/province-mapping";
import { getFromCache, setInCache } from "@/lib/redis";

const CACHE_KEY_PREFIX = "api:chargers";
const CACHE_TTL = 3600; // 1 hour — charger locations rarely change

// Cache the response for 5 minutes
export const revalidate = 300;

interface ChargerResponseItem {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  province: string;
  provinceName: string | null;
  community: string;
  operator: string | null;
  totalPowerKw: number;
  connectorCount: number;
  connectorTypes: string[];
  is24h: boolean;
  paymentMethods: string[];
}

interface ChargersResponse {
  count: number;
  chargers: ChargerResponseItem[];
  provinces: string[];
  stats?: {
    totalPowerMw: number;
    avgPowerKw: number;
    chargers24h: number;
    byType: Record<string, number>;
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Build a deterministic cache key from query params
    const paramStr = new URLSearchParams(
      [...searchParams.entries()].sort(([a], [b]) => a.localeCompare(b))
    ).toString();
    const cacheKey = paramStr ? `${CACHE_KEY_PREFIX}:${paramStr}` : CACHE_KEY_PREFIX;

    const cached = await getFromCache<ChargersResponse>(cacheKey);
    if (cached) return NextResponse.json(cached);

    const filterProvince = searchParams.get("province");
    const filterCommunity = searchParams.get("community");
    const filterCity = searchParams.get("city");
    const includeStats = searchParams.get("stats") === "true";
    const minPower = searchParams.get("minPower") ? parseFloat(searchParams.get("minPower")!) : null;
    const is24h = searchParams.get("is24h");

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // Filter by province (INE code)
    if (filterProvince) {
      where.province = filterProvince.padStart(2, "0");
    }

    // Filter by community
    if (filterCommunity && !filterProvince) {
      const communityProvinces = getProvincesForCommunity(filterCommunity);
      if (communityProvinces.length > 0) {
        // Map province names to INE codes - the getProvincesForCommunity returns names
        // We need to find the codes from the PROVINCE_TO_COMMUNITY mapping
        const provinceCodes: string[] = [];
        for (const [code, community] of Object.entries(PROVINCE_TO_COMMUNITY)) {
          if (community.toLowerCase() === filterCommunity.toLowerCase()) {
            provinceCodes.push(code);
          }
        }
        if (provinceCodes.length > 0) {
          where.province = { in: provinceCodes };
        }
      }
    }

    // Filter by city
    if (filterCity) {
      where.city = {
        contains: filterCity,
        mode: "insensitive",
      };
    }

    // Filter by minimum power
    if (minPower) {
      where.powerKw = {
        gte: minPower,
      };
    }

    // Filter by 24h availability
    if (is24h === "true") {
      where.is24h = true;
    }

    // Fetch from database
    const dbChargers = await prisma.eVCharger.findMany({
      where,
      orderBy: [
        { provinceName: "asc" },
        { city: "asc" },
      ],
    });

    // Transform to response format
    const chargers: ChargerResponseItem[] = dbChargers.map((charger) => {
      const community = charger.province ? PROVINCE_TO_COMMUNITY[charger.province] || "" : "";

      return {
        id: charger.id,
        name: charger.name,
        lat: Number(charger.latitude),
        lng: Number(charger.longitude),
        address: charger.address,
        postalCode: charger.postalCode,
        city: charger.city,
        province: charger.province || "",
        provinceName: charger.provinceName,
        community,
        operator: charger.operator,
        totalPowerKw: Math.round(Number(charger.powerKw || 0) * 10) / 10,
        connectorCount: charger.connectors || 0,
        connectorTypes: charger.chargerTypes,
        is24h: charger.is24h,
        paymentMethods: charger.paymentMethods,
      };
    });

    // Extract unique provinces for filtering dropdown
    const provinces = [
      ...new Set(chargers.map((charger) => charger.provinceName).filter(Boolean)),
    ].sort() as string[];

    const response: ChargersResponse = {
      count: chargers.length,
      chargers,
      provinces,
    };

    // Include stats if requested
    if (includeStats) {
      const totalPower = chargers.reduce((sum, c) => sum + c.totalPowerKw, 0);
      const chargers24h = chargers.filter((c) => c.is24h).length;

      const byType: Record<string, number> = {};
      for (const charger of chargers) {
        for (const type of charger.connectorTypes) {
          byType[type] = (byType[type] || 0) + 1;
        }
      }

      response.stats = {
        totalPowerMw: Math.round(totalPower / 100) / 10, // Convert to MW with 1 decimal
        avgPowerKw: chargers.length > 0 ? Math.round(totalPower / chargers.length) : 0,
        chargers24h,
        byType,
      };
    }

    await setInCache(cacheKey, response, CACHE_TTL);
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching chargers:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch charger data",
        count: 0,
        chargers: [],
        provinces: [],
      },
      { status: 500 }
    );
  }
}
