import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { getFromCache, setInCache } from "@/lib/redis";

// Cache for 5 minutes — port directory changes infrequently
export const revalidate = 300;

// Classify ports into Mediterranean regions for grouping
const REGION_PROVINCE_MAP: Record<string, string[]> = {
  "Galicia": ["15", "27", "32", "36"],
  "Cantábrico": ["33", "39", "48", "20"],
  "Atlántico Sur": ["21", "11"],
  "Mediterráneo Norte": ["17", "08", "43"],
  "Mediterráneo Central": ["12", "46", "03"],
  "Mediterráneo Sur": ["30", "04"],
  "Baleares": ["07"],
  "Canarias": ["35", "38"],
};

function getRegionForProvince(provinceCode: string): string {
  for (const [region, codes] of Object.entries(REGION_PROVINCE_MAP)) {
    if (codes.includes(provinceCode)) return region;
  }
  return "Otros";
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const searchParams = request.nextUrl.searchParams;
    const regionFilter = searchParams.get("region");
    const provinceFilter = searchParams.get("province");

    const cacheKey = `api:maritimo:ports:${regionFilter ?? "all"}:${provinceFilter ?? "all"}`;
    const cached = await getFromCache<object>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {
      port: { not: null },
    };

    if (provinceFilter) {
      where.province = provinceFilter.padStart(2, "0");
    }

    // Fetch all maritime stations with port info
    const stations = await prisma.maritimeStation.findMany({
      where,
      select: {
        id: true,
        name: true,
        port: true,
        locality: true,
        province: true,
        provinceName: true,
        latitude: true,
        longitude: true,
        priceGasoleoA: true,
        priceGasoleoB: true,
        priceGasolina95E5: true,
        priceGasolina98E5: true,
        is24h: true,
        lastPriceUpdate: true,
      },
      orderBy: [{ port: "asc" }, { name: "asc" }],
    });

    // Group stations by port and compute port-level aggregates
    const portMap = new Map<
      string,
      {
        portName: string;
        province: string | null;
        provinceName: string | null;
        region: string;
        stationCount: number;
        stations: {
          id: string;
          name: string;
          latitude: number;
          longitude: number;
          priceGasoleoA: number | null;
          priceGasoleoB: number | null;
          priceGasolina95E5: number | null;
          priceGasolina98E5: number | null;
          is24h: boolean;
          lastPriceUpdate: string;
        }[];
        avgGasoleoA: number | null;
        minGasoleoA: number | null;
      }
    >();

    for (const s of stations) {
      const portName = s.port!;
      const region = getRegionForProvince(s.province ?? "");

      if (!portMap.has(portName)) {
        portMap.set(portName, {
          portName,
          province: s.province,
          provinceName: s.provinceName,
          region,
          stationCount: 0,
          stations: [],
          avgGasoleoA: null,
          minGasoleoA: null,
        });
      }

      const entry = portMap.get(portName)!;

      // Normalize priceGasoleoB
      const rawGasoleoB = s.priceGasoleoB ? Number(s.priceGasoleoB) : null;
      const normGasoleoB = rawGasoleoB && rawGasoleoB > 10 ? rawGasoleoB / 1000 : rawGasoleoB;

      entry.stationCount++;
      entry.stations.push({
        id: s.id,
        name: s.name,
        latitude: Number(s.latitude),
        longitude: Number(s.longitude),
        priceGasoleoA: s.priceGasoleoA ? Number(s.priceGasoleoA) : null,
        priceGasoleoB: normGasoleoB,
        priceGasolina95E5: s.priceGasolina95E5 ? Number(s.priceGasolina95E5) : null,
        priceGasolina98E5: s.priceGasolina98E5 ? Number(s.priceGasolina98E5) : null,
        is24h: s.is24h,
        lastPriceUpdate: s.lastPriceUpdate.toISOString(),
      });
    }

    // Compute aggregates per port
    for (const entry of portMap.values()) {
      const prices = entry.stations
        .map((s) => s.priceGasoleoA)
        .filter((p): p is number => p !== null);
      if (prices.length > 0) {
        entry.avgGasoleoA = prices.reduce((a, b) => a + b, 0) / prices.length;
        entry.minGasoleoA = Math.min(...prices);
      }
    }

    const ports = Array.from(portMap.values());

    // Apply region filter after grouping (region is computed, not stored)
    const filteredPorts = regionFilter
      ? ports.filter((p) => p.region === regionFilter)
      : ports;

    // Build byRegion grouping
    const byRegion: Record<string, typeof filteredPorts> = {};
    for (const port of filteredPorts) {
      if (!byRegion[port.region]) byRegion[port.region] = [];
      byRegion[port.region].push(port);
    }

    const response = {
      success: true,
      ports: filteredPorts,
      byRegion,
      total: filteredPorts.length,
    };

    // Cache for 5 minutes
    await setInCache(cacheKey, response, 300);

    return NextResponse.json(response);
  } catch (error) {
    reportApiError(error, "api/maritimo/ports] Error");
    return NextResponse.json(
      { success: false, error: "Failed to fetch port directory", ports: [], byRegion: {}, total: 0 },
      { status: 500 }
    );
  }
}
