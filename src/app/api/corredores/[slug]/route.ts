import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { reportApiError } from "@/lib/api-error";
import { getOrCompute } from "@/lib/redis";
import {
  getCorridorBySlug,
  hasAirConnection,
  hasRailConnection,
  CO2_FACTORS,
  CAR_CONSUMPTION_L_100KM,
  TRAIN_PRICE_ESTIMATES,
} from "@/lib/corridors";

export const dynamic = "force-dynamic";

/**
 * GET /api/corredores/[slug]
 *
 * Returns corridor comparison data including:
 * - Corridor definition (static)
 * - Latest fuel prices for origin province (CNMC)
 * - Active traffic incidents on corridor roads
 * - Accident statistics on corridor roads (last 5 years)
 * - Mobility O-D flow data (origin → destination province)
 * - CO2 and cost estimates per transport mode
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { slug } = await params;
    const corridor = getCorridorBySlug(slug);

    if (!corridor) {
      return NextResponse.json(
        { error: "Corredor no encontrado" },
        { status: 404 }
      );
    }

    const cacheKey = `corridors:${slug}`;

    const result = await getOrCompute(cacheKey, 900, async () => {
      // Run all queries in parallel
      const [fuelPrice, activeIncidents, accidentStats, mobilityData, railways, airports] =
        await Promise.all([
          // Latest CNMC fuel price for origin province
          prisma.cNMCFuelPrice.findFirst({
            where: { province: corridor.origin.province },
            orderBy: { date: "desc" },
            select: {
              date: true,
              province: true,
              provinceName: true,
              priceGasoleoA: true,
              priceGasolina95: true,
            },
          }),

          // Active incidents on corridor roads
          prisma.trafficIncident.findMany({
            where: {
              isActive: true,
              roadNumber: { in: corridor.roads },
            },
            select: {
              id: true,
              roadNumber: true,
              severity: true,
              type: true,
              description: true,
              province: true,
              provinceName: true,
              startedAt: true,
            },
            orderBy: { startedAt: "desc" },
            take: 20,
          }),

          // Accident count on corridor roads (last 5 years)
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

          // Mobility O-D flows between origin and destination provinces
          prisma.mobilityODFlow.findMany({
            where: {
              originProvince: corridor.origin.province,
              destProvince: corridor.destination.province,
            },
            orderBy: { date: "desc" },
            take: 90, // ~3 months of daily data
            select: {
              date: true,
              tripCount: true,
              avgDistanceKm: true,
            },
          }),

          // Railway routes connecting these cities
          hasRailConnection(corridor)
            ? prisma.railwayRoute.findMany({
                where: {
                  brand: { in: corridor.trainBrands },
                  OR: [
                    {
                      originName: { contains: corridor.origin.city, mode: "insensitive" },
                      destName: { contains: corridor.destination.city, mode: "insensitive" },
                    },
                    {
                      originName: { contains: corridor.destination.city, mode: "insensitive" },
                      destName: { contains: corridor.origin.city, mode: "insensitive" },
                    },
                  ],
                },
                select: {
                  id: true,
                  slug: true,
                  brand: true,
                  originName: true,
                  destName: true,
                  stopsCount: true,
                },
                take: 10,
              })
            : Promise.resolve([]),

          // Airports at both ends
          hasAirConnection(corridor)
            ? prisma.airport.findMany({
                where: {
                  iata: {
                    in: [corridor.origin.iata!, corridor.destination.iata!],
                  },
                },
                select: {
                  iata: true,
                  name: true,
                  city: true,
                },
              })
            : Promise.resolve([]),
        ]);

      // Build cost estimates
      const gasoleoPrice = fuelPrice?.priceGasoleoA
        ? Number(fuelPrice.priceGasoleoA)
        : 1.45; // fallback

      const carCost =
        (corridor.distance / 100) * CAR_CONSUMPTION_L_100KM * gasoleoPrice;

      const trainPriceEstimate = TRAIN_PRICE_ESTIMATES[corridor.slug] ?? null;

      // CO2 estimates (kg per passenger)
      const co2 = {
        car: Math.round(corridor.distance * CO2_FACTORS.car * 10) / 10,
        train: hasRailConnection(corridor)
          ? Math.round(corridor.distance * CO2_FACTORS.train * 10) / 10
          : null,
        plane: hasAirConnection(corridor)
          ? Math.round(corridor.distance * CO2_FACTORS.plane * 10) / 10
          : null,
      };

      // Severity breakdown for incidents
      const severityBreakdown = {
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        VERY_HIGH: 0,
      };
      for (const incident of activeIncidents) {
        const sev = incident.severity as keyof typeof severityBreakdown;
        if (sev in severityBreakdown) severityBreakdown[sev]++;
      }

      return {
        corridor: {
          slug: corridor.slug,
          name: corridor.name,
          origin: corridor.origin,
          destination: corridor.destination,
          roads: corridor.roads,
        },
        modes: {
          car: {
            distance: corridor.distance,
            time: corridor.driveTime,
            cost: Math.round(carCost * 100) / 100,
            co2: co2.car,
            fuelPricePerLiter: gasoleoPrice,
          },
          train: hasRailConnection(corridor)
            ? {
                time: corridor.trainTime!,
                brands: corridor.trainBrands!,
                priceFrom: trainPriceEstimate,
                co2: co2.train,
                routes: railways,
              }
            : null,
          plane: hasAirConnection(corridor)
            ? {
                co2: co2.plane,
                originAirport: airports.find(
                  (a) => a.iata === corridor.origin.iata
                ) ?? null,
                destAirport: airports.find(
                  (a) => a.iata === corridor.destination.iata
                ) ?? null,
              }
            : null,
        },
        fuel: fuelPrice
          ? {
              date: fuelPrice.date,
              province: fuelPrice.provinceName ?? fuelPrice.province,
              gasoleoA: fuelPrice.priceGasoleoA
                ? Number(fuelPrice.priceGasoleoA)
                : null,
              gasolina95: fuelPrice.priceGasolina95
                ? Number(fuelPrice.priceGasolina95)
                : null,
            }
          : null,
        incidents: {
          count: activeIncidents.length,
          severityBreakdown,
          items: activeIncidents.map((i) => ({
            id: i.id,
            road: i.roadNumber,
            severity: i.severity,
            type: i.type,
            description: i.description,
            province: i.provinceName ?? i.province,
            startedAt: i.startedAt,
          })),
        },
        accidents: {
          totalCount: accidentStats._count,
          fatalities: accidentStats._sum.fatalities ?? 0,
          hospitalized: accidentStats._sum.hospitalized ?? 0,
          period: "2019-2023",
        },
        mobility: mobilityData.map((m) => ({
          date: m.date,
          tripCount: m.tripCount,
          avgDistanceKm: m.avgDistanceKm ? Number(m.avgDistanceKm) : null,
        })),
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    reportApiError(err, "GET /api/corredores/[slug]", request);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
