/**
 * Aviation — Airport Catalog API
 *
 * Returns AENA airport data (catalog + statistics if available).
 * Airport catalog is seeded by the opensky/aena-stats collectors.
 *
 * GET /api/aviacion/aeropuertos
 *   No params: returns all airports with basic info
 *   ?airport=MAD|LEMD          (single airport by IATA or ICAO code — includes stats)
 *   ?province=28               (filter by INE 2-digit province code)
 *   ?format=json|geojson       (default: json)
 *
 * Attribution: © AENA Aeropuertos, datos estadísticos mensuales
 */

import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { Prisma } from "@prisma/client";

// Cache for 24 hours — airport catalog rarely changes
export const revalidate = 86400;

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);

    const airportCode = searchParams.get("airport");
    const province = searchParams.get("province");
    const format = searchParams.get("format") || "json";

    // --- Single airport lookup (IATA or ICAO) ---
    if (airportCode) {
      const code = airportCode.toUpperCase();
      const airport = await prisma.airport.findFirst({
        where: {
          OR: [
            { iata: code },
            { icao: code },
          ],
        },
        include: {
          statistics: {
            orderBy: { periodStart: "desc" },
            take: 50, // last ~4 years of monthly data per metric
          },
        },
      });

      if (!airport) {
        return NextResponse.json(
          { success: false, error: `Airport not found: ${airportCode}` },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          data: {
            airport: {
              id: airport.id,
              icao: airport.icao,
              iata: airport.iata,
              name: airport.name,
              city: airport.city,
              province: airport.province,
              latitude: Number(airport.latitude),
              longitude: Number(airport.longitude),
              elevation: airport.elevation,
              isAena: airport.isAena,
            },
            statistics: airport.statistics.map((s) => ({
              metric: s.metric,
              value: Number(s.value),
              periodType: s.periodType,
              periodStart: s.periodStart,
            })),
          },
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
          },
        }
      );
    }

    // --- All airports (optionally filtered by province) ---
    const where: Prisma.AirportWhereInput = {};
    if (province) {
      where.province = province.padStart(2, "0");
    }

    const airports = await prisma.airport.findMany({
      where,
      orderBy: [{ name: "asc" }],
    });

    // GeoJSON format
    if (format === "geojson") {
      const geojson = {
        type: "FeatureCollection" as const,
        features: airports.map((a) => ({
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [Number(a.longitude), Number(a.latitude)],
          },
          properties: {
            id: a.id,
            icao: a.icao,
            iata: a.iata,
            name: a.name,
            city: a.city,
            province: a.province,
            elevation: a.elevation,
            isAena: a.isAena,
          },
        })),
      };

      return NextResponse.json(geojson, {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
        },
      });
    }

    // Default JSON format
    return NextResponse.json(
      {
        success: true,
        data: {
          airports: airports.map((a) => ({
            id: a.id,
            icao: a.icao,
            iata: a.iata,
            name: a.name,
            city: a.city,
            province: a.province,
            latitude: Number(a.latitude),
            longitude: Number(a.longitude),
            elevation: a.elevation,
            isAena: a.isAena,
          })),
          total: airports.length,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
        },
      }
    );
  } catch (error) {
    reportApiError(error, "api/aviacion/aeropuertos] Airport catalog error");
    return NextResponse.json(
      { success: false, error: "Failed to fetch airport data" },
      { status: 500 }
    );
  }
}
