import { NextRequest, NextResponse } from "next/server";
import {
  parseDatexResponse,
  extractTrafficIncidents,
  type IncidentEffect,
  type IncidentCause,
} from "@/lib/parsers/datex2";

// Cache the response for 60 seconds
export const revalidate = 60;

const DGT_NAP_URL =
  process.env.DGT_NAP_URL || "https://nap.dgt.es/datex2/v3/dgt/SituationPublication/datex2_v36.xml";

// Effect and cause labels for UI
const EFFECT_LABELS: Record<IncidentEffect, string> = {
  ROAD_CLOSED: "Carreteras cortadas",
  SLOW_TRAFFIC: "Tráfico lento",
  RESTRICTED: "Circulación restringida",
  DIVERSION: "Desvíos y embolsamientos",
  OTHER_EFFECT: "Otras afecciones",
};

const CAUSE_LABELS: Record<IncidentCause, string> = {
  ROADWORK: "Obras",
  ACCIDENT: "Accidentes",
  WEATHER: "Meteorológicos",
  RESTRICTION: "Restricciones de circulación",
  OTHER_CAUSE: "Otras incidencias",
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Filter params (comma-separated values)
    const effectFilter = searchParams.get("effect")?.split(",").filter(Boolean) as IncidentEffect[] | undefined;
    const causeFilter = searchParams.get("cause")?.split(",").filter(Boolean) as IncidentCause[] | undefined;
    const provinceFilter = searchParams.get("province");
    const communityFilter = searchParams.get("community");

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
        { error: "Error fetching DGT data", incidents: [], counts: {} },
        { status: 502 }
      );
    }

    const xml = await response.text();

    // Parse DATEX II XML
    const situations = parseDatexResponse(xml);

    // Extract traffic incidents
    let incidents = extractTrafficIncidents(situations);

    // Calculate counts BEFORE filtering (for filter UI badges)
    const countsByEffect: Record<string, number> = {};
    const countsByCause: Record<string, number> = {};
    const countsByProvince: Record<string, number> = {};

    for (const incident of incidents) {
      countsByEffect[incident.effect] = (countsByEffect[incident.effect] || 0) + 1;
      countsByCause[incident.cause] = (countsByCause[incident.cause] || 0) + 1;
      if (incident.province) {
        countsByProvince[incident.province] = (countsByProvince[incident.province] || 0) + 1;
      }
    }

    // Apply filters
    if (effectFilter && effectFilter.length > 0) {
      incidents = incidents.filter((i) => effectFilter.includes(i.effect));
    }
    if (causeFilter && causeFilter.length > 0) {
      incidents = incidents.filter((i) => causeFilter.includes(i.cause));
    }
    if (provinceFilter) {
      const pLower = provinceFilter.toLowerCase();
      incidents = incidents.filter((i) => i.province?.toLowerCase() === pLower);
    }
    if (communityFilter) {
      const cLower = communityFilter.toLowerCase();
      incidents = incidents.filter((i) => i.community?.toLowerCase().includes(cLower));
    }

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
          effect: incident.effect,
          cause: incident.cause,
          startedAt: incident.startedAt.toISOString(),
          endedAt: incident.endedAt?.toISOString() || null,
          roadNumber: incident.roadNumber,
          kmPoint: incident.kmPoint,
          direction: incident.direction,
          province: incident.province,
          community: incident.community,
          severity: incident.severity,
          description: incident.description,
          laneInfo: incident.laneInfo,
          source: incident.source,
        },
      })),
    };

    return NextResponse.json({
      count: incidents.length,
      totalCount: situations.reduce((sum, s) => sum + s.records.length, 0),
      lastUpdated: new Date().toISOString(),
      counts: {
        byEffect: countsByEffect,
        byCause: countsByCause,
        byProvince: countsByProvince,
      },
      labels: {
        effects: EFFECT_LABELS,
        causes: CAUSE_LABELS,
      },
      geojson,
      incidents: incidents.map((i) => ({
        id: i.situationId,
        lat: i.latitude,
        lng: i.longitude,
        type: i.type,
        effect: i.effect,
        cause: i.cause,
        road: i.roadNumber,
        km: i.kmPoint,
        province: i.province,
        community: i.community,
        severity: i.severity,
        description: i.description,
        laneInfo: i.laneInfo,
      })),
    });
  } catch (error) {
    console.error("Error fetching incidents:", error);
    return NextResponse.json(
      { error: "Internal server error", incidents: [], counts: {} },
      { status: 500 }
    );
  }
}
