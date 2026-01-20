import { NextResponse } from "next/server";
import {
  parseDatexResponse,
  extractV16Beacons,
  type V16BeaconData,
} from "@/lib/parsers/datex2";

// Cache the response for 60 seconds
export const revalidate = 60;

const DGT_DATEX_URL =
  process.env.DGT_DATEX_URL ||
  "https://nap.dgt.es/datex2/v3/dgt/SituationPublication/date";

export async function GET() {
  try {
    // Fetch from DGT NAP API
    const response = await fetch(DGT_DATEX_URL, {
      headers: {
        Accept: "application/xml",
        "User-Agent": "TraficoEspana/1.0 (https://trafico.abemon.es)",
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      console.error(`DGT API error: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: "Error fetching DGT data", beacons: [] },
        { status: 502 }
      );
    }

    const xml = await response.text();

    // Parse DATEX II XML
    const situations = parseDatexResponse(xml);

    // Extract V16 beacons
    const beacons = extractV16Beacons(situations);

    // Convert to GeoJSON for map consumption
    const geojson = {
      type: "FeatureCollection" as const,
      features: beacons.map((beacon) => ({
        type: "Feature" as const,
        id: beacon.recordId,
        geometry: {
          type: "Point" as const,
          coordinates: [beacon.longitude, beacon.latitude],
        },
        properties: {
          situationId: beacon.situationId,
          recordId: beacon.recordId,
          activatedAt: beacon.activatedAt.toISOString(),
          deactivatedAt: beacon.deactivatedAt?.toISOString() || null,
          roadNumber: beacon.roadNumber,
          kmPoint: beacon.kmPoint,
          direction: beacon.direction,
          severity: beacon.severity,
          mobilityType: beacon.mobilityType,
          description: beacon.description,
        },
      })),
    };

    return NextResponse.json({
      count: beacons.length,
      lastUpdated: new Date().toISOString(),
      geojson,
      beacons: beacons.map((b) => ({
        id: b.recordId,
        lat: b.latitude,
        lng: b.longitude,
        road: b.roadNumber,
        km: b.kmPoint,
        severity: b.severity,
        activatedAt: b.activatedAt.toISOString(),
        description: b.description,
      })),
    });
  } catch (error) {
    console.error("Error fetching V16 beacons:", error);
    return NextResponse.json(
      { error: "Internal server error", beacons: [] },
      { status: 500 }
    );
  }
}
