/**
 * Incident Collector Service
 *
 * Fetches traffic incidents from all sources:
 * - DGT (National - all of Spain)
 * - SCT (Cataluña)
 * - Euskadi (País Vasco)
 *
 * Stores them in the TrafficIncident table for database-first API serving.
 */

import { PrismaClient, IncidentType, Severity, RoadType, Direction } from "@prisma/client";
import { inferRoadType } from "../shared/utils.js";
import { fetchSCTIncidents, SCTIncident } from "./sct-parser.js";
import { fetchEuskadiIncidents, EuskadiIncident } from "./euskadi-parser.js";
import { fetchDGTIncidents, DGTIncident } from "./dgt-parser.js";
import { fetchMadridIncidents, MadridIncident } from "./madrid-parser.js";

// Community codes
const COMMUNITY_CATALUNA = "09";
const COMMUNITY_PAIS_VASCO = "16";
const COMMUNITY_MADRID = "13";

// Province codes
const PROVINCE_MADRID = "28";

// Community names
const COMMUNITIES: Record<string, string> = {
  "09": "Cataluña",
  "13": "Comunidad de Madrid",
  "16": "País Vasco",
};

type IncidentData = SCTIncident | EuskadiIncident | DGTIncident | MadridIncident;

interface NormalizedIncident {
  situationId: string;
  type: IncidentType;
  startedAt: Date;
  endedAt?: Date;
  latitude: number;
  longitude: number;
  roadNumber?: string;
  roadType?: RoadType;
  kmPoint?: number;
  direction?: Direction;
  province?: string;
  provinceName?: string;
  community?: string;
  communityName?: string;
  municipality?: string;
  description?: string;
  severity: Severity;
  source: string;
  // Cause categorization (DGT only)
  causeType?: string;
  detailedCauseType?: string;
  managementType?: string;
}

function normalizeIncident(
  incident: IncidentData,
  source: "SCT" | "EUSKADI",
  communityCode: string
): NormalizedIncident {
  return {
    situationId: incident.situationId,
    type: incident.type,
    startedAt: incident.startedAt,
    endedAt: incident.endedAt,
    latitude: incident.latitude,
    longitude: incident.longitude,
    roadNumber: incident.roadNumber,
    roadType: inferRoadType(incident.roadNumber),
    kmPoint: incident.kmPoint,
    direction: undefined, // Would need mapping
    province: incident.province,
    provinceName: incident.provinceName,
    community: communityCode,
    communityName: COMMUNITIES[communityCode],
    description: incident.description,
    severity: incident.severity,
    source,
  };
}

function normalizeDGTIncident(incident: DGTIncident): NormalizedIncident {
  return {
    situationId: incident.situationId,
    type: incident.type,
    startedAt: incident.startedAt,
    endedAt: incident.endedAt,
    latitude: incident.latitude,
    longitude: incident.longitude,
    roadNumber: incident.roadNumber,
    roadType: inferRoadType(incident.roadNumber),
    kmPoint: incident.kmPoint,
    direction: undefined, // DGT provides direction as string, would need mapping
    province: incident.province,
    provinceName: incident.provinceName,
    community: incident.community,
    communityName: incident.communityName,
    municipality: incident.municipality,
    description: incident.description,
    severity: incident.severity,
    source: "DGT",
    // Cause categorization from DGT
    causeType: incident.causeType,
    detailedCauseType: incident.detailedCauseType,
    managementType: incident.managementType,
  };
}

function normalizeMadridIncident(incident: MadridIncident): NormalizedIncident {
  return {
    situationId: incident.situationId,
    type: incident.type,
    startedAt: incident.startedAt,
    endedAt: undefined, // Madrid doesn't provide end times
    latitude: incident.latitude,
    longitude: incident.longitude,
    roadNumber: incident.roadNumber,
    roadType: inferRoadType(incident.roadNumber),
    kmPoint: undefined,
    direction: undefined,
    province: PROVINCE_MADRID,
    provinceName: "Madrid",
    community: COMMUNITY_MADRID,
    communityName: COMMUNITIES[COMMUNITY_MADRID],
    municipality: "Madrid",
    description: incident.description,
    severity: incident.severity,
    source: "MADRID",
  };
}

export async function run(prisma: PrismaClient) {
  const now = new Date();
  console.log(`[collector] Incident Collector v2.0 - Starting at ${now.toISOString()}`);

  try {
    // Fetch incidents from all sources in parallel
    const [sctResult, euskadiResult, dgtResult, madridResult] = await Promise.allSettled([
      fetchSCTIncidents(),
      fetchEuskadiIncidents(),
      fetchDGTIncidents(),
      fetchMadridIncidents(),
    ]);

    const allIncidents: NormalizedIncident[] = [];

    // Process DGT incidents (national - highest priority)
    if (dgtResult.status === "fulfilled") {
      console.log(`[collector] DGT returned ${dgtResult.value.length} incidents`);
      for (const incident of dgtResult.value) {
        allIncidents.push(normalizeDGTIncident(incident));
      }
    } else {
      console.error("[collector] DGT fetch failed:", dgtResult.reason);
    }

    // Process SCT incidents (Cataluña regional)
    if (sctResult.status === "fulfilled") {
      console.log(`[collector] SCT returned ${sctResult.value.length} incidents`);
      for (const incident of sctResult.value) {
        allIncidents.push(normalizeIncident(incident, "SCT", COMMUNITY_CATALUNA));
      }
    } else {
      console.error("[collector] SCT fetch failed:", sctResult.reason);
    }

    // Process Euskadi incidents (País Vasco regional)
    if (euskadiResult.status === "fulfilled") {
      console.log(`[collector] Euskadi returned ${euskadiResult.value.length} incidents`);
      for (const incident of euskadiResult.value) {
        allIncidents.push(normalizeIncident(incident, "EUSKADI", COMMUNITY_PAIS_VASCO));
      }
    } else {
      console.error("[collector] Euskadi fetch failed:", euskadiResult.reason);
    }

    // Process Madrid incidents (real-time traffic intensity)
    if (madridResult.status === "fulfilled") {
      console.log(`[collector] Madrid returned ${madridResult.value.length} incidents`);
      for (const incident of madridResult.value) {
        allIncidents.push(normalizeMadridIncident(incident));
      }
    } else {
      console.error("[collector] Madrid fetch failed:", madridResult.reason);
    }

    console.log(`[collector] Total incidents to process: ${allIncidents.length}`);

    if (allIncidents.length === 0) {
      console.log("[collector] No incidents to process");
      return;
    }

    // Batch upsert incidents
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const incident of allIncidents) {
      try {
        // Skip incidents with invalid coordinates (0,0) unless they have road info
        if (incident.latitude === 0 && incident.longitude === 0 && !incident.roadNumber) {
          skipped++;
          continue;
        }

        const result = await prisma.trafficIncident.upsert({
          where: { situationId: incident.situationId },
          create: {
            situationId: incident.situationId,
            type: incident.type,
            startedAt: incident.startedAt,
            endedAt: incident.endedAt,
            fetchedAt: now,
            // Lifecycle tracking - firstSeenAt defaults to now(), lastSeenAt set explicitly
            firstSeenAt: now,
            lastSeenAt: now,
            latitude: incident.latitude,
            longitude: incident.longitude,
            roadNumber: incident.roadNumber,
            roadType: incident.roadType,
            kmPoint: incident.kmPoint,
            direction: incident.direction,
            province: incident.province,
            provinceName: incident.provinceName,
            community: incident.community,
            communityName: incident.communityName,
            municipality: incident.municipality,
            description: incident.description,
            severity: incident.severity,
            source: incident.source,
            // Cause categorization (from DGT)
            causeType: incident.causeType,
            detailedCauseType: incident.detailedCauseType,
            managementType: incident.managementType,
            isActive: true,
          },
          update: {
            type: incident.type,
            endedAt: incident.endedAt,
            fetchedAt: now,
            // Lifecycle tracking - update lastSeenAt on every observation
            lastSeenAt: now,
            latitude: incident.latitude,
            longitude: incident.longitude,
            roadNumber: incident.roadNumber,
            roadType: incident.roadType,
            kmPoint: incident.kmPoint,
            description: incident.description,
            severity: incident.severity,
            // Update cause categorization if available
            causeType: incident.causeType,
            detailedCauseType: incident.detailedCauseType,
            managementType: incident.managementType,
            isActive: true,
          },
        });

        // Check if this was a create or update based on fetchedAt
        if (result.fetchedAt.getTime() === now.getTime() && result.startedAt.getTime() === incident.startedAt.getTime()) {
          // This is a rough heuristic - if the startedAt matches, it might be new or updated
          created++;
        } else {
          updated++;
        }
      } catch (error) {
        console.error(`[collector] Error processing incident ${incident.situationId}:`, error);
        skipped++;
      }
    }

    console.log(`[collector] Processing complete: ${created} created, ${updated} updated, ${skipped} skipped`);

    // Deactivate old incidents from all sources (not seen in 1 hour)
    // Calculate durationSecs based on lifecycle tracking (lastSeenAt - firstSeenAt)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Find incidents to deactivate
    const staleIncidents = await prisma.trafficIncident.findMany({
      where: {
        source: { in: ["DGT", "SCT", "EUSKADI", "MADRID"] },
        isActive: true,
        fetchedAt: { lt: oneHourAgo },
      },
      select: {
        id: true,
        firstSeenAt: true,
        lastSeenAt: true,
      },
    });

    if (staleIncidents.length > 0) {
      // Deactivate each incident and calculate duration
      for (const incident of staleIncidents) {
        const durationSecs = Math.round(
          (incident.lastSeenAt.getTime() - incident.firstSeenAt.getTime()) / 1000
        );
        await prisma.trafficIncident.update({
          where: { id: incident.id },
          data: {
            isActive: false,
            durationSecs,
          },
        });
      }
      console.log(`[collector] Deactivated ${staleIncidents.length} stale incidents with duration tracking`);
    }

    // Log summary stats
    const stats = await prisma.trafficIncident.groupBy({
      by: ["source", "isActive"],
      _count: true,
      where: {
        source: { in: ["DGT", "SCT", "EUSKADI", "MADRID"] },
      },
    });

    console.log("[collector] Current stats:");
    for (const stat of stats) {
      console.log(`  ${stat.source} (${stat.isActive ? "active" : "inactive"}): ${stat._count}`);
    }

  } catch (error) {
    console.error("[collector] Fatal error:", error);
    throw error;
  }

  console.log(`[collector] Finished at ${new Date().toISOString()}`);
}
