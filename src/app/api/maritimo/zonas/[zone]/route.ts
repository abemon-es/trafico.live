/**
 * Maritime Coastal Zone API
 *
 * Returns zone metadata, active vessels, ports, and weather alerts
 * for a specific coastal zone defined by geographic bounding box.
 *
 * GET /api/maritimo/zonas/[zone]
 *   zone: galicia|cantabrico|golfo-vizcaya|mediterraneo-norte|baleares|
 *         mediterraneo-central|mediterraneo-sur|estrecho|golfo-cadiz|
 *         atlantico-sur|canarias
 */

import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { getFromCache, setInCache } from "@/lib/redis";

export const revalidate = 300;

// ---------------------------------------------------------------------------
// Zone definitions
// ---------------------------------------------------------------------------

const ZONES: Record<
  string,
  { label: string; bbox: [number, number, number, number]; provinces: string[] }
> = {
  galicia: {
    label: "Galicia",
    bbox: [-9.3, 41.8, -7.0, 43.8],
    provinces: ["15", "27", "32", "36"],
  },
  cantabrico: {
    label: "Cantabrico",
    bbox: [-7.0, 43.2, -1.7, 44.0],
    provinces: ["33", "39", "48", "20"],
  },
  "golfo-vizcaya": {
    label: "Golfo de Vizcaya",
    bbox: [-4.0, 43.3, -1.0, 44.5],
    provinces: ["48", "20"],
  },
  "mediterraneo-norte": {
    label: "Mediterraneo Norte",
    bbox: [0.5, 40.5, 3.5, 42.5],
    provinces: ["08", "17", "43"],
  },
  baleares: {
    label: "Baleares",
    bbox: [1.0, 38.5, 4.5, 40.5],
    provinces: ["07"],
  },
  "mediterraneo-central": {
    label: "Mediterraneo Central",
    bbox: [-1.0, 37.5, 1.0, 40.5],
    provinces: ["46", "12", "03"],
  },
  "mediterraneo-sur": {
    label: "Mediterraneo Sur",
    bbox: [-5.5, 35.8, -1.0, 37.5],
    provinces: ["29", "18", "04", "30"],
  },
  estrecho: {
    label: "Estrecho de Gibraltar",
    bbox: [-6.0, 35.5, -5.0, 36.5],
    provinces: ["11"],
  },
  "golfo-cadiz": {
    label: "Golfo de Cadiz",
    bbox: [-7.5, 36.0, -6.0, 37.5],
    provinces: ["11", "21"],
  },
  "atlantico-sur": {
    label: "Atlantico Sur",
    bbox: [-7.5, 36.5, -6.0, 37.5],
    provinces: ["21", "11"],
  },
  canarias: {
    label: "Canarias",
    bbox: [-18.5, 27.5, -13.0, 29.5],
    provinces: ["35", "38"],
  },
};

// Ship type classification (ITU-R M.1371)
function getShipCategory(shipType: number | null): string {
  if (shipType == null) return "desconocido";
  if (shipType >= 70 && shipType <= 79) return "cargo";
  if (shipType >= 80 && shipType <= 89) return "tanker";
  if (shipType === 31 || shipType === 32) return "tug";
  if (shipType === 36 || shipType === 37) return "sailing";
  if (shipType >= 30 && shipType <= 39) return "fishing";
  if (shipType >= 60 && shipType <= 69) return "passenger";
  return "otro";
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ zone: string }> }
) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { zone: slug } = await params;
    const zone = ZONES[slug];

    if (!zone) {
      return NextResponse.json(
        { success: false, error: "Zona no encontrada" },
        { status: 404 }
      );
    }

    // Check Redis cache (5 min)
    const cacheKey = `api:maritimo:zonas:${slug}`;
    const cached = await getFromCache<object>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
        },
      });
    }

    const [minLng, minLat, maxLng, maxLat] = zone.bbox;
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    // Parallel queries: vessels, ports, weather alerts
    const [vessels, ports, weatherAlerts] = await Promise.all([
      // 1. Vessels in zone (distinct by mmsi, last 2h)
      prisma.vesselPosition.findMany({
        where: {
          latitude: { gte: minLat, lte: maxLat },
          longitude: { gte: minLng, lte: maxLng },
          createdAt: { gte: twoHoursAgo },
        },
        include: { vessel: true },
        distinct: ["mmsi"],
        orderBy: { createdAt: "desc" },
        take: 200,
      }),

      // 2. Ports in zone (by province)
      prisma.spanishPort.findMany({
        where: {
          province: { in: zone.provinces },
        },
        orderBy: { name: "asc" },
      }),

      // 3. Active weather alerts for zone provinces
      prisma.weatherAlert.findMany({
        where: {
          province: { in: zone.provinces },
          isActive: true,
          type: { in: ["COASTAL", "STORM", "WIND"] },
        },
        orderBy: [{ severity: "desc" }, { startedAt: "desc" }],
        select: {
          id: true,
          alertId: true,
          type: true,
          severity: true,
          province: true,
          provinceName: true,
          description: true,
          startedAt: true,
          endedAt: true,
          waveHeightM: true,
          windSpeedKmh: true,
        },
      }),
    ]);

    // Classify vessels by type
    const vesselsByType: Record<string, number> = {};
    const vesselList = vessels.map((vp) => {
      const category = getShipCategory(vp.vessel?.shipType ?? null);
      vesselsByType[category] = (vesselsByType[category] || 0) + 1;

      return {
        mmsi: vp.mmsi,
        name: vp.vessel?.name ?? null,
        shipType: vp.vessel?.shipType ?? null,
        category,
        flag: vp.vessel?.flag ?? null,
        length: vp.vessel?.length ?? null,
        destination: vp.vessel?.destination ?? null,
        latitude: Number(vp.latitude),
        longitude: Number(vp.longitude),
        sog: vp.sog,
        cog: vp.cog,
        heading: vp.heading,
        navStatus: vp.navStatus,
        updatedAt: vp.createdAt.toISOString(),
      };
    });

    // Sort by speed (descending), name as tiebreaker
    vesselList.sort((a, b) => (b.sog ?? 0) - (a.sog ?? 0));

    const portList = ports.map((p) => ({
      slug: p.slug,
      name: p.name,
      type: p.type,
      latitude: Number(p.latitude),
      longitude: Number(p.longitude),
      province: p.province,
      provinceName: p.provinceName,
      coastalZone: p.coastalZone,
      stationCount: p.stationCount,
    }));

    const alertList = weatherAlerts.map((a) => ({
      id: a.id,
      alertId: a.alertId,
      type: a.type,
      severity: a.severity,
      province: a.province,
      provinceName: a.provinceName,
      description: a.description,
      startedAt: a.startedAt.toISOString(),
      endedAt: a.endedAt?.toISOString() ?? null,
      waveHeightM: a.waveHeightM ? Number(a.waveHeightM) : null,
      windSpeedKmh: a.windSpeedKmh,
    }));

    const response = {
      success: true,
      zone: {
        slug,
        label: zone.label,
        bbox: zone.bbox,
        provinces: zone.provinces,
      },
      vessels: {
        total: vesselList.length,
        byType: vesselsByType,
        items: vesselList,
      },
      ports: {
        total: portList.length,
        items: portList,
      },
      weather: {
        alerts: alertList,
        alertCount: alertList.length,
      },
    };

    // Cache for 5 minutes
    await setInCache(cacheKey, response, 300);

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    reportApiError(error, "api/maritimo/zonas] Zone data error");
    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener datos de zona maritima",
        vessels: { total: 0, byType: {}, items: [] },
        ports: { total: 0, items: [] },
        weather: { alerts: [], alertCount: 0 },
      },
      { status: 500 }
    );
  }
}
