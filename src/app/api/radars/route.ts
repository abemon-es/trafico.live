import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Cache the response for 1 hour (radars are semi-static)
export const revalidate = 3600;

interface RadarResponseItem {
  id: string;
  radarId: string;
  lat: number;
  lng: number;
  road: string;
  kmPoint: number;
  direction: string | null;
  province: string;
  provinceName: string;
  type: string;
  speedLimit: number | null;
  avgSpeedPartner: string | null;
  lastUpdated: string;
}

interface RadarsResponse {
  count: number;
  radars: RadarResponseItem[];
  provinces: string[];
  roads: string[];
  types: string[];
  source: "database";
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filterProvince = searchParams.get("province");
    const filterRoad = searchParams.get("road");
    const filterType = searchParams.get("type");

    // Build where clause
    const whereClause: Record<string, unknown> = { isActive: true };

    if (filterProvince) {
      whereClause.provinceName = filterProvince;
    }

    if (filterRoad) {
      whereClause.roadNumber = filterRoad;
    }

    if (filterType) {
      // Map URL-friendly type to enum
      const typeMap: Record<string, string> = {
        "fixed": "FIXED",
        "section": "SECTION",
        "mobile": "MOBILE_ZONE",
        "traffic_light": "TRAFFIC_LIGHT",
      };
      whereClause.type = typeMap[filterType.toLowerCase()] || filterType.toUpperCase();
    }

    const dbRadars = await prisma.radar.findMany({
      where: whereClause,
      orderBy: [{ roadNumber: "asc" }, { kmPoint: "asc" }],
    });

    const radars: RadarResponseItem[] = dbRadars.map((radar) => ({
      id: radar.id,
      radarId: radar.radarId,
      lat: Number(radar.latitude),
      lng: Number(radar.longitude),
      road: radar.roadNumber,
      kmPoint: Number(radar.kmPoint),
      direction: radar.direction,
      province: radar.province || "",
      provinceName: radar.provinceName || "",
      type: radar.type,
      speedLimit: radar.speedLimit,
      avgSpeedPartner: radar.avgSpeedPartner,
      lastUpdated: radar.lastUpdated.toISOString(),
    }));

    // Extract unique values for filtering dropdowns
    const provinces = [
      ...new Set(radars.map((r) => r.provinceName).filter(Boolean)),
    ].sort();

    const roads = [
      ...new Set(radars.map((r) => r.road).filter(Boolean)),
    ].sort((a, b) => {
      // Sort roads: A-1, A-2, AP-1, N-I, etc.
      const aMatch = a.match(/^([A-Z]+)-?(\d+)/);
      const bMatch = b.match(/^([A-Z]+)-?(\d+)/);
      if (aMatch && bMatch) {
        if (aMatch[1] !== bMatch[1]) {
          return aMatch[1].localeCompare(bMatch[1]);
        }
        return parseInt(aMatch[2]) - parseInt(bMatch[2]);
      }
      return a.localeCompare(b);
    });

    const types = [
      ...new Set(radars.map((r) => r.type).filter(Boolean)),
    ].sort();

    const response: RadarsResponse = {
      count: radars.length,
      radars,
      provinces,
      roads,
      types,
      source: "database",
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching radars:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch radar data",
        count: 0,
        radars: [],
        provinces: [],
        roads: [],
        types: [],
        source: "database" as const,
      },
      { status: 500 }
    );
  }
}
