import { NextRequest, NextResponse } from "next/server";
import { fetchDGTChargers, type ChargerData } from "@/lib/parsers/chargers";
import {
  normalizeDGTProvince,
  getProvincesForCommunity,
  PROVINCE_TO_COMMUNITY,
} from "@/lib/geo/province-mapping";

// Cache the response for 5 minutes (data updates every 24h)
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
  community: string;
  operator: string | null;
  totalPowerKw: number;
  connectorCount: number;
  connectorTypes: string[];
  is24h: boolean;
  schedule: string | null;
}

interface ChargersResponse {
  count: number;
  chargers: ChargerResponseItem[];
  provinces: string[];
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filterProvince = searchParams.get("province");
    const filterCommunity = searchParams.get("community");

    const rawChargers = await fetchDGTChargers();

    // Transform and normalize province names
    let chargers: ChargerResponseItem[] = rawChargers.map((charger: ChargerData) => {
      const normalizedProvince = normalizeDGTProvince(charger.province || "");
      const community = PROVINCE_TO_COMMUNITY[normalizedProvince] || charger.community || "";

      // Extract unique connector types
      const connectorTypes = [...new Set(charger.connectors.map((c) => c.type))];

      return {
        id: charger.id,
        name: charger.name,
        lat: charger.latitude,
        lng: charger.longitude,
        address: charger.address || null,
        postalCode: charger.postalCode || null,
        city: charger.city || null,
        province: normalizedProvince || charger.province || "",
        community,
        operator: charger.operator || null,
        totalPowerKw: Math.round(charger.totalPowerKw * 10) / 10,
        connectorCount: charger.connectorCount,
        connectorTypes,
        is24h: charger.is24h,
        schedule: charger.schedule || null,
      };
    });

    // Filter by province if specified
    if (filterProvince) {
      const filterLower = filterProvince.toLowerCase();
      chargers = chargers.filter(
        (charger) => charger.province.toLowerCase() === filterLower
      );
    }

    // Filter by community if specified
    if (filterCommunity) {
      const communityProvinces = getProvincesForCommunity(filterCommunity);
      if (communityProvinces.length > 0) {
        const provincesLower = communityProvinces.map((p) => p.toLowerCase());
        chargers = chargers.filter((charger) =>
          provincesLower.includes(charger.province.toLowerCase())
        );
      }
    }

    // Extract unique provinces for filtering dropdown
    const provinces = [
      ...new Set(chargers.map((charger) => charger.province).filter(Boolean)),
    ].sort();

    const response: ChargersResponse = {
      count: chargers.length,
      chargers,
      provinces,
    };

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
