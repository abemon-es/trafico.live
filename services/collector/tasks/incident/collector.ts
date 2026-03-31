/**
 * Incident Collector Service
 *
 * Fetches traffic incidents from all sources:
 * - DGT (National - all of Spain)
 * - SCT (Cataluña)
 * - Euskadi (País Vasco)
 * - Madrid (real-time traffic intensity)
 * - Valencia (Comunitat Valenciana)
 * - DT-GV (Basque Country DATEX II)
 * - Navarra (Comunidad Foral de Navarra)
 * - CyL (Castilla y León)
 * - Barcelona (city traffic segments)
 *
 * Stores them in the TrafficIncident table for database-first API serving.
 */

import { PrismaClient, IncidentType, Severity, RoadType, Direction } from "@prisma/client";
import { inferRoadType } from "../../shared/utils.js";
import { fetchSCTIncidents, SCTIncident } from "./sct-parser.js";
import { fetchEuskadiIncidents, EuskadiIncident } from "./euskadi-parser.js";
import { fetchDGTIncidents, DGTIncident } from "./dgt-parser.js";
import { fetchMadridIncidents, MadridIncident } from "./madrid-parser.js";
import { fetchValenciaIncidents, ValenciaIncident } from "./valencia-parser.js";
import { fetchDTGVIncidents, DTGVIncident } from "./dtgv-parser.js";
import { fetchNavarraIncidents, NavarraIncident } from "./navarra-parser.js";
import { fetchCyLIncidents, CyLIncident } from "./cyl-parser.js";
import { fetchBarcelonaIncidents, BarcelonaIncident } from "./barcelona-parser.js";

// Community codes
const COMMUNITY_CATALUNA = "09";
const COMMUNITY_PAIS_VASCO = "16";
const COMMUNITY_MADRID = "13";
const COMMUNITY_VALENCIA = "10";
const COMMUNITY_NAVARRA = "15";
const COMMUNITY_CYL = "07";

// Province codes
const PROVINCE_MADRID = "28";
const PROVINCE_VALENCIA = "46";
const PROVINCE_BARCELONA = "08";

// Community names
const COMMUNITIES: Record<string, string> = {
  "07": "Castilla y León",
  "09": "Cataluña",
  "13": "Comunidad de Madrid",
  "15": "Comunidad Foral de Navarra",
  "16": "País Vasco",
};

type IncidentData = SCTIncident | EuskadiIncident | DGTIncident | MadridIncident | DTGVIncident | NavarraIncident | CyLIncident;

function mapDirection(dir?: string): Direction | undefined {
  if (!dir) return undefined;
  const d = dir.toLowerCase();
  if (d.includes("ascend") || d.includes("creciente") || d === "positive") return "ASCENDING";
  if (d.includes("descend") || d.includes("decreciente") || d === "negative") return "DESCENDING";
  if (d.includes("both") || d.includes("ambos")) return "BOTH";
  // Don't return UNKNOWN for carriageway descriptions (rightHandSide, etc.)
  return undefined;
}

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
  incident: SCTIncident | EuskadiIncident | DTGVIncident,
  source: "SCT" | "EUSKADI" | "DT-GV",
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
    direction: mapDirection(incident.direction),
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
    direction: mapDirection(incident.direction),
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
    const [sctResult, euskadiResult, dgtResult, madridResult, valenciaResult, dtgvResult, navarraResult, cylResult, barcelonaResult] = await Promise.allSettled([
      fetchSCTIncidents(),
      fetchEuskadiIncidents(),
      fetchDGTIncidents(),
      fetchMadridIncidents(),
      fetchValenciaIncidents(),
      fetchDTGVIncidents(),
      fetchNavarraIncidents(),
      fetchCyLIncidents(),
      fetchBarcelonaIncidents(),
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

    // Process Valencia incidents (Comunitat Valenciana)
    if (valenciaResult.status === "fulfilled") {
      console.log(`[collector] Valencia returned ${valenciaResult.value.length} incidents`);
      for (const incident of valenciaResult.value) {
        allIncidents.push({
          situationId: incident.situationId,
          type: incident.type,
          startedAt: incident.startedAt,
          latitude: incident.latitude,
          longitude: incident.longitude,
          roadNumber: incident.roadNumber,
          roadType: inferRoadType(incident.roadNumber),
          province: PROVINCE_VALENCIA,
          provinceName: "Valencia",
          community: COMMUNITY_VALENCIA,
          communityName: "Comunitat Valenciana",
          description: incident.description,
          severity: incident.severity,
          source: "VALENCIA",
        });
      }
    } else {
      console.error("[collector] Valencia fetch failed:", valenciaResult.reason);
    }

    // Process DT-GV incidents (Basque Country DATEX II — official feed)
    if (dtgvResult.status === "fulfilled") {
      console.log(`[collector] DT-GV returned ${dtgvResult.value.length} incidents`);
      for (const incident of dtgvResult.value) {
        allIncidents.push(normalizeIncident(incident, "DT-GV", COMMUNITY_PAIS_VASCO));
      }
    } else {
      console.error("[collector] DT-GV fetch failed:", dtgvResult.reason);
    }

    // Process Navarra incidents
    if (navarraResult.status === "fulfilled") {
      console.log(`[collector] Navarra returned ${navarraResult.value.length} incidents`);
      for (const incident of navarraResult.value) {
        allIncidents.push({
          situationId: incident.situationId,
          type: incident.type,
          startedAt: incident.startedAt,
          endedAt: incident.endedAt,
          latitude: incident.latitude,
          longitude: incident.longitude,
          roadNumber: incident.roadNumber,
          roadType: inferRoadType(incident.roadNumber),
          province: "31",
          provinceName: "Navarra",
          community: COMMUNITY_NAVARRA,
          communityName: COMMUNITIES[COMMUNITY_NAVARRA],
          description: incident.description,
          severity: incident.severity,
          source: "NAVARRA",
        });
      }
    } else {
      console.error("[collector] Navarra fetch failed:", navarraResult.reason);
    }

    // Process Castilla y León incidents
    if (cylResult.status === "fulfilled") {
      console.log(`[collector] CyL returned ${cylResult.value.length} incidents`);
      for (const incident of cylResult.value) {
        allIncidents.push({
          situationId: incident.situationId,
          type: incident.type,
          startedAt: incident.startedAt,
          endedAt: incident.endedAt,
          latitude: incident.latitude,
          longitude: incident.longitude,
          roadNumber: incident.roadNumber,
          roadType: inferRoadType(incident.roadNumber),
          province: incident.province,
          provinceName: incident.provinceName,
          community: COMMUNITY_CYL,
          communityName: COMMUNITIES[COMMUNITY_CYL],
          description: incident.description,
          severity: incident.severity,
          source: "CYL",
        });
      }
    } else {
      console.error("[collector] CyL fetch failed:", cylResult.reason);
    }

    // Process Barcelona city incidents
    if (barcelonaResult.status === "fulfilled") {
      console.log(`[collector] Barcelona returned ${barcelonaResult.value.length} incidents`);
      for (const incident of barcelonaResult.value) {
        allIncidents.push({
          situationId: incident.situationId,
          type: incident.type,
          startedAt: incident.startedAt,
          latitude: incident.latitude,
          longitude: incident.longitude,
          province: PROVINCE_BARCELONA,
          provinceName: "Barcelona",
          community: COMMUNITY_CATALUNA,
          communityName: COMMUNITIES[COMMUNITY_CATALUNA],
          description: incident.description,
          severity: incident.severity,
          source: "BARCELONA",
        });
      }
    } else {
      console.error("[collector] Barcelona fetch failed:", barcelonaResult.reason);
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
    let processed = 0;

    // Pre-filter valid incidents
    const validIncidents = allIncidents.filter(incident => {
      if (incident.latitude === 0 && incident.longitude === 0 && !incident.roadNumber) {
        skipped++;
        return false;
      }
      return true;
    });

    // Get existing IDs to track creates vs updates
    const existingIncidents = await prisma.trafficIncident.findMany({
      where: { situationId: { in: validIncidents.map(i => i.situationId) } },
      select: { situationId: true },
    });
    const existingIds = new Set(existingIncidents.map(i => i.situationId));

    // Chunked parallel upserts (50x parallelism per chunk)
    const CHUNK = 50;
    for (let i = 0; i < validIncidents.length; i += CHUNK) {
      const chunk = validIncidents.slice(i, i + CHUNK);
      const results = await Promise.allSettled(chunk.map(incident =>
        prisma.trafficIncident.upsert({
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
            direction: incident.direction,
            description: incident.description,
            severity: incident.severity,
            // Update cause categorization if available
            causeType: incident.causeType,
            detailedCauseType: incident.detailedCauseType,
            managementType: incident.managementType,
            isActive: true,
          },
        })
      ));

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        if (result.status === "fulfilled") {
          if (existingIds.has(chunk[j].situationId)) {
            updated++;
          } else {
            created++;
          }
        } else {
          console.error(`[collector] Error processing incident ${chunk[j].situationId}:`, result.reason);
          skipped++;
        }
      }

      processed += chunk.length;
    }

    console.log(`[collector] Processing complete: ${created} created, ${updated} updated, ${skipped} skipped`);

    // Deactivate old incidents from all sources (not seen in 1 hour)
    // Calculate durationSecs based on lifecycle tracking (lastSeenAt - firstSeenAt)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // All managed sources
    const ALL_SOURCES = ["DGT", "SCT", "EUSKADI", "MADRID", "VALENCIA", "DT-GV", "NAVARRA", "CYL", "BARCELONA"];

    // Find incidents to deactivate
    const staleIncidents = await prisma.trafficIncident.findMany({
      where: {
        source: { in: ALL_SOURCES },
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
      // Deactivate all stale incidents in a single raw SQL update
      await prisma.$executeRaw`
        UPDATE "TrafficIncident"
        SET "isActive" = false,
            "durationSecs" = EXTRACT(EPOCH FROM ("lastSeenAt" - "firstSeenAt"))::int
        WHERE "isActive" = true
          AND "source" IN ('DGT', 'SCT', 'EUSKADI', 'MADRID', 'VALENCIA', 'DT-GV', 'NAVARRA', 'CYL', 'BARCELONA')
          AND "fetchedAt" < ${oneHourAgo}
      `;
      console.log(`[collector] Deactivated ${staleIncidents.length} stale incidents with duration tracking`);
    }

    // Log summary stats
    const stats = await prisma.trafficIncident.groupBy({
      by: ["source", "isActive"],
      _count: true,
      where: {
        source: { in: ALL_SOURCES },
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
