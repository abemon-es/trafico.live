import { NextResponse } from "next/server";
import {
  parseDatexResponse,
  extractTrafficIncidents,
} from "@/lib/parsers/datex2";

// Cache the response for 60 seconds
export const revalidate = 60;

const DGT_NAP_URL =
  process.env.DGT_NAP_URL || "https://nap.dgt.es/datex2/v3/dgt/SituationPublication/datex2_v36.xml";

export async function GET() {
  try {
    // Fetch from DGT NAP API
    const response = await fetch(DGT_NAP_URL, {
      headers: {
        Accept: "application/xml",
        "User-Agent": "TraficoEspana/1.0 (https://trafico.abemon.es)",
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      console.error(`DGT API error: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: "Error fetching DGT data", incidents: [] },
        { status: 502 }
      );
    }

    const xml = await response.text();

    // Parse DATEX II XML
    const situations = parseDatexResponse(xml);

    // Extract traffic incidents
    const incidents = extractTrafficIncidents(situations);

    // Convert to GeoJSON for map consumption
    const geojson = {
      type: "FeatureCollection" as const,
      features: incidents.map((incident) => ({
        type: "Feature" as const,
        id: incident.situationId,
        geometry: {
          type: "Point" as const,
          coordinates: [incident.longitude, incident.latitude],
        },
        properties: {
          situationId: incident.situationId,
          type: incident.type,
          startedAt: incident.startedAt.toISOString(),
          endedAt: incident.endedAt?.toISOString() || null,
          roadNumber: incident.roadNumber,
          kmPoint: incident.kmPoint,
          direction: incident.direction,
          severity: incident.severity,
          description: incident.description,
          source: incident.source,
        },
      })),
    };

    return NextResponse.json({
      count: incidents.length,
      lastUpdated: new Date().toISOString(),
      geojson,
      incidents: incidents.map((i) => ({
        id: i.situationId,
        lat: i.latitude,
        lng: i.longitude,
        type: i.type,
        road: i.roadNumber,
        km: i.kmPoint,
        severity: i.severity,
        description: i.description,
      })),
    });
  } catch (error) {
    console.error("Error fetching incidents:", error);
    return NextResponse.json(
      { error: "Internal server error", incidents: [] },
      { status: 500 }
    );
  }
}
