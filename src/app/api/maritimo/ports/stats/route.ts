import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { getFromCache, setInCache } from "@/lib/redis";

// Cache for 5 minutes — port stats change infrequently
export const revalidate = 300;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PortTypeSummary {
  type: string;
  count: number;
}

interface ZoneSummary {
  zone: string;
  count: number;
}

interface PortFuelAvg {
  portSlug: string;
  portName: string;
  province: string | null;
  avgGasoleoA: number | null;
  avgGasolina95: number | null;
  stationCount: number;
}

interface PortStats {
  totalPorts: number;
  byType: PortTypeSummary[];
  byCoastalZone: ZoneSummary[];
  fuelByPort: PortFuelAvg[];
  mostStations: { portName: string; portSlug: string; count: number } | null;
  cheapestGasoleoA: {
    portName: string;
    portSlug: string;
    avgPrice: number;
  } | null;
  lastUpdated: string;
}

// ---------------------------------------------------------------------------
// GET /api/maritimo/ports/stats
// Query params: ?type=commercial|fishing|sports|mixed, ?zone=galicia, ?province=08
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const searchParams = request.nextUrl.searchParams;
    const typeFilter = searchParams.get("type");
    const zoneFilter = searchParams.get("zone");
    const provinceFilter = searchParams.get("province");

    const cacheKey = `api:maritimo:ports:stats:${typeFilter ?? "all"}:${zoneFilter ?? "all"}:${provinceFilter ?? "all"}`;
    const cached = await getFromCache<PortStats>(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, stats: cached });
    }

    // Build base where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (typeFilter) {
      where.type = typeFilter;
    }
    if (zoneFilter) {
      // Accept either exact name or lowercase slug form
      where.coastalZone = {
        // Case-insensitive contains to handle "galicia" → "Galicia"
        contains: zoneFilter,
        mode: "insensitive",
      };
    }
    if (provinceFilter) {
      where.province = provinceFilter.padStart(2, "0");
    }

    // Run queries in parallel
    const [
      totalPorts,
      byTypeRaw,
      byZoneRaw,
      allPorts,
    ] = await Promise.all([
      // Total matching ports
      prisma.spanishPort.count({ where }),

      // Group by type
      prisma.spanishPort.groupBy({
        by: ["type"],
        where,
        _count: { type: true },
        orderBy: { _count: { type: "desc" } },
      }),

      // Group by coastal zone
      prisma.spanishPort.groupBy({
        by: ["coastalZone"],
        where: { ...where, coastalZone: { not: null } },
        _count: { coastalZone: true },
        orderBy: { _count: { coastalZone: "desc" } },
      }),

      // All ports with stationCount for rankings
      prisma.spanishPort.findMany({
        where,
        select: {
          slug: true,
          name: true,
          province: true,
          stationCount: true,
        },
        orderBy: { stationCount: "desc" },
      }),
    ]);

    // Ports by type
    const byType: PortTypeSummary[] = byTypeRaw.map((row) => ({
      type: row.type,
      count: row._count.type,
    }));

    // Ports by coastal zone
    const byCoastalZone: ZoneSummary[] = byZoneRaw.map((row) => ({
      zone: row.coastalZone ?? "Desconocida",
      count: row._count.coastalZone,
    }));

    // Most stations port
    const mostStations =
      allPorts.length > 0
        ? {
            portName: allPorts[0].name,
            portSlug: allPorts[0].slug,
            count: allPorts[0].stationCount,
          }
        : null;

    // Avg fuel prices per port — aggregate from MaritimeStation grouped by port
    const portNames = allPorts.map((p) => p.name);

    const stationAggregates =
      portNames.length > 0
        ? await prisma.maritimeStation.groupBy({
            by: ["port"],
            where: {
              port: { in: portNames },
              priceGasoleoA: { not: null },
            },
            _avg: {
              priceGasoleoA: true,
              priceGasolina95E5: true,
            },
            _count: { port: true },
          })
        : [];

    // Build slug → name map for matching
    const portSlugByName = new Map<string, string>(
      allPorts.map((p) => [p.name, p.slug])
    );

    const fuelByPort: PortFuelAvg[] = stationAggregates
      .filter((agg) => agg.port !== null && agg._avg.priceGasoleoA !== null)
      .map((agg) => {
        const portName = agg.port!;
        const portInfo = allPorts.find((p) => p.name === portName);
        return {
          portSlug: portSlugByName.get(portName) ?? "",
          portName,
          province: portInfo?.province ?? null,
          avgGasoleoA: agg._avg.priceGasoleoA
            ? Number(agg._avg.priceGasoleoA)
            : null,
          avgGasolina95: agg._avg.priceGasolina95E5
            ? Number(agg._avg.priceGasolina95E5)
            : null,
          stationCount: agg._count.port,
        };
      })
      .sort((a, b) => (a.avgGasoleoA ?? 999) - (b.avgGasoleoA ?? 999));

    // Cheapest port for gasoleo A
    const cheapestGasoleoA =
      fuelByPort.length > 0 && fuelByPort[0].avgGasoleoA !== null
        ? {
            portName: fuelByPort[0].portName,
            portSlug: fuelByPort[0].portSlug,
            avgPrice: fuelByPort[0].avgGasoleoA!,
          }
        : null;

    const stats: PortStats = {
      totalPorts,
      byType,
      byCoastalZone,
      fuelByPort,
      mostStations,
      cheapestGasoleoA,
      lastUpdated: new Date().toISOString(),
    };

    // Cache for 5 minutes
    await setInCache(cacheKey, stats, 300);

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error("[api/maritimo/ports/stats] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch port statistics",
        stats: null,
      },
      { status: 500 }
    );
  }
}
