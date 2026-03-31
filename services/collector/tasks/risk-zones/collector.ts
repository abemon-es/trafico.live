/**
 * Road Risk Zones Collector
 *
 * Fetches road risk zone data from DGT DATEX II PredefinedLocationsPublication feeds:
 *   - INVIVE: speed enforcement intensification zones
 *   - Motorcycle: high motorcycle accident risk sections
 *   - TEFIVA: wildlife-vehicle collision hotspots
 *
 * All three feeds are DATEX II XML (no auth required).
 * Run weekly — data changes infrequently.
 *
 * Sources:
 *   INVIVE:     https://infocar.dgt.es/datex2/dgt/PredefinedLocationsPublication/tramos_invive/content.xml
 *   Motorcycle: https://infocar.dgt.es/datex2/dgt/PredefinedLocationsPublication/tramosriesgomotos/content.xml
 *   TEFIVA:     https://infocar.dgt.es/datex2/dgt/PredefinedLocationsPublication/tefiva/content.xml
 */

import { PrismaClient, RiskZoneType } from "@prisma/client";
import { ensureArray, log, logError } from "../../shared/utils.js";
import { createXMLParser } from "../../shared/xml.js";

const TAG = "risk-zones";

const FEEDS: { type: RiskZoneType; url: string; prefix: string }[] = [
  {
    type: "INVIVE",
    url: "https://infocar.dgt.es/datex2/dgt/PredefinedLocationsPublication/tramos_invive/content.xml",
    prefix: "INVIVE",
  },
  {
    type: "MOTORCYCLE",
    url: "https://infocar.dgt.es/datex2/dgt/PredefinedLocationsPublication/tramosriesgomotos/content.xml",
    prefix: "MOTO",
  },
  {
    type: "WILDLIFE",
    url: "https://infocar.dgt.es/datex2/dgt/PredefinedLocationsPublication/tefiva/content.xml",
    prefix: "TEFIVA",
  },
];

interface RiskZoneData {
  id: string;
  type: RiskZoneType;
  road: string;
  fromKm: number;
  toKm: number;
  startLat: number;
  startLng: number;
  endLat: number | null;
  endLng: number | null;
  province: string | null;
  description: string | null;
  severity: string | null;
  sourceUpdated: Date | null;
}

// Parser: ensure these collections are always arrays for stable iteration
const parser = createXMLParser({
  isArray: (name) =>
    [
      "predefinedLocationSet",
      "predefinedLocation",
      "name",
      "supplementaryPositionalDescription",
    ].includes(name),
});

/**
 * Extract the text value from a DATEX II multilingual string.
 * In DATEX II, names appear as:
 *   <name><descriptor><value lang="es">...</value></descriptor></name>
 */
function extractNameValue(names: unknown[]): string {
  for (const name of ensureArray(names)) {
    const n = name as Record<string, unknown>;
    const descriptor = n.descriptor as Record<string, unknown> | undefined;
    if (!descriptor) continue;
    const value = descriptor.value;
    if (typeof value === "string") return value;
    if (typeof value === "object" && value !== null) {
      const v = value as Record<string, unknown>;
      return String(v["#text"] || "");
    }
  }
  return "";
}

/**
 * Parse a single predefinedLocation element for a linear (from/to) zone.
 *
 * DATEX II linear location structure (PredefinedLocationsPublication):
 *
 *   predefinedLocation[@id]
 *     └── predefinedLocation[]          ← inner location record
 *           ├── tpeglinearLocation
 *           │     ├── from.pointCoordinates { latitude, longitude }
 *           │     └── to.pointCoordinates   { latitude, longitude }
 *           ├── referencePointLinear
 *           │     ├── referencePointPrimaryLocation
 *           │     │     └── referencePoint { roadNumber, referencePointDistance, directionRelative }
 *           │     │           └── referencePointExtension.ExtendedReferencePoint.provinceINEIdentifier
 *           │     └── referencePointSecondaryLocation
 *           │           └── referencePoint { roadNumber, referencePointDistance }
 *           └── name[]
 */
function parseZoneLocation(
  outerLoc: Record<string, unknown>,
  type: RiskZoneType,
  prefix: string,
  sourceUpdated: Date | null
): RiskZoneData | null {
  try {
    const rawId = String(outerLoc["@_id"] || "");
    if (!rawId) return null;

    // Compose a stable, prefixed ID for the zone
    const id = `${prefix}-${rawId.replace(/^GUID_/, "")}`;

    // Navigate into the inner predefinedLocation array (always array due to parser config)
    const innerLocations = ensureArray(outerLoc.predefinedLocation as unknown[]);
    const inner = innerLocations[0] as Record<string, unknown> | undefined;
    if (!inner) return null;

    // ── Coordinates from TPEG linear location ──────────────────────────
    const tpegLinear = inner.tpeglinearLocation as Record<string, unknown> | undefined;
    const fromPoint = tpegLinear?.from as Record<string, unknown> | undefined;
    const toPoint = tpegLinear?.to as Record<string, unknown> | undefined;

    const fromCoords = fromPoint?.pointCoordinates as Record<string, unknown> | undefined;
    const toCoords = toPoint?.pointCoordinates as Record<string, unknown> | undefined;

    const startLat = parseFloat(String(fromCoords?.latitude ?? 0));
    const startLng = parseFloat(String(fromCoords?.longitude ?? 0));

    if (!startLat || !startLng) return null;

    const endLat = toCoords ? parseFloat(String(toCoords.latitude ?? 0)) || null : null;
    const endLng = toCoords ? parseFloat(String(toCoords.longitude ?? 0)) || null : null;

    // ── Road + km from referencePointLinear ────────────────────────────
    const refLinear = inner.referencePointLinear as Record<string, unknown> | undefined;
    const primaryLoc = refLinear?.referencePointPrimaryLocation as Record<string, unknown> | undefined;
    const secondaryLoc = refLinear?.referencePointSecondaryLocation as Record<string, unknown> | undefined;

    const primaryRef = primaryLoc?.referencePoint as Record<string, unknown> | undefined;
    const secondaryRef = secondaryLoc?.referencePoint as Record<string, unknown> | undefined;

    const road = String(primaryRef?.roadNumber ?? "").trim();

    // referencePointDistance is in metres → convert to km
    const fromMeters = parseFloat(String(primaryRef?.referencePointDistance ?? 0));
    const toMeters = parseFloat(String(secondaryRef?.referencePointDistance ?? fromMeters));

    const fromKm = fromMeters > 0 ? Math.round(fromMeters / 100) / 10 : 0;
    const toKm = toMeters > 0 ? Math.round(toMeters / 100) / 10 : fromKm;

    // ── Province ────────────────────────────────────────────────────────
    const ext = primaryRef?.referencePointExtension as Record<string, unknown> | undefined;
    const extPoint = ext?.ExtendedReferencePoint as Record<string, unknown> | undefined;
    const rawProvince = String(extPoint?.provinceINEIdentifier ?? "");
    const province = rawProvince ? rawProvince.padStart(2, "0") : null;

    // ── Description from name array ─────────────────────────────────────
    const names = ensureArray(inner.name as unknown[]);
    const description = extractNameValue(names) || null;

    // ── Severity from supplementaryPositionalDescription ────────────────
    // Some feeds include a category or label in supplementaryPositionalDescription
    const suppDesc = inner.supplementaryPositionalDescription as Record<string, unknown> | undefined;
    const severity = suppDesc ? String(suppDesc.locationDescription ?? suppDesc.type ?? "").trim() || null : null;

    return {
      id,
      type,
      road,
      fromKm,
      toKm,
      startLat,
      startLng,
      endLat,
      endLng,
      province,
      description,
      severity,
      sourceUpdated,
    };
  } catch (err) {
    logError(TAG, "Error parsing zone location", err);
    return null;
  }
}

/**
 * Parse a full PredefinedLocationsPublication XML feed.
 * Returns all valid RiskZoneData records from the feed.
 */
function parseFeed(
  xml: string,
  type: RiskZoneType,
  prefix: string
): RiskZoneData[] {
  const zones: RiskZoneData[] = [];

  try {
    const result = parser.parse(xml);
    const publication = result?.d2LogicalModel?.payloadPublication;

    if (!publication) {
      log(TAG, `No payloadPublication in ${prefix} feed`);
      return [];
    }

    // Extract source publication time for traceability
    const sourceUpdatedRaw = publication.publicationTime ?? publication["@_publicationTime"] ?? null;
    const sourceUpdated = sourceUpdatedRaw ? new Date(String(sourceUpdatedRaw)) : null;

    // The publication may have one or more predefinedLocationSet wrappers
    const locationSets = ensureArray(publication.predefinedLocationSet as unknown[]);

    for (const locationSet of locationSets) {
      const setObj = locationSet as Record<string, unknown>;
      const locations = ensureArray(setObj.predefinedLocation as unknown[]);

      for (const loc of locations) {
        const locObj = loc as Record<string, unknown>;
        const zone = parseZoneLocation(locObj, type, prefix, sourceUpdated);
        if (zone) zones.push(zone);
      }
    }

    // Fallback: some feeds expose predefinedLocation directly under payloadPublication
    if (zones.length === 0 && publication.predefinedLocation) {
      const locations = ensureArray(publication.predefinedLocation as unknown[]);
      for (const loc of locations) {
        const locObj = loc as Record<string, unknown>;
        const zone = parseZoneLocation(locObj, type, prefix, sourceUpdated);
        if (zone) zones.push(zone);
      }
    }
  } catch (err) {
    logError(TAG, `Error parsing ${prefix} XML`, err);
  }

  return zones;
}

/**
 * Fetch a single feed URL with a 60-second timeout.
 * Returns the raw XML string, or null on any error (so we can continue with other feeds).
 */
async function fetchFeed(url: string, label: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/xml",
        "User-Agent": "TraficoEspana/1.0 (risk-zones-collector)",
      },
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      logError(TAG, `${label} feed HTTP ${response.status} ${response.statusText}`);
      return null;
    }

    const xml = await response.text();
    log(TAG, `${label}: fetched ${(xml.length / 1024).toFixed(0)}KB`);
    return xml;
  } catch (err) {
    logError(TAG, `${label} feed fetch error`, err);
    return null;
  }
}

export async function run(prisma: PrismaClient): Promise<void> {
  const now = new Date();
  log(TAG, `Starting at ${now.toISOString()}`);

  // 1. Fetch all three feeds in parallel
  const [inviveXml, motoXml, tefXml] = await Promise.all(
    FEEDS.map((f) => fetchFeed(f.url, f.prefix))
  );

  const xmlByFeed = [inviveXml, motoXml, tefXml];

  // 2. Parse each feed
  let allZones: RiskZoneData[] = [];
  const counts: Record<string, number> = {};

  for (let i = 0; i < FEEDS.length; i++) {
    const feed = FEEDS[i];
    const xml = xmlByFeed[i];

    if (!xml) {
      log(TAG, `${feed.prefix}: skipping (fetch failed)`);
      counts[feed.prefix] = 0;
      continue;
    }

    const zones = parseFeed(xml, feed.type, feed.prefix);
    counts[feed.prefix] = zones.length;
    allZones = allZones.concat(zones);
    log(TAG, `${feed.prefix}: parsed ${zones.length} zones`);
  }

  if (allZones.length === 0) {
    log(TAG, "No zones parsed from any feed — exiting");
    return;
  }

  // 3. Get existing zone IDs for stale-marking
  const existingZones = await prisma.roadRiskZone.findMany({
    select: { id: true },
  });
  const existingIds = new Set(existingZones.map((z) => z.id));

  // 4. Upsert all zones in batches of 500
  const fetchedIds = new Set<string>();
  const BATCH = 500;

  for (let i = 0; i < allZones.length; i += BATCH) {
    const batch = allZones.slice(i, i + BATCH);

    await Promise.all(
      batch.map(async (z) => {
        fetchedIds.add(z.id);
        try {
          await prisma.roadRiskZone.upsert({
            where: { id: z.id },
            create: {
              id: z.id,
              type: z.type,
              road: z.road,
              fromKm: z.fromKm,
              toKm: z.toKm,
              startLat: z.startLat,
              startLng: z.startLng,
              endLat: z.endLat ?? undefined,
              endLng: z.endLng ?? undefined,
              province: z.province ?? undefined,
              description: z.description ?? undefined,
              severity: z.severity ?? undefined,
              sourceUpdated: z.sourceUpdated ?? undefined,
              isActive: true,
            },
            update: {
              road: z.road,
              fromKm: z.fromKm,
              toKm: z.toKm,
              startLat: z.startLat,
              startLng: z.startLng,
              endLat: z.endLat ?? undefined,
              endLng: z.endLng ?? undefined,
              province: z.province ?? undefined,
              description: z.description ?? undefined,
              severity: z.severity ?? undefined,
              sourceUpdated: z.sourceUpdated ?? undefined,
              isActive: true,
            },
          });
        } catch (err) {
          logError(TAG, `Upsert failed for zone ${z.id}`, err);
        }
      })
    );
  }

  const created = allZones.filter((z) => !existingIds.has(z.id)).length;
  const updated = allZones.length - created;
  log(TAG, `Upserted: ${created} new, ${updated} updated`);

  // 5. Mark zones not present in any feed as inactive
  const missingIds = [...existingIds].filter((id) => !fetchedIds.has(id));
  if (missingIds.length > 0) {
    await prisma.roadRiskZone.updateMany({
      where: { id: { in: missingIds } },
      data: { isActive: false },
    });
    log(TAG, `Marked ${missingIds.length} stale zones as inactive`);
  }

  // 6. Summary
  log(
    TAG,
    `Risk zones: ${counts["INVIVE"] ?? 0} INVIVE, ${counts["MOTO"] ?? 0} motorcycle, ${counts["TEFIVA"] ?? 0} wildlife`
  );

  const totalActive = await prisma.roadRiskZone.count({ where: { isActive: true } });
  log(TAG, `Total active risk zones: ${totalActive}`);
  log(TAG, "Collection completed successfully");
}
