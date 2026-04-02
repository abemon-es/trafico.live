/**
 * DGT Extras Collector — Roadworks / Connected Cones
 *
 * Best-effort collector for DGT NAP feeds that may not yet be publicly
 * accessible. Attempts several known DGT DATEX II endpoints for roadworks
 * and connected-cone (conos conectados) data.
 *
 * If no feeds are reachable, logs a warning and exits gracefully.
 * No exceptions are thrown — this collector is non-critical.
 *
 * When DGT NAP exposes stable roadworks endpoints, update the URL list
 * below and implement the corresponding parser section.
 *
 * TODO: Confirm live URLs once DGT opens NAP v3 roadworks feeds.
 * Known candidates (as of April 2026):
 *   - https://nap.dgt.es/datex2/v3/dgt/SituationPublication/conos_conectados.xml
 *   - https://infocar.dgt.es/datex2/dgt/SituationPublication/obras/content.xml
 *   - https://nap.dgt.es/datex2/v3/dgt/SituationPublication/obras.xml
 */

import { PrismaClient, Direction, RoadType } from "@prisma/client";
import { log, logError, ensureArray, inferRoadType } from "../../shared/utils.js";
import { createXMLParser } from "../../shared/xml.js";

const TASK = "dgt-extras";

// ---------------------------------------------------------------------------
// Candidate endpoint list — tried in order until one succeeds
// ---------------------------------------------------------------------------

const ROADWORKS_CANDIDATES = [
  "https://nap.dgt.es/datex2/v3/dgt/SituationPublication/conos_conectados.xml",
  "https://infocar.dgt.es/datex2/dgt/SituationPublication/obras/content.xml",
  "https://nap.dgt.es/datex2/v3/dgt/SituationPublication/obras.xml",
  "https://nap.dgt.es/datex2/v3/dgt/SituationPublication/roadworks.xml",
];

const HEADERS = { "User-Agent": "trafico.live-collector/1.0" };

const parser = createXMLParser({
  isArray: (name) => ["situation", "situationRecord", "location"].includes(name),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RoadworksData {
  sourceId: string;
  roadNumber: string | null;
  roadType: RoadType | null;
  kmStart: number | null;
  kmEnd: number | null;
  direction: Direction | null;
  latitude: number;
  longitude: number;
  description: string | null;
  startDate: Date | null;
  endDate: Date | null;
  province: string | null;
}

// ---------------------------------------------------------------------------
// Probe — try each URL until one returns a 200 with XML content
// ---------------------------------------------------------------------------

async function probeEndpoints(): Promise<{ url: string; xml: string } | null> {
  for (const url of ROADWORKS_CANDIDATES) {
    try {
      const resp = await fetch(url, {
        headers: HEADERS,
        signal: AbortSignal.timeout(15000),
      });

      if (!resp.ok) {
        log(TASK, `  ${url} → HTTP ${resp.status} (skipping)`);
        continue;
      }

      const text = await resp.text();
      if (!text.trim().startsWith("<")) {
        log(TASK, `  ${url} → not XML (skipping)`);
        continue;
      }

      log(TASK, `  ${url} → OK (${text.length} bytes)`);
      return { url, xml: text };
    } catch (err) {
      log(TASK, `  ${url} → unreachable: ${(err as Error).message}`);
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// DATEX II XML parser for roadworks
//
// Handles typical DGT SituationPublication structure:
//   <situationPublication>
//     <situation>
//       <situationRecord xsi:type="Roadworks">
//         <situationRecordCreationTime>…</situationRecordCreationTime>
//         <validityTimeSpecification>…</validityTimeSpecification>
//         <groupOfLocations>…</groupOfLocations>
//         <generalPublicComment>…</generalPublicComment>
//       </situationRecord>
//     </situation>
//   </situationPublication>
// ---------------------------------------------------------------------------

function extractCoords(record: Record<string, unknown>): { lat: number; lon: number } | null {
  const loc = (record.groupOfLocations || record.locationReference) as Record<string, unknown> | undefined;
  if (!loc) return null;

  // AlertCPoint / pointByCoordinates
  const alertC = loc.alertCMethod2PrimaryPointLocation as Record<string, unknown> | undefined;
  const alertCCoords = alertC?.alertCPoint as Record<string, unknown> | undefined;

  // Direct PointCoordinates
  const pt = (loc.pointCoordinates ||
    alertCCoords?.pointCoordinates ||
    (loc.tpegPointLocation as Record<string, unknown> | undefined)?.point) as Record<string, unknown> | undefined;

  if (pt) {
    const lat = parseFloat(String(pt.latitude || pt.lat || ""));
    const lon = parseFloat(String(pt.longitude || pt.lon || pt.lng || ""));
    if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
      return { lat, lon };
    }
  }

  // Linear location — use from-point
  const linear = loc.tpegLinearLocation as Record<string, unknown> | undefined;
  if (linear) {
    const from = linear.from as Record<string, unknown> | undefined;
    const latFrom = parseFloat(String((from?.pointCoordinates as Record<string, unknown> | undefined)?.latitude || ""));
    const lonFrom = parseFloat(String((from?.pointCoordinates as Record<string, unknown> | undefined)?.longitude || ""));
    if (!isNaN(latFrom) && !isNaN(lonFrom) && latFrom !== 0) {
      return { lat: latFrom, lon: lonFrom };
    }
  }

  return null;
}

function extractText(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.trim() || null;
  // DATEX II multilingual: { values: { value: [{ "#text": "…" }] } }
  const v = value as Record<string, unknown>;
  if (v.values) {
    const vals = ensureArray((v.values as Record<string, unknown>).value);
    return (vals[0] as Record<string, unknown>)?.["#text"] as string || null;
  }
  return null;
}

function extractDate(value: unknown): Date | null {
  if (!value) return null;
  const str = String(value).trim();
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function parseRoadworks(xml: string): RoadworksData[] {
  const parsed = parser.parse(xml);

  // Navigate to situations
  const pub =
    parsed?.["d2LogicalModel"]?.payloadPublication ||
    parsed?.situationPublication ||
    parsed?.["SituationPublication"] ||
    {};

  const situations = ensureArray(pub.situation || []);
  const result: RoadworksData[] = [];

  for (const situation of situations) {
    const sitId = String(situation["@_id"] || situation.situationId || "");
    const records = ensureArray(situation.situationRecord || []);

    for (const record of records) {
      const recId = String(record["@_id"] || "");
      const sourceId = `DGT-RW-${sitId}-${recId}`.replace(/\s+/g, "_").slice(0, 100);

      const coords = extractCoords(record as Record<string, unknown>);
      if (!coords) continue;

      // Validity
      const validity = record.validity || record.validityTimeSpecification || {};
      const startDate = extractDate(
        (validity as Record<string, unknown>).validityTimeSpecification?.overallStartTime ||
        (validity as Record<string, unknown>).overallStartTime
      );
      const endDate = extractDate(
        (validity as Record<string, unknown>).validityTimeSpecification?.overallEndTime ||
        (validity as Record<string, unknown>).overallEndTime
      );

      // Road info
      const roadRef = extractText(record.roadReference || record.roadNumber || record.groupOfLocations) || null;
      const kmStart = parseFloat(String(record.fromMeasure || record.linearExtent?.fromPoint?.distanceAlongRoute || "")) || null;
      const kmEnd = parseFloat(String(record.toMeasure || record.linearExtent?.toPoint?.distanceAlongRoute || "")) || null;

      // Direction
      let direction: Direction | null = null;
      const dirStr = String(record.directionBound || record.direction || "").toLowerCase();
      if (dirStr.includes("pos") || dirStr.includes("asc") || dirStr === "positive") direction = "ASCENDING";
      else if (dirStr.includes("neg") || dirStr.includes("desc")) direction = "DESCENDING";
      else if (dirStr.includes("both")) direction = "BOTH";

      // Description
      const desc =
        extractText(record.generalPublicComment?.comment) ||
        extractText(record.cause?.managementType) ||
        "Obras en la vía";

      const roadNumber = roadRef ? roadRef.replace(/[^A-Z0-9\-]/g, "").slice(0, 20) : null;

      result.push({
        sourceId,
        roadNumber,
        roadType: roadNumber ? inferRoadType(roadNumber) : null,
        kmStart: isNaN(kmStart as number) ? null : kmStart,
        kmEnd: isNaN(kmEnd as number) ? null : kmEnd,
        direction,
        latitude: coords.lat,
        longitude: coords.lon,
        description: desc,
        startDate,
        endDate,
        province: null,
      });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// DB upsert
// ---------------------------------------------------------------------------

async function upsertRoadworks(
  prisma: PrismaClient,
  zones: RoadworksData[]
): Promise<number> {
  if (zones.length === 0) return 0;

  let count = 0;
  const batchSize = 50;

  for (let i = 0; i < zones.length; i += batchSize) {
    const batch = zones.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((z) =>
        prisma.roadworksZone.upsert({
          where: { sourceId: z.sourceId },
          update: {
            roadNumber: z.roadNumber,
            roadType: z.roadType,
            kmStart: z.kmStart,
            kmEnd: z.kmEnd,
            direction: z.direction,
            latitude: z.latitude,
            longitude: z.longitude,
            description: z.description,
            startDate: z.startDate,
            endDate: z.endDate,
            isActive: true,
            province: z.province,
          },
          create: {
            sourceId: z.sourceId,
            roadNumber: z.roadNumber,
            roadType: z.roadType,
            kmStart: z.kmStart,
            kmEnd: z.kmEnd,
            direction: z.direction,
            latitude: z.latitude,
            longitude: z.longitude,
            description: z.description,
            startDate: z.startDate,
            endDate: z.endDate,
            isActive: true,
            province: z.province,
          },
        })
      )
    );

    count += results.filter((r) => r.status === "fulfilled").length;
  }

  return count;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function run(prisma: PrismaClient): Promise<void> {
  log(TASK, "Starting DGT extras collection (roadworks / connected cones)");
  log(TASK, "Probing DGT NAP roadworks endpoints...");

  const found = await probeEndpoints();

  if (!found) {
    log(TASK, "DGT extras: no accessible feeds found — placeholder collector");
    log(TASK, "TODO: Update ROADWORKS_CANDIDATES when DGT NAP v3 roadworks feeds become available");
    return;
  }

  log(TASK, `Parsing roadworks from: ${found.url}`);

  let zones: RoadworksData[] = [];
  try {
    zones = parseRoadworks(found.xml);
  } catch (error) {
    logError(TASK, "Failed to parse roadworks XML:", error);
    return;
  }

  log(TASK, `Parsed ${zones.length} roadworks zones`);

  if (zones.length === 0) {
    log(TASK, "No roadworks zones found in feed");
    return;
  }

  const upserted = await upsertRoadworks(prisma, zones);
  log(TASK, `Upserted ${upserted} roadworks zones`);

  // Mark zones not seen in this run as inactive (not in the current feed)
  const staleCount = await prisma.$executeRaw`
    UPDATE "RoadworksZone"
    SET "isActive" = false
    WHERE "isActive" = true
      AND "updatedAt" < NOW() - INTERVAL '2 hours'
  `;
  if (Number(staleCount) > 0) {
    log(TASK, `Deactivated ${staleCount} stale roadworks zones`);
  }

  log(TASK, "DGT extras collection complete");
}
