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
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { fetchSCTIncidents, SCTIncident } from "./sct-parser.js";
import { fetchEuskadiIncidents, EuskadiIncident } from "./euskadi-parser.js";
import { fetchDGTIncidents, DGTIncident } from "./dgt-parser.js";

// Community codes
const COMMUNITY_CATALUNA = "09";
const COMMUNITY_PAIS_VASCO = "16";

// Community names
const COMMUNITIES: Record<string, string> = {
  "09": "Cataluña",
  "16": "País Vasco",
};

type IncidentData = SCTIncident | EuskadiIncident | DGTIncident;

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
  description?: string;
  severity: Severity;
  source: string;
}

function inferRoadType(roadNumber: string | undefined): RoadType | undefined {
  if (!roadNumber) return undefined;

  const road = roadNumber.toUpperCase().trim();

  // AP-* toll motorways
  if (road.startsWith("AP-")) return "AUTOPISTA";
  // A-* motorways (autovías)
  if (road.startsWith("A-")) return "AUTOVIA";
  // N-* national roads
  if (road.startsWith("N-")) return "NACIONAL";
  // C-* regional roads (comarcal)
  if (road.startsWith("C-")) return "COMARCAL";
  // E-* European routes - map to AUTOVIA (usually overlays A-* roads)
  if (road.startsWith("E-")) return "AUTOVIA";
  // Regional/provincial roads (B-, GI-, BI-, etc.)
  if (road.match(/^[A-Z]{1,3}-\d/)) return "PROVINCIAL";

  return "OTHER";
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
    description: incident.description,
    severity: incident.severity,
    source: "DGT",
  };
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const now = new Date();
  console.log(`[collector] Incident Collector v2.0 - Starting at ${now.toISOString()}`);

  try {
    // Fetch incidents from all sources in parallel
    const [sctResult, euskadiResult, dgtResult] = await Promise.allSettled([
      fetchSCTIncidents(),
      fetchEuskadiIncidents(),
      fetchDGTIncidents(),
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
            description: incident.description,
            severity: incident.severity,
            source: incident.source,
            isActive: true,
          },
          update: {
            type: incident.type,
            endedAt: incident.endedAt,
            fetchedAt: now,
            latitude: incident.latitude,
            longitude: incident.longitude,
            roadNumber: incident.roadNumber,
            roadType: incident.roadType,
            kmPoint: incident.kmPoint,
            description: incident.description,
            severity: incident.severity,
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
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const deactivated = await prisma.trafficIncident.updateMany({
      where: {
        source: { in: ["DGT", "SCT", "EUSKADI"] },
        isActive: true,
        fetchedAt: { lt: oneHourAgo },
      },
      data: { isActive: false },
    });

    if (deactivated.count > 0) {
      console.log(`[collector] Deactivated ${deactivated.count} stale incidents`);
    }

    // Log summary stats
    const stats = await prisma.trafficIncident.groupBy({
      by: ["source", "isActive"],
      _count: true,
      where: {
        source: { in: ["DGT", "SCT", "EUSKADI"] },
      },
    });

    console.log("[collector] Current stats:");
    for (const stat of stats) {
      console.log(`  ${stat.source} (${stat.isActive ? "active" : "inactive"}): ${stat._count}`);
    }

  } catch (error) {
    console.error("[collector] Fatal error:", error);
    process.exit(1);
  }

  console.log(`[collector] Finished at ${new Date().toISOString()}`);
}

main();
