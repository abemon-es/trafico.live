import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/api-utils";
import redis from "@/lib/redis";

export const revalidate = 0; // Always fresh — real-time data

const FLOTA_URL = "https://tiempo-real.largorecorrido.renfe.com/renfe-visor/flotaLD.json";
const CACHE_KEY = "renfe:flota:ld";
const CACHE_TTL = 15; // 15 seconds

// Product codes → human-readable service types
const PRODUCT_TYPES: Record<number, string> = {
  1: "AVE",
  2: "AVE",
  3: "Avant",
  4: "Alvia",
  5: "Alvia",
  6: "Altaria",
  7: "Euromed",
  8: "Trenhotel",
  9: "Arco",
  10: "Talgo",
  11: "Alvia",
  12: "AV City",
  13: "Intercity",
  16: "Media Distancia",
  17: "Regional",
  18: "Regional Exprés",
  19: "Intercity",
  20: "Cercanías",
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

interface FlotaResponse {
  fechaActualizacion: string;
  trenes: RenfeTrain[];
}

/**
 * GET /api/trenes/posiciones
 *
 * Live train positions from Renfe's undocumented fleet API.
 * Returns GeoJSON FeatureCollection with train points.
 * Cached in Redis for 15 seconds.
 *
 * Attribution: Datos de Renfe Operadora (CC-BY 4.0)
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Check Redis cache
    let data: FlotaResponse | null = null;
    if (redis) {
      const cached = await redis.get(CACHE_KEY);
      if (cached) {
        data = JSON.parse(cached);
      }
    }

    // Fetch from Renfe if not cached
    if (!data) {
      const response = await fetch(`${FLOTA_URL}?v=${Date.now()}`, {
        headers: { "User-Agent": "trafico.live/1.0" },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return NextResponse.json(
          { success: false, error: `Renfe API returned ${response.status}` },
          { status: 502 }
        );
      }

      data = await response.json();

      // Cache in Redis
      if (redis && data) {
        await redis.set(CACHE_KEY, JSON.stringify(data), "EX", CACHE_TTL);
      }
    }

    if (!data?.trenes) {
      return NextResponse.json({
        type: "FeatureCollection",
        features: [],
        metadata: { count: 0, updatedAt: null },
      });
    }

    // Convert to GeoJSON
    const features = data.trenes
      .filter((t) => t.latitud && t.longitud && t.latitud !== 0)
      .map((t) => {
        const delay = parseInt(t.ultRetraso) || 0;
        const productType = PRODUCT_TYPES[t.codProduct] || `Producto ${t.codProduct}`;

        return {
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [t.longitud, t.latitud],
          },
          properties: {
            trainId: t.codComercial,
            productType,
            productCode: t.codProduct,
            origin: t.codOrigen,
            destination: t.codDestino,
            prevStation: t.codEstAnt,
            nextStation: t.codEstSig,
            nextArrival: t.horaLlegadaSigEst,
            delay,
            delayCategory: delay <= 0 ? "on-time" : delay <= 5 ? "slight" : delay <= 15 ? "moderate" : "severe",
            accessible: t.accesible,
            material: t.mat,
            timestamp: t.time,
          },
        };
      });

    // Stats
    const delays = features.map((f) => f.properties.delay);
    const avgDelay = delays.length > 0 ? Math.round(delays.reduce((a, b) => a + b, 0) / delays.length) : 0;
    const onTime = delays.filter((d) => d <= 0).length;
    const delayed = delays.filter((d) => d > 5).length;

    return NextResponse.json({
      type: "FeatureCollection",
      features,
      metadata: {
        count: features.length,
        updatedAt: data.fechaActualizacion,
        stats: {
          avgDelay,
          onTime,
          delayed,
          maxDelay: Math.max(...delays, 0),
        },
      },
    });
  } catch (error) {
    reportApiError(error, "Train positions API error");
    return NextResponse.json(
      { success: false, error: "Failed to fetch train positions" },
      { status: 500 }
    );
  }
}
