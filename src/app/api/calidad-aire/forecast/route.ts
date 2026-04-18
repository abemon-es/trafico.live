/**
 * GET /api/calidad-aire/forecast
 *
 * 5-day CAMS air quality forecast at Spanish provincial capital gridpoints.
 *
 * Query Parameters:
 *   - lat, lon: decimal coordinates → returns nearest gridpoint forecast
 *   - province: INE 2-digit province code → returns all gridpoints in province
 *
 * Response:
 *   { gridpoint: { lat, lon, province, name }, forecasts: [{ validAt, no2, pm10, pm25, o3, so2, icaExpected }] }
 *
 * Cache: Redis 30 min (forecast data is refreshed every 12h)
 *
 * Attribution: "Fuente: Copernicus Atmosphere Monitoring Service (CAMS) / ECMWF"
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { authenticateRequest } from "@/lib/auth";
import { getFromCache, setInCache } from "@/lib/redis";
import { reportApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

const CACHE_KEY_PREFIX = "api:calidad-aire:forecast";
const CACHE_TTL = 1800; // 30 minutes

// Gridpoint catalog (matches services/collector/tasks/cams-aq/gridpoints.json)
interface GridpointEntry {
  lat: number;
  lon: number;
  province: string;
  name: string;
}

// Loaded lazily to avoid import issues in edge-compatible runtimes
let _gridpoints: GridpointEntry[] | null = null;

function getGridpoints(): GridpointEntry[] {
  if (_gridpoints) return _gridpoints;
  // Inline the 50 gridpoints to avoid runtime filesystem reads in Next.js
  _gridpoints = [
    { lat: 40.4, lon: -3.7, province: "28", name: "Madrid" },
    { lat: 41.4, lon: 2.2, province: "08", name: "Barcelona" },
    { lat: 39.5, lon: -0.4, province: "46", name: "Valencia" },
    { lat: 37.4, lon: -6.0, province: "41", name: "Sevilla" },
    { lat: 37.9, lon: -4.8, province: "14", name: "Córdoba" },
    { lat: 36.7, lon: -4.4, province: "29", name: "Málaga" },
    { lat: 37.8, lon: -3.8, province: "23", name: "Jaén" },
    { lat: 37.9, lon: -1.1, province: "30", name: "Murcia" },
    { lat: 38.3, lon: -0.5, province: "03", name: "Alicante" },
    { lat: 39.9, lon: -0.1, province: "12", name: "Castellón" },
    { lat: 41.6, lon: -0.9, province: "50", name: "Zaragoza" },
    { lat: 43.3, lon: -1.9, province: "20", name: "San Sebastián" },
    { lat: 43.3, lon: -3.0, province: "48", name: "Bilbao" },
    { lat: 43.3, lon: -8.4, province: "15", name: "A Coruña" },
    { lat: 43.0, lon: -7.6, province: "27", name: "Lugo" },
    { lat: 42.2, lon: -8.7, province: "36", name: "Pontevedra" },
    { lat: 42.2, lon: -7.9, province: "32", name: "Ourense" },
    { lat: 43.4, lon: -5.8, province: "33", name: "Oviedo" },
    { lat: 43.5, lon: -3.8, province: "39", name: "Santander" },
    { lat: 42.6, lon: -2.4, province: "26", name: "Logroño" },
    { lat: 40.0, lon: -3.9, province: "45", name: "Toledo" },
    { lat: 39.9, lon: -4.0, province: "13", name: "Ciudad Real" },
    { lat: 38.9, lon: -7.0, province: "06", name: "Badajoz" },
    { lat: 39.5, lon: -6.4, province: "10", name: "Cáceres" },
    { lat: 40.5, lon: -3.4, province: "19", name: "Guadalajara" },
    { lat: 40.4, lon: -3.2, province: "16", name: "Cuenca" },
    { lat: 39.5, lon: -2.1, province: "02", name: "Albacete" },
    { lat: 37.8, lon: -3.4, province: "18", name: "Granada" },
    { lat: 37.0, lon: -2.5, province: "04", name: "Almería" },
    { lat: 37.3, lon: -5.9, province: "41", name: "Sevilla (norte)" },
    { lat: 40.9, lon: -5.7, province: "37", name: "Salamanca" },
    { lat: 41.7, lon: -4.7, province: "47", name: "Valladolid" },
    { lat: 42.4, lon: -3.7, province: "09", name: "Burgos" },
    { lat: 42.0, lon: -4.5, province: "34", name: "Palencia" },
    { lat: 42.5, lon: -8.9, province: "36", name: "Vigo" },
    { lat: 42.9, lon: -6.1, province: "24", name: "León" },
    { lat: 41.5, lon: -5.8, province: "49", name: "Zamora" },
    { lat: 40.6, lon: -4.1, province: "05", name: "Ávila" },
    { lat: 40.9, lon: -4.1, province: "40", name: "Segovia" },
    { lat: 41.0, lon: -3.7, province: "19", name: "Guadalajara (centro)" },
    { lat: 40.6, lon: -5.7, province: "37", name: "Salamanca (sur)" },
    { lat: 41.7, lon: 2.8, province: "17", name: "Girona" },
    { lat: 41.6, lon: 0.6, province: "25", name: "Lleida" },
    { lat: 41.1, lon: 1.2, province: "43", name: "Tarragona" },
    { lat: 38.1, lon: 1.0, province: "30", name: "Cartagena" },
    { lat: 28.1, lon: -15.4, province: "35", name: "Las Palmas" },
    { lat: 28.5, lon: -16.3, province: "38", name: "Santa Cruz de Tenerife" },
    { lat: 39.6, lon: 2.7, province: "07", name: "Palma de Mallorca" },
    { lat: 38.9, lon: 1.4, province: "07", name: "Ibiza" },
    { lat: 39.9, lon: 4.3, province: "07", name: "Mahón" },
  ];
  return _gridpoints;
}

/**
 * Find the nearest gridpoint to the given lat/lon using Euclidean distance
 * (valid for small distances within Spain).
 */
function findNearestGridpoint(lat: number, lon: number): GridpointEntry {
  const gridpoints = getGridpoints();
  let nearest = gridpoints[0];
  let minDist = Infinity;

  for (const gp of gridpoints) {
    const dist = Math.sqrt((gp.lat - lat) ** 2 + (gp.lon - lon) ** 2);
    if (dist < minDist) {
      minDist = dist;
      nearest = gp;
    }
  }

  return nearest;
}

export async function GET(request: NextRequest) {
  const authResponse = authenticateRequest(request);
  if (authResponse) return authResponse;

  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);
    const latParam = searchParams.get("lat");
    const lonParam = searchParams.get("lon");
    const provinceParam = searchParams.get("province");

    // Validate: need either (lat+lon) or province
    if (!latParam && !lonParam && !provinceParam) {
      return NextResponse.json(
        { error: "Provide lat+lon (nearest gridpoint) or province (INE code)" },
        { status: 400 }
      );
    }

    const now = new Date();
    // Only return forecasts valid from now onward (up to 5 days)
    const validFrom = now;
    const validTo = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    const paramStr = [latParam, lonParam, provinceParam].filter(Boolean).join("_");
    const cacheKey = `${CACHE_KEY_PREFIX}:${paramStr}`;

    const cached = await getFromCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    if (provinceParam) {
      // Province mode: all gridpoints in province
      const gridpoints = getGridpoints().filter((gp) => gp.province === provinceParam);

      if (gridpoints.length === 0) {
        return NextResponse.json(
          { error: `No gridpoints for province ${provinceParam}` },
          { status: 404 }
        );
      }

      const results = await Promise.all(
        gridpoints.map(async (gp) => {
          const rows = await prisma.aQForecast.findMany({
            where: {
              gridLat: gp.lat,
              gridLon: gp.lon,
              validAt: { gte: validFrom, lte: validTo },
            },
            orderBy: { validAt: "asc" },
            select: {
              validAt: true,
              horizonHours: true,
              no2: true,
              pm10: true,
              pm25: true,
              o3: true,
              so2: true,
              icaExpected: true,
            },
          });

          return {
            gridpoint: gp,
            forecasts: rows.map((r) => ({
              validAt: r.validAt,
              horizonHours: r.horizonHours,
              no2: r.no2,
              pm10: r.pm10,
              pm25: r.pm25,
              o3: r.o3,
              so2: r.so2,
              icaExpected: r.icaExpected,
            })),
          };
        })
      );

      const response = {
        province: provinceParam,
        count: results.length,
        gridpoints: results,
        source: "Copernicus Atmosphere Monitoring Service (CAMS) / ECMWF",
        updatedAt: new Date().toISOString(),
      };

      await setInCache(cacheKey, response, CACHE_TTL);
      return NextResponse.json(response);
    }

    // Nearest-gridpoint mode
    const lat = parseFloat(latParam!);
    const lon = parseFloat(lonParam!);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return NextResponse.json({ error: "Invalid lat/lon values" }, { status: 400 });
    }

    const gp = findNearestGridpoint(lat, lon);

    const rows = await prisma.aQForecast.findMany({
      where: {
        gridLat: gp.lat,
        gridLon: gp.lon,
        validAt: { gte: validFrom, lte: validTo },
      },
      orderBy: { validAt: "asc" },
      select: {
        validAt: true,
        horizonHours: true,
        no2: true,
        pm10: true,
        pm25: true,
        o3: true,
        so2: true,
        icaExpected: true,
      },
    });

    const response = {
      gridpoint: {
        lat: gp.lat,
        lon: gp.lon,
        province: gp.province,
        name: gp.name,
        distanceKm: Math.round(
          Math.sqrt((gp.lat - lat) ** 2 + (gp.lon - lon) ** 2) * 111
        ),
      },
      forecasts: rows.map((r) => ({
        validAt: r.validAt,
        horizonHours: r.horizonHours,
        no2: r.no2,
        pm10: r.pm10,
        pm25: r.pm25,
        o3: r.o3,
        so2: r.so2,
        icaExpected: r.icaExpected,
      })),
      source: "Copernicus Atmosphere Monitoring Service (CAMS) / ECMWF",
      updatedAt: new Date().toISOString(),
    };

    await setInCache(cacheKey, response, CACHE_TTL);
    return NextResponse.json(response);
  } catch (error) {
    return reportApiError(error, "calidad-aire/forecast");
  }
}
