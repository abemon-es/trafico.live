import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { applyRateLimit } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

/**
 * GET /api/trafico/ciudades
 *
 * City-level real-time traffic sensor data (Barcelona, Valencia, Zaragoza).
 * Returns latest reading per sensor.
 *
 * Query Parameters:
 *   - city:   barcelona | valencia | zaragoza | all  (default: all)
 *   - format: json | geojson                         (default: json)
 *   - limit:  max sensors returned                   (default: 500)
 *
 * Cache: 60 seconds (sensor data updated every 5 min).
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);

    // Parse params
    const cityParam = (searchParams.get("city") || "all").toLowerCase();
    const format = (searchParams.get("format") || "json").toLowerCase();
    const limit = Math.min(parseInt(searchParams.get("limit") || "500", 10), 2000);

    // Whitelist of valid city values — never interpolate user input into SQL
    const CITY_MAP: Record<string, string> = {
      barcelona: "BARCELONA",
      valencia: "VALENCIA",
      zaragoza: "ZARAGOZA",
    };

    // Validate city param
    if (cityParam !== "all" && !CITY_MAP[cityParam]) {
      return NextResponse.json(
        { success: false, error: "Invalid city. Use: barcelona, valencia, zaragoza, all" },
        { status: 400 }
      );
    }

    const cityValue = cityParam !== "all" ? CITY_MAP[cityParam] : null;

    // Fetch sensors with their latest reading via parameterized raw SQL.
    // LATERAL JOIN ensures one DB round-trip instead of N+1.
    const cutoff = new Date(Date.now() - 10 * 60 * 1000); // readings from last 10 min

    type SensorRow = {
      id: string;
      city: string;
      sensorId: string;
      streetName: string | null;
      latitude: string;
      longitude: string;
      direction: string | null;
      serviceLevel: number | null;
      intensity: number | null;
      occupancy: number | null;
      speed: number | null;
      prediction: number | null;
      readingAt: Date | null;
    };

    const cityFilter = cityValue
      ? Prisma.sql`AND s.city = ${cityValue}`
      : Prisma.empty;

    const rows = await prisma.$queryRaw<SensorRow[]>`
      SELECT
        s.id,
        s.city,
        s."sensorId",
        s."streetName",
        s.latitude::text,
        s.longitude::text,
        s.direction,
        r."serviceLevel",
        r.intensity,
        r.occupancy,
        r.speed,
        r.prediction,
        r."createdAt" AS "readingAt"
      FROM "CityTrafficSensor" s
      LEFT JOIN LATERAL (
        SELECT "serviceLevel", intensity, occupancy, speed, prediction, "createdAt"
        FROM "CityTrafficReading"
        WHERE "sensorId" = s.id
          AND "createdAt" >= ${cutoff}
        ORDER BY "createdAt" DESC
        LIMIT 1
      ) r ON true
      WHERE 1=1 ${cityFilter}
      ORDER BY s.city, s."sensorId"
      LIMIT ${limit}
    `;

    // GeoJSON format
    if (format === "geojson") {
      const features = rows.map((row) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [parseFloat(row.longitude), parseFloat(row.latitude)],
        },
        properties: {
          id: row.id,
          city: row.city,
          sensorId: row.sensorId,
          streetName: row.streetName,
          direction: row.direction,
          serviceLevel: row.serviceLevel,
          intensity: row.intensity,
          occupancy: row.occupancy,
          speed: row.speed,
          prediction: row.prediction,
          updatedAt: row.readingAt,
        },
      }));

      return NextResponse.json(
        {
          type: "FeatureCollection",
          features,
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
          },
        }
      );
    }

    // JSON format
    const byCityMap = new Map<string, typeof rows>();
    for (const row of rows) {
      if (!byCityMap.has(row.city)) byCityMap.set(row.city, []);
      byCityMap.get(row.city)!.push(row);
    }

    const cities = Array.from(byCityMap.entries()).map(([city, sensors]) => {
      const withReading = sensors.filter((s) => s.serviceLevel !== null);
      const congested = withReading.filter((s) => (s.serviceLevel ?? 0) >= 2).length;

      return {
        city: city.toLowerCase(),
        total: sensors.length,
        withData: withReading.length,
        congested,
        sensors: sensors.map((s) => ({
          id: s.id,
          sensorId: s.sensorId,
          streetName: s.streetName,
          latitude: parseFloat(s.latitude),
          longitude: parseFloat(s.longitude),
          direction: s.direction,
          serviceLevel: s.serviceLevel,
          intensity: s.intensity,
          occupancy: s.occupancy,
          speed: s.speed,
          prediction: s.prediction,
          updatedAt: s.readingAt,
        })),
      };
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          city: cityParam,
          total: rows.length,
          updatedAt: new Date().toISOString(),
          cities,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    reportApiError(error, "City traffic API error");
    return NextResponse.json(
      { success: false, error: "Failed to fetch city traffic data" },
      { status: 500 }
    );
  }
}
