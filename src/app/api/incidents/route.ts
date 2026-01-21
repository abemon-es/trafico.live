import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { IncidentType, TrafficIncident } from "@prisma/client";

// Cache the response for 60 seconds
export const revalidate = 60;

// Effect categories for UI grouping
type IncidentEffect = "ROAD_CLOSED" | "SLOW_TRAFFIC" | "RESTRICTED" | "DIVERSION" | "OTHER_EFFECT";
type IncidentCause = "ROADWORK" | "ACCIDENT" | "WEATHER" | "RESTRICTION" | "OTHER_CAUSE";

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

// Map database IncidentType to API IncidentEffect
function mapTypeToEffect(type: IncidentType): IncidentEffect {
  switch (type) {
    case "ROADWORK":
      return "RESTRICTED";
    case "ACCIDENT":
      return "ROAD_CLOSED";
    case "WEATHER":
      return "RESTRICTED";
    case "CONGESTION":
      return "SLOW_TRAFFIC";
    case "CLOSURE":
      return "ROAD_CLOSED";
    case "HAZARD":
    case "VEHICLE_BREAKDOWN":
      return "SLOW_TRAFFIC";
    case "EVENT":
      return "RESTRICTED";
    default:
      return "OTHER_EFFECT";
  }
}

// Map database IncidentType to API IncidentCause
function mapTypeToCause(type: IncidentType): IncidentCause {
  switch (type) {
    case "ROADWORK":
      return "ROADWORK";
    case "ACCIDENT":
    case "VEHICLE_BREAKDOWN":
      return "ACCIDENT";
    case "WEATHER":
      return "WEATHER";
    case "CLOSURE":
    case "EVENT":
      return "RESTRICTION";
    default:
      return "OTHER_CAUSE";
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Filter params (comma-separated values)
    const effectFilter = searchParams.get("effect")?.split(",").filter(Boolean) as IncidentEffect[] | undefined;
    const causeFilter = searchParams.get("cause")?.split(",").filter(Boolean) as IncidentCause[] | undefined;
    const provinceFilter = searchParams.get("province");
    const communityFilter = searchParams.get("community");
    const sourceFilter = searchParams.get("source")?.split(",").filter(Boolean);

    // Query all active incidents from database (DGT + SCT + Euskadi)
    const whereClause: Record<string, unknown> = { isActive: true };

    // Source filter (optional)
    if (sourceFilter && sourceFilter.length > 0) {
      whereClause.source = { in: sourceFilter };
    }

    const dbIncidents = await prisma.trafficIncident.findMany({
      where: whereClause,
      orderBy: { startedAt: "desc" },
    });

    // Transform to API format with effect/cause mapping
    let incidents = dbIncidents.map((db: TrafficIncident) => ({
      situationId: db.situationId,
      type: db.type,
      effect: mapTypeToEffect(db.type),
      cause: mapTypeToCause(db.type),
      startedAt: db.startedAt,
      endedAt: db.endedAt ?? undefined,
      latitude: Number(db.latitude),
      longitude: Number(db.longitude),
      roadNumber: db.roadNumber ?? undefined,
      kmPoint: db.kmPoint ? Number(db.kmPoint) : undefined,
      direction: db.direction ?? undefined,
      province: db.province ?? undefined,
      provinceName: db.provinceName ?? undefined,
      community: db.community ?? undefined,
      communityName: db.communityName ?? undefined,
      severity: db.severity as "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH",
      description: db.description ?? undefined,
      source: db.source ?? undefined,
    }));

    // Calculate counts BEFORE filtering (for filter UI badges)
    const countsByEffect: Record<string, number> = {};
    const countsByCause: Record<string, number> = {};
    const countsByProvince: Record<string, number> = {};
    const countsBySource: Record<string, number> = {};

    for (const incident of incidents) {
      countsByEffect[incident.effect] = (countsByEffect[incident.effect] || 0) + 1;
      countsByCause[incident.cause] = (countsByCause[incident.cause] || 0) + 1;
      if (incident.province) {
        countsByProvince[incident.province] = (countsByProvince[incident.province] || 0) + 1;
      }
      if (incident.source) {
        countsBySource[incident.source] = (countsBySource[incident.source] || 0) + 1;
      }
    }

    const totalCount = incidents.length;

    // Apply filters
    if (effectFilter && effectFilter.length > 0) {
      incidents = incidents.filter((i) => effectFilter.includes(i.effect));
    }
    if (causeFilter && causeFilter.length > 0) {
      incidents = incidents.filter((i) => causeFilter.includes(i.cause));
    }
    if (provinceFilter) {
      const pLower = provinceFilter.toLowerCase();
      incidents = incidents.filter((i) => i.province?.toLowerCase() === pLower || i.provinceName?.toLowerCase().includes(pLower));
    }
    if (communityFilter) {
      const cLower = communityFilter.toLowerCase();
      incidents = incidents.filter((i) => i.community?.toLowerCase() === cLower || i.communityName?.toLowerCase().includes(cLower));
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
          provinceName: incident.provinceName,
          community: incident.community,
          communityName: incident.communityName,
          severity: incident.severity,
          description: incident.description,
          source: incident.source,
        },
      })),
    };

    // Get last fetch time for freshness indicator
    const latestFetch = dbIncidents.length > 0
      ? dbIncidents.reduce((latest, i) =>
          i.fetchedAt > latest ? i.fetchedAt : latest,
          dbIncidents[0].fetchedAt
        )
      : new Date();

    return NextResponse.json({
      count: incidents.length,
      totalCount,
      lastUpdated: latestFetch.toISOString(),
      source: "database",
      counts: {
        byEffect: countsByEffect,
        byCause: countsByCause,
        byProvince: countsByProvince,
        bySource: countsBySource,
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
        province: i.provinceName || i.province,
        community: i.communityName || i.community,
        severity: i.severity,
        description: i.description,
        source: i.source,
      })),
    });
  } catch (error) {
    console.error("Error fetching incidents from database:", error);
    return NextResponse.json(
      { error: "Internal server error", incidents: [], counts: {} },
      { status: 500 }
    );
  }
}
