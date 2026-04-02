import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/api-utils";
import redis from "@/lib/redis";

export const revalidate = 0;

const FLOTA_URL = "https://tiempo-real.largorecorrido.renfe.com/renfe-visor/flotaLD.json";
const RUTAS_URL = "https://tiempo-real.largorecorrido.renfe.com/renfe-visor/trenesConEstacionesLD.json";
const CACHE_KEY_FLOTA = "renfe:flota:ld";
const CACHE_KEY_RUTAS = "renfe:rutas:ld";
const CACHE_TTL = 15;

const PRODUCT_TYPES: Record<number, { name: string; brand: string }> = {
  1: { name: "AVE", brand: "AVE" },
  2: { name: "AVE", brand: "AVE" },
  3: { name: "Avant", brand: "Avant" },
  4: { name: "Alvia", brand: "Alvia" },
  5: { name: "Alvia", brand: "Alvia" },
  6: { name: "Altaria", brand: "Altaria" },
  7: { name: "Euromed", brand: "Euromed" },
  8: { name: "Trenhotel", brand: "Trenhotel" },
  10: { name: "Talgo", brand: "Talgo" },
  11: { name: "Alvia", brand: "Alvia" },
  12: { name: "AV City", brand: "AV City" },
  13: { name: "Intercity", brand: "Intercity" },
  16: { name: "Media Distancia", brand: "MD" },
  17: { name: "Regional", brand: "Regional" },
  18: { name: "Regional Exprés", brand: "RE" },
  19: { name: "Intercity", brand: "Intercity" },
};

interface RenfeTrain {
  codComercial: string;
  codEstAnt: string;
  codEstSig: string;
  horaLlegadaSigEst: string;
  codProduct: number;
  codOrigen: string;
  codDestino: string;
  accesible: boolean;
  ultRetraso: string;
  latitud: number;
  longitud: number;
  time: number;
  mat: string;
}

interface TrainRoute {
  idTren: string;
  estaciones: Array<{ p: string; h: string }>;
  secuencia: Array<{ lat: number; lon: number; c?: string }>;
}

async function fetchCached<T>(url: string, cacheKey: string): Promise<T | null> {
  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  }
  const res = await fetch(`${url}?v=${Date.now()}`, {
    headers: { "User-Agent": "trafico.live/1.0" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (redis) await redis.set(cacheKey, JSON.stringify(data), "EX", CACHE_TTL);
  return data;
}

/**
 * GET /api/trenes/posiciones
 *
 * Live train positions + route polylines from Renfe real-time API.
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const [flotaData, rutasRaw] = await Promise.all([
      fetchCached<{ fechaActualizacion: string; trenes: RenfeTrain[] }>(FLOTA_URL, CACHE_KEY_FLOTA),
      fetchCached<{ trenes?: TrainRoute[] } | TrainRoute[]>(RUTAS_URL, CACHE_KEY_RUTAS),
    ]);

    const routeMap = new Map<string, TrainRoute>();
    const rawRoutes = Array.isArray(rutasRaw) ? rutasRaw : (rutasRaw as { trenes?: TrainRoute[] })?.trenes || [];
    for (const r of rawRoutes) {
      if (r.idTren && r.secuencia?.length) routeMap.set(r.idTren, r);
    }

    const trainFeatures: GeoJSON.Feature[] = [];
    const routeFeatures: GeoJSON.Feature[] = [];
    const trenes = flotaData?.trenes || [];

    for (const t of trenes) {
      if (!t.latitud || !t.longitud || t.latitud === 0) continue;
      const delay = parseInt(t.ultRetraso) || 0;
      const product = PRODUCT_TYPES[t.codProduct] || { name: `Tipo ${t.codProduct}`, brand: "Renfe" };
      const route = routeMap.get(t.codComercial);

      // Train point
      trainFeatures.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [t.longitud, t.latitud] },
        properties: {
          trainId: t.codComercial,
          productType: product.name,
          brand: product.brand,
          productCode: t.codProduct,
          origin: t.codOrigen,
          destination: t.codDestino,
          prevStation: t.codEstAnt,
          nextStation: t.codEstSig,
          nextArrival: t.horaLlegadaSigEst || "",
          delay,
          delayCategory: delay <= 0 ? "on-time" : delay <= 5 ? "slight" : delay <= 15 ? "moderate" : "severe",
          accessible: t.accesible,
          material: t.mat,
          stopsCount: route?.estaciones?.length || 0,
          // Stations schedule for detail panel
          stopsJson: route ? JSON.stringify(route.estaciones) : "[]",
        },
      });

      // Route polyline
      if (route?.secuencia?.length && route.secuencia.length >= 2) {
        routeFeatures.push({
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: route.secuencia.map((p) => [p.lon, p.lat]),
          },
          properties: {
            trainId: t.codComercial,
            brand: product.brand,
            delay,
          },
        });
      }
    }

    const delays = trainFeatures.map((f) => (f.properties as Record<string, number>).delay);
    const avgDelay = delays.length ? Math.round(delays.reduce((a, b) => a + b, 0) / delays.length) : 0;

    return NextResponse.json({
      trains: { type: "FeatureCollection", features: trainFeatures },
      routes: { type: "FeatureCollection", features: routeFeatures },
      metadata: {
        count: trainFeatures.length,
        routeCount: routeFeatures.length,
        updatedAt: flotaData?.fechaActualizacion || null,
        stats: { avgDelay, onTime: delays.filter((d) => d <= 0).length, delayed: delays.filter((d) => d > 5).length, maxDelay: Math.max(...delays, 0) },
      },
    });
  } catch (error) {
    reportApiError(error, "Train positions API error");
    return NextResponse.json({ success: false, error: "Failed to fetch train positions" }, { status: 500 });
  }
}
