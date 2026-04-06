import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { getOrCompute } from "@/lib/redis";
import {
  CORRIDORS,
  CO2_FACTORS,
  CAR_CONSUMPTION_L_100KM,
  TRAIN_PRICE_ESTIMATES,
  hasAirConnection,
  hasRailConnection,
} from "@/lib/corridors";

export const dynamic = "force-dynamic";

/**
 * GET /api/inteligencia/coste-viaje
 *
 * Multimodal trip cost comparison for Spanish transport corridors.
 *
 * Query Parameters:
 *   - origin: INE 2-digit province code, e.g. "28" for Madrid
 *   - destination: INE 2-digit province code, e.g. "08" for Barcelona
 *
 * Response:
 *   { success, corridor, fuel, modes, risk, meta }
 *
 * Cache: 3600s (Redis)
 * Attribution: CNMC (combustible), DGT (accidentes), calculos propios
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);
    const origin = searchParams.get("origin");
    const destination = searchParams.get("destination");

    if (!origin || !destination) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Se requieren los parametros origin y destination (codigo INE de provincia)",
        },
        { status: 400 }
      );
    }

    // Validate province codes (1-2 digits)
    if (!/^\d{1,2}$/.test(origin) || !/^\d{1,2}$/.test(destination)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Los codigos de provincia deben ser de 1-2 digitos (ej: '28' para Madrid)",
        },
        { status: 400 }
      );
    }

    const normOrigin = origin.padStart(2, "0");
    const normDest = destination.padStart(2, "0");

    // Find corridor matching origin+destination (either direction)
    const corridor = CORRIDORS.find(
      (c) =>
        (c.origin.province === normOrigin &&
          c.destination.province === normDest) ||
        (c.origin.province === normDest &&
          c.destination.province === normOrigin)
    );

    if (!corridor) {
      return NextResponse.json(
        {
          success: false,
          error: "Ruta no disponible. Consulta los corredores principales.",
          availableCorridors: CORRIDORS.map((c) => ({
            slug: c.slug,
            name: c.name,
            origin: c.origin.province,
            destination: c.destination.province,
          })),
        },
        { status: 404 }
      );
    }

    // Determine if request is reversed (destination->origin vs corridor definition)
    const isReversed =
      corridor.origin.province === normDest &&
      corridor.destination.province === normOrigin;

    const cacheKey = `trip-cost:${normOrigin}:${normDest}`;

    const result = await getOrCompute<object>(cacheKey, 3600, async () => {
      // Fetch fuel price + accident stats in parallel
      const [fuelPrice, accidentStats] = await Promise.all([
        // Latest CNMC fuel price for origin province
        prisma.cNMCFuelPrice.findFirst({
          where: { province: normOrigin },
          orderBy: { date: "desc" },
          select: {
            date: true,
            provinceName: true,
            priceGasoleoA: true,
            priceGasolina95: true,
          },
        }),

        // Accident stats on corridor roads (2019-2023)
        prisma.accidentMicrodata.aggregate({
          where: {
            roadNumber: { in: corridor.roads },
            year: { gte: 2019 },
          },
          _count: true,
          _sum: {
            fatalities: true,
            hospitalized: true,
          },
        }),
      ]);

      const gasoleoPrice = fuelPrice?.priceGasoleoA
        ? Number(fuelPrice.priceGasoleoA)
        : 1.45;
      const gasolina95Price = fuelPrice?.priceGasolina95
        ? Number(fuelPrice.priceGasolina95)
        : 1.55;

      // Car cost
      const carCostGasoleo =
        (corridor.distance / 100) * CAR_CONSUMPTION_L_100KM * gasoleoPrice;
      const carCostGasolina95 =
        (corridor.distance / 100) * CAR_CONSUMPTION_L_100KM * gasolina95Price;

      // Train
      const hasRail = hasRailConnection(corridor);
      const trainPrice = TRAIN_PRICE_ESTIMATES[corridor.slug] ?? null;

      // Plane estimate (rough): base 30 EUR + 0.08 EUR/km (short-haul domestic)
      const hasAir = hasAirConnection(corridor);
      const planePrice = hasAir
        ? Math.round(30 + corridor.distance * 0.08)
        : null;
      // Flight time: ~1h flight + ~2h airport overhead
      const planeTime = hasAir ? 60 + 120 : null;

      // CO2 emissions (kg)
      const co2Car =
        Math.round(corridor.distance * CO2_FACTORS.car * 10) / 10;
      const co2Train = hasRail
        ? Math.round(corridor.distance * CO2_FACTORS.train * 10) / 10
        : null;
      const co2Plane = hasAir
        ? Math.round(corridor.distance * CO2_FACTORS.plane * 10) / 10
        : null;

      // Risk assessment
      const totalAccidents = accidentStats._count ?? 0;
      const totalFatalities = accidentStats._sum?.fatalities ?? 0;
      const totalHospitalized = accidentStats._sum?.hospitalized ?? 0;
      const accidentsPerYear = Math.round(totalAccidents / 5);

      // Build origin/destination labels (respecting direction)
      const originCity = isReversed
        ? corridor.destination.city
        : corridor.origin.city;
      const destCity = isReversed
        ? corridor.origin.city
        : corridor.destination.city;

      return {
        success: true,
        corridor: {
          slug: corridor.slug,
          name: isReversed
            ? `${corridor.destination.city} — ${corridor.origin.city}`
            : corridor.name,
          origin: originCity,
          destination: destCity,
          distance: corridor.distance,
          roads: corridor.roads,
        },
        fuel: {
          gasoleoA: gasoleoPrice,
          gasolina95: gasolina95Price,
          date: fuelPrice?.date
            ? fuelPrice.date instanceof Date
              ? fuelPrice.date.toISOString().slice(0, 10)
              : String(fuelPrice.date).slice(0, 10)
            : null,
          province: fuelPrice?.provinceName ?? null,
        },
        modes: {
          car: {
            time: corridor.driveTime,
            costGasoleo: Math.round(carCostGasoleo * 100) / 100,
            costGasolina95: Math.round(carCostGasolina95 * 100) / 100,
            co2: co2Car,
          },
          train: hasRail
            ? {
                time: corridor.trainTime ?? null,
                brands: corridor.trainBrands ?? [],
                priceFrom: trainPrice,
                co2: co2Train,
              }
            : null,
          plane: hasAir
            ? {
                time: planeTime,
                priceEstimate: planePrice,
                airports: `${corridor.origin.iata} — ${corridor.destination.iata}`,
                co2: co2Plane,
              }
            : null,
        },
        risk: {
          car: {
            accidentsTotal: totalAccidents,
            accidentsPerYear,
            fatalities: totalFatalities,
            hospitalized: totalHospitalized,
            roads: corridor.roads,
            period: "2019-2023",
          },
          train: {
            level: "muy bajo",
            description: "El tren es el modo mas seguro",
          },
          plane: {
            level: "muy bajo",
            description:
              "La aviacion comercial tiene el menor indice de accidentes",
          },
        },
        meta: {
          source: "CNMC, DGT, calculos propios",
          attribution:
            "Fuente: CNMC (combustible), DGT (accidentes), calculos propios",
          fuelConsumption: `${CAR_CONSUMPTION_L_100KM} L/100km`,
          co2Factors: CO2_FACTORS,
          cachedAt: new Date().toISOString(),
        },
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    reportApiError(error, "Trip cost API error", request);
    return NextResponse.json(
      { success: false, error: "Error al calcular el coste del viaje" },
      { status: 500 }
    );
  }
}
