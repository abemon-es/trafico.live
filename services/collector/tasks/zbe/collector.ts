/**
 * ZBE (Zona de Bajas Emisiones) Collector
 *
 * Fetches Low Emission Zone boundaries and restrictions from DGT's
 * ControlledZoneTablePublication (DATEX II v3) for Spanish cities.
 *
 * Auto-discovers cities from the directory listing at:
 *   https://infocar.dgt.es/datex2/v3/dgt/zbe/ControledZonePublication/
 *
 * DGT migrated to a new XML schema in 2025 — this collector handles
 * the ControlledZoneTablePublication format with openlrPolygonCorners
 * geometry and NonCodableCondition sticker restrictions.
 *
 * Run weekly — boundaries and restrictions change infrequently.
 */

import { PrismaClient } from "@prisma/client";
import { ensureArray, log, logError } from "../../shared/utils.js";
import { createXMLParser } from "../../shared/xml.js";

const TAG = "zbe";

const ZBE_BASE_URL = "https://infocar.dgt.es/datex2/v3/dgt/zbe/ControledZonePublication";

// ── Types ────────────────────────────────────────────────────────────────────

interface ZBEZoneData {
  id: string;
  name: string;
  cityName: string;
  polygon: GeoJSONPolygon;
  centroid: { lat: number; lng: number } | null;
  restrictions: Record<string, string>;
  schedule: ScheduleEntry[] | null;
  activeAllYear: boolean;
  fineAmount: number | null;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
  sourceUrl: string;
  description: string | null;
  infoUrl: string | null;
}

interface GeoJSONPolygon {
  type: "Polygon";
  coordinates: number[][][];
}

interface ScheduleEntry {
  day: string;
  from: string;
  to: string;
}

// ── XML Parser ───────────────────────────────────────────────────────────────

const parser = createXMLParser({
  isArray: (name) =>
    [
      "controlledZone",
      "controlledZoneTable",
      "conditions",
      "openlrCoordinates",
      "openlrPolygonCorners",
      "locationContainedInGroup",
      "trafficRegulation",
      "trafficRegulationOrder",
      "value",
    ].includes(name),
});

// ── Auto-discovery ──────────────────────────────────────────────────────────

async function discoverCities(): Promise<string[]> {
  try {
    const response = await fetch(`${ZBE_BASE_URL}/`, {
      headers: { "User-Agent": "trafico.live/zbe-collector" },
      signal: AbortSignal.timeout(15_000),
      redirect: "follow",
    });

    if (!response.ok) {
      log(TAG, `Directory listing returned ${response.status} — using fallback list`);
      return [];
    }

    const html = await response.text();
    const matches = html.matchAll(/href="[^"]*\/([^/"]+)\.xml"/g);
    const cities: string[] = [];
    for (const m of matches) {
      cities.push(decodeURIComponent(m[1]));
    }

    if (cities.length > 0) {
      log(TAG, `Auto-discovered ${cities.length} cities from directory listing`);
    } else {
      log(TAG, "Directory listing returned 0 XML hrefs — falling back to static list");
    }
    return cities;
  } catch {
    log(TAG, "Directory discovery failed — using fallback list");
    return [];
  }
}

const FALLBACK_CITIES = [
  "Madrid", "MadridCentral", "Barcelona", "RondasDeBarcelona", "Bilbao",
  "Granada", "Valladolid", "Palma", "Alicante", "Malaga", "Oviedo",
  "ACoruña", "PamplonaEnsanche", "SevillaCartuja", "Donostia-SanSebastian",
  "VitoriaGasteiz", "LasRozas", "AlcalaDeHenares", "Fuenlabrada",
  "Castellon", "Cartagena", "Benidorm", "Pontevedra", "Lleida",
  "Girona", "Salamanca", "Avila", "Torremolinos", "DosHermanas", "Motril",
  "Reus", "Rubi", "Sabadell", "Tarragona", "Terrasa", "Mataro", "Manlleu",
  "Granollers", "MolinaDeSegura", "Viladecans", "SantJoanDespi", "Gava",
  "CerdanyolaDelValles", "SantBoiDeLlobregat", "SantCugatDelValles",
  "ElPratDeLlobregat",
];

// ── Geometry parsing ────────────────────────────────────────────────────────

function parseOpenlrPolygon(coordsList: unknown[]): GeoJSONPolygon | null {
  const coords: number[][] = [];

  for (const c of coordsList) {
    const cObj = c as Record<string, unknown>;
    const lat = parseFloat(String(cObj.latitude ?? 0));
    const lon = parseFloat(String(cObj.longitude ?? 0));

    // Sanity: Spain mainland + islands (filter out UTM or garbage)
    if (lat < 27 || lat > 44 || lon < -19 || lon > 5) continue;
    coords.push([lon, lat]); // GeoJSON: [longitude, latitude]
  }

  if (coords.length < 3) return null;

  // Close the ring if not already closed
  const first = coords[0];
  const last = coords[coords.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    coords.push([first[0], first[1]]);
  }

  return { type: "Polygon", coordinates: [coords] };
}

function computeCentroid(polygon: GeoJSONPolygon): { lat: number; lng: number } | null {
  const ring = polygon.coordinates[0];
  if (!ring || ring.length === 0) return null;

  let sumLon = 0, sumLat = 0;
  const points = ring[ring.length - 1][0] === ring[0][0] ? ring.slice(0, -1) : ring;

  for (const [lon, lat] of points) {
    sumLon += lon;
    sumLat += lat;
  }

  return {
    lat: Math.round((sumLat / points.length) * 1e6) / 1e6,
    lng: Math.round((sumLon / points.length) * 1e6) / 1e6,
  };
}

// ── Restriction parsing ─────────────────────────────────────────────────────

function extractTextValue(obj: unknown): string {
  if (typeof obj === "string") return obj.trim();
  if (typeof obj === "object" && obj !== null) {
    const o = obj as Record<string, unknown>;
    if (o["#text"]) return String(o["#text"]).trim();
    const values = o.values as Record<string, unknown> | undefined;
    if (values) {
      const vals = ensureArray(values.value as unknown[]);
      for (const v of vals) {
        const text = typeof v === "string" ? v : (v as Record<string, unknown>)?.["#text"];
        if (text) return String(text).trim();
      }
    }
  }
  return "";
}

/**
 * Extract sticker restrictions from the new ControlledZoneTablePublication format.
 *
 * Structure:
 *   trafficRegulationOrder > trafficRegulation > condition(ConditionSet)
 *     > conditions(ConditionSet, negate=true)
 *       > conditions(NonCodableCondition, type=stickerCondition)
 *         > condition.values.value = "0"|"B"|"C"|"ECO"|"Sin distintivo"
 *
 * The negate=true ConditionSet means "these stickers are EXEMPT from noEntry".
 * So stickers listed under negate=true → allowed, everything else → denied.
 */
function extractRestrictions(zone: Record<string, unknown>): Record<string, string> {
  const restrictions: Record<string, string> = {};

  try {
    const regOrders = ensureArray(zone.trafficRegulationOrder as unknown[]);

    for (const order of regOrders) {
      const orderObj = order as Record<string, unknown>;
      const regs = ensureArray(orderObj.trafficRegulation as unknown[]);

      for (const reg of regs) {
        const regObj = reg as Record<string, unknown>;
        // Get the regulation type (noEntry, etc.)
        const typeObj = regObj.typeOfRegulation as Record<string, unknown> | undefined;
        const regType = String(typeObj?.accessRestrictionType ?? "noEntry");

        // Traverse condition sets to find sticker conditions
        const rootCondition = regObj.condition as Record<string, unknown> | undefined;
        if (!rootCondition) continue;

        collectStickerConditions(rootCondition, regType, false, restrictions);
      }
    }
  } catch {
    // Non-fatal — return whatever we have
  }

  return restrictions;
}

function collectStickerConditions(
  condition: Record<string, unknown>,
  regType: string,
  parentNegate: boolean,
  result: Record<string, string>
): void {
  const negate = parentNegate || String(condition.negate) === "true";
  const condType = String(condition["@_type"] ?? "");

  // NonCodableCondition with stickerCondition → this is a sticker label
  if (condType.includes("NonCodableCondition")) {
    const type = extractTextValue(condition.type);
    if (type === "stickerCondition") {
      const label = extractTextValue(condition.condition);
      if (label) {
        // Under negate=true + noEntry → this sticker is ALLOWED
        // Under no negate + noEntry → this sticker is DENIED
        result[label] = negate ? "allowed" : "denied";
      }
    }
    return;
  }

  // Recurse into nested ConditionSets
  const subConditions = ensureArray(condition.conditions as unknown[]);
  for (const sub of subConditions) {
    const subObj = sub as Record<string, unknown>;
    collectStickerConditions(subObj, regType, negate, result);
  }
}

// ── Geometry extraction from conditions tree ────────────────────────────────

function extractPolygon(zone: Record<string, unknown>): GeoJSONPolygon | null {
  // Walk through: trafficRegulationOrder > trafficRegulation > condition >
  //   conditions(LocationCondition) > implementedLocation > locationContainedInGroup >
  //   openlrAreaLocationReference > openlrPolygonCorners > openlrCoordinates[]
  try {
    const regOrders = ensureArray(zone.trafficRegulationOrder as unknown[]);

    for (const order of regOrders) {
      const regs = ensureArray((order as Record<string, unknown>).trafficRegulation as unknown[]);
      for (const reg of regs) {
        const polygon = findPolygonInCondition((reg as Record<string, unknown>).condition as Record<string, unknown>);
        if (polygon) return polygon;
      }
    }
  } catch {
    // Non-fatal
  }
  return null;
}

function findPolygonInCondition(condition: Record<string, unknown> | undefined): GeoJSONPolygon | null {
  if (!condition) return null;

  // Check if this condition has geometry directly
  const implLoc = condition.implementedLocation as Record<string, unknown> | undefined;
  if (implLoc) {
    const groups = ensureArray(implLoc.locationContainedInGroup as unknown[]);
    for (const group of groups) {
      const gObj = group as Record<string, unknown>;
      const areaRef = gObj.openlrAreaLocationReference as Record<string, unknown> | undefined;
      if (areaRef) {
        const corners = ensureArray(areaRef.openlrPolygonCorners as unknown[]);
        for (const cornerSet of corners) {
          const coords = ensureArray((cornerSet as Record<string, unknown>).openlrCoordinates ??
            (Array.isArray(cornerSet) ? cornerSet : [cornerSet]) as unknown[]);
          // If cornerSet IS the coordinates array (flat structure)
          const coordsList = coords.length > 0 && typeof (coords[0] as Record<string, unknown>).latitude !== "undefined"
            ? coords
            : ensureArray((cornerSet as Record<string, unknown>).openlrCoordinates as unknown[]);

          if (coordsList.length >= 3) {
            const polygon = parseOpenlrPolygon(coordsList);
            if (polygon) return polygon;
          }
        }
        // Also try direct openlrCoordinates under openlrAreaLocationReference
        const directCoords = ensureArray(areaRef.openlrCoordinates as unknown[]);
        if (directCoords.length >= 3) {
          const polygon = parseOpenlrPolygon(directCoords);
          if (polygon) return polygon;
        }
      }
    }
  }

  // Recurse into nested conditions
  const subConditions = ensureArray(condition.conditions as unknown[]);
  for (const sub of subConditions) {
    const polygon = findPolygonInCondition(sub as Record<string, unknown>);
    if (polygon) return polygon;
  }

  return null;
}

// ── Validity/schedule extraction ────────────────────────────────────────────

function extractValidity(zone: Record<string, unknown>): {
  effectiveFrom: Date;
  effectiveUntil: Date | null;
  schedule: ScheduleEntry[] | null;
  activeAllYear: boolean;
} {
  // controlledZoneRecordVersionTime is the last update, not the effective date
  // Look for ValidityCondition in the conditions tree
  let effectiveFrom = new Date("2023-01-01");
  let effectiveUntil: Date | null = null;

  try {
    const regOrders = ensureArray(zone.trafficRegulationOrder as unknown[]);
    for (const order of regOrders) {
      const regs = ensureArray((order as Record<string, unknown>).trafficRegulation as unknown[]);
      for (const reg of regs) {
        const condition = (reg as Record<string, unknown>).condition as Record<string, unknown> | undefined;
        if (condition) {
          const subConds = ensureArray(condition.conditions as unknown[]);
          for (const sub of subConds) {
            const subObj = sub as Record<string, unknown>;
            if (String(subObj["@_type"] ?? "").includes("ValidityCondition")) {
              const validPeriod = subObj.validPeriod as Record<string, unknown> | undefined;
              if (validPeriod) {
                const start = String(validPeriod.startOfPeriod ?? "");
                const end = String(validPeriod.endOfPeriod ?? "");
                if (start) {
                  const d = new Date(start);
                  if (!isNaN(d.getTime())) effectiveFrom = d;
                }
                if (end) {
                  const d = new Date(end);
                  if (!isNaN(d.getTime())) effectiveUntil = d;
                }
              }
            }
          }
        }
      }
    }
  } catch {
    // Non-fatal
  }

  return { effectiveFrom, effectiveUntil, schedule: null, activeAllYear: true };
}

// ── Zone parsing ────────────────────────────────────────────────────────────

function parseControlledZone(
  zone: Record<string, unknown>,
  cityName: string,
  sourceUrl: string
): ZBEZoneData | null {
  try {
    const id = String(zone["@_id"] ?? "").trim();
    if (!id) return null;

    // Name
    const nameObj = zone.name as Record<string, unknown> | undefined;
    const name = extractTextValue(nameObj) || cityName;

    // Description
    const descObj = zone.controlledZoneDescription as Record<string, unknown> | undefined;
    const description = extractTextValue(descObj) || null;

    // Info URL
    const infoUrl = zone.urlForFurtherInformation
      ? String(zone.urlForFurtherInformation).trim()
      : null;

    // Status — skip inactive zones
    const status = String(zone.status ?? "active").toLowerCase();
    if (status === "inactive" || status === "suspended") return null;

    // Geometry — extracted from the conditions tree
    const polygon = extractPolygon(zone);
    if (!polygon) {
      log(TAG, `${cityName}/${id}: skipping — no parseable geometry`);
      return null;
    }

    const centroid = computeCentroid(polygon);

    // Restrictions
    const restrictions = extractRestrictions(zone);

    // Validity
    const { effectiveFrom, effectiveUntil, schedule, activeAllYear } = extractValidity(zone);

    return {
      id: `ZBE-${cityName}-${id.replace(/\s+/g, "_")}`,
      name,
      cityName,
      polygon,
      centroid,
      restrictions,
      schedule,
      activeAllYear,
      fineAmount: null, // Not in new schema
      effectiveFrom,
      effectiveUntil,
      sourceUrl,
      description,
      infoUrl,
    };
  } catch (err) {
    logError(TAG, `Error parsing zone in ${cityName}`, err);
    return null;
  }
}

function parseCityXml(xml: string, cityName: string, sourceUrl: string): ZBEZoneData[] {
  const zones: ZBEZoneData[] = [];

  try {
    const result = parser.parse(xml);

    // New schema: payload > controlledZoneTable > controlledZone
    const payload = result?.payload;
    if (!payload) {
      // Try legacy: d2LogicalModel > payloadPublication
      const legacy = result?.d2LogicalModel?.payloadPublication;
      if (legacy) {
        const zoneList = ensureArray(legacy.controledZone as unknown[]);
        for (const zone of zoneList) {
          const parsed = parseControlledZone(zone as Record<string, unknown>, cityName, sourceUrl);
          if (parsed) zones.push(parsed);
        }
      } else {
        log(TAG, `${cityName}: no payload or payloadPublication in XML`);
      }
      return zones;
    }

    const tables = ensureArray(payload.controlledZoneTable as unknown[]);

    for (const table of tables) {
      const tableObj = table as Record<string, unknown>;
      const zoneList = ensureArray(tableObj.controlledZone as unknown[]);

      for (const zone of zoneList) {
        const parsed = parseControlledZone(zone as Record<string, unknown>, cityName, sourceUrl);
        if (parsed) zones.push(parsed);
      }
    }
  } catch (err) {
    logError(TAG, `${cityName}: XML parse error`, err);
  }

  return zones;
}

// ── Fetch ───────────────────────────────────────────────────────────────────

async function fetchCity(citySlug: string): Promise<{ xml: string; url: string } | null> {
  const url = `${ZBE_BASE_URL}/${encodeURIComponent(citySlug)}.xml`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/xml",
        "User-Agent": "trafico.live/zbe-collector",
      },
      signal: AbortSignal.timeout(60_000),
    });

    if (response.status === 404) return null;

    if (!response.ok) {
      logError(TAG, `${citySlug}: HTTP ${response.status} ${response.statusText}`);
      return null;
    }

    const xml = await response.text();
    return { xml, url };
  } catch (err) {
    logError(TAG, `${citySlug}: fetch error`, err);
    return null;
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

export async function run(prisma: PrismaClient): Promise<void> {
  const now = new Date();
  log(TAG, `Starting at ${now.toISOString()}`);

  // 1. Auto-discover cities, fall back to known list
  let cities = await discoverCities();
  if (cities.length === 0) {
    cities = FALLBACK_CITIES;
    log(TAG, `Using fallback list: ${cities.length} cities`);
  }
  log(TAG, `Trying ${cities.length} cities`);

  // 2. Fetch all cities in parallel (batch of 10 to avoid overwhelming DGT)
  const allZones: ZBEZoneData[] = [];
  const batchSize = 10;

  for (let i = 0; i < cities.length; i += batchSize) {
    const batch = cities.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (city) => {
        const result = await fetchCity(city);
        return { city, result };
      })
    );

    for (const { city, result } of results) {
      if (!result) continue;
      const zones = parseCityXml(result.xml, city, result.url);
      if (zones.length > 0) {
        log(TAG, `${city}: ${zones.length} zone(s) parsed`);
        allZones.push(...zones);
      }
    }
  }

  if (allZones.length === 0) {
    log(TAG, "No ZBE zones parsed — exiting");
    return;
  }

  // 3. Upsert all zones
  let upserted = 0;
  let failed = 0;

  for (const z of allZones) {
    try {
      await prisma.zBEZone.upsert({
        where: { id: z.id },
        create: {
          id: z.id,
          name: z.name,
          cityName: z.cityName,
          polygon: z.polygon,
          centroid: z.centroid ?? undefined,
          restrictions: z.restrictions,
          schedule: z.schedule ?? undefined,
          activeAllYear: z.activeAllYear,
          fineAmount: z.fineAmount ?? undefined,
          effectiveFrom: z.effectiveFrom,
          effectiveUntil: z.effectiveUntil ?? undefined,
          sourceUrl: z.sourceUrl,
          lastUpdated: now,
        },
        update: {
          name: z.name,
          polygon: z.polygon,
          centroid: z.centroid ?? undefined,
          restrictions: z.restrictions,
          schedule: z.schedule ?? undefined,
          activeAllYear: z.activeAllYear,
          fineAmount: z.fineAmount ?? undefined,
          effectiveFrom: z.effectiveFrom,
          effectiveUntil: z.effectiveUntil ?? undefined,
          sourceUrl: z.sourceUrl,
          lastUpdated: now,
        },
      });
      upserted++;
    } catch (err) {
      failed++;
      if (failed <= 5) {
        logError(TAG, `Upsert failed for zone ${z.id}`, err);
      }
    }
  }

  // 4. Summary
  const citiesWithZones = new Set(allZones.map((z) => z.cityName)).size;
  log(TAG, `ZBE: ${upserted} zones across ${citiesWithZones} cities`);
  if (failed > 0) log(TAG, `Upsert failures: ${failed}`);

  const totalInDb = await prisma.zBEZone.count();
  log(TAG, `Total ZBE zones in DB: ${totalInDb}`);
  log(TAG, "Collection completed successfully");
}
