/**
 * ZBE (Zona de Bajas Emisiones) Collector
 *
 * Fetches Low Emission Zone boundaries and restrictions from DGT's
 * ControledZonePublication (DATEX II v3) for Spanish cities.
 *
 * Endpoint pattern:
 *   https://infocar.dgt.es/datex2/v3/dgt/zbe/ControledZonePublication/{City}.xml
 *
 * Cities are tried from a known list; 404s are silently skipped so the
 * collector stays operational as new cities come online.
 *
 * Run weekly — boundaries and restrictions change infrequently.
 */

import { PrismaClient } from "@prisma/client";
import { ensureArray, log, logError } from "../../shared/utils.js";
import { createXMLParser } from "../../shared/xml.js";

const TAG = "zbe";

const ZBE_BASE_URL = "https://infocar.dgt.es/datex2/v3/dgt/zbe/ControledZonePublication";

/**
 * Known city slugs for the DGT ZBE publication endpoint.
 * Case-sensitive — must match the server's file naming exactly.
 * New cities can be appended here as they publish ZBE data.
 */
const ZBE_CITIES = [
  "Madrid",
  "Barcelona",
  "Bilbao",
  "Sevilla",
  "Granada",
  "ACoruna",
  "Pamplona",
  "Valladolid",
  "Palma",
  "Alicante",
  "Malaga",
  "Zaragoza",
  "Valencia",
  "Murcia",
  "Gijon",
  "Oviedo",
  "Santander",
  "SanSebastian",
  "Vitoria",
  "Burgos",
];

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

// Ensure collections that may contain one or many entries are always arrays
const parser = createXMLParser({
  isArray: (name) =>
    [
      "controledZone",
      "zoneCharacteristics",
      "vehicleCharacteristics",
      "applicablePeriod",
      "period",
      "timeOfDayRange",
      "dayWeekMonth",
      "applicableDays",
      "value",
      "coordinate",
      "posList",
    ].includes(name),
});

// ── Coordinate parsing ───────────────────────────────────────────────────────

/**
 * Parse a GML posList string (space-separated lat/lon pairs) into a GeoJSON polygon.
 *
 * DGT DATEX II v3 uses GML 3.2 with:
 *   <gml:posList srsDimension="2">lat1 lon1 lat2 lon2 ...</gml:posList>
 *
 * GeoJSON requires [lon, lat] ordering.
 */
function parsePosListToPolygon(posList: string): GeoJSONPolygon | null {
  const parts = posList
    .trim()
    .split(/\s+/)
    .map((s) => parseFloat(s))
    .filter((n) => !isNaN(n));

  if (parts.length < 6 || parts.length % 2 !== 0) return null;

  const coords: number[][] = [];
  for (let i = 0; i < parts.length; i += 2) {
    const lat = parts[i];
    const lon = parts[i + 1];
    // Basic sanity: Spain mainland + islands
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

/**
 * Compute a simple centroid from a polygon's outer ring.
 */
function computeCentroid(
  polygon: GeoJSONPolygon
): { lat: number; lng: number } | null {
  const ring = polygon.coordinates[0];
  if (!ring || ring.length === 0) return null;

  let sumLon = 0;
  let sumLat = 0;
  // Exclude closing duplicate point
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

// ── Restriction parsing ──────────────────────────────────────────────────────

/**
 * Map a DATEX II access restriction value to a human-readable label.
 *
 * DGT uses values like: "denied", "allowed", "restrictedToRestricted", etc.
 */
function mapRestriction(raw: string): string {
  const val = (raw || "").toLowerCase();
  if (val.includes("denied") || val === "prohibited") return "denied";
  if (val.includes("allowed") || val === "free") return "allowed";
  if (val.includes("restrict")) return "restricted";
  return val || "unknown";
}

/**
 * Extract vehicle label restrictions from zoneCharacteristics.
 * Returns a map like { "0": "denied", "A": "denied", "B": "restricted", "C": "allowed" }.
 *
 * DATEX II v3 ControledZonePublication structure:
 *   zoneCharacteristics[]
 *     ├── vehicleCharacteristics[] { vehicleLabel: "A"|"B"|"C"|"0"|"ECO" }
 *     └── accessRestriction: "denied"|"allowed"|...
 */
function extractRestrictions(
  zoneChars: Record<string, unknown>[]
): Record<string, string> {
  const restrictions: Record<string, string> = {};

  for (const zc of zoneChars) {
    const accessRaw = String(zc.accessRestriction ?? zc.restrictionType ?? "");
    const restriction = mapRestriction(accessRaw);

    const vehicleChars = ensureArray(zc.vehicleCharacteristics as unknown[]);

    if (vehicleChars.length === 0) {
      // No specific vehicle type — applies generically
      restrictions["*"] = restriction;
    } else {
      for (const vc of vehicleChars) {
        const vcObj = vc as Record<string, unknown>;
        // DGT uses vehicleLabel for the environmental label (0, A, B, C, ECO)
        const label = String(
          vcObj.vehicleLabel ?? vcObj.emissionClassificationEuro ?? vcObj.vehicleType ?? ""
        ).trim();
        if (label) {
          restrictions[label] = restriction;
        }
      }
    }
  }

  return restrictions;
}

// ── Schedule parsing ─────────────────────────────────────────────────────────

/**
 * Parse applicablePeriod entries into a simple schedule structure.
 * Returns null if the zone is active all year (no schedule constraints).
 */
function extractSchedule(
  periods: Record<string, unknown>[]
): { schedule: ScheduleEntry[] | null; activeAllYear: boolean } {
  if (periods.length === 0) return { schedule: null, activeAllYear: true };

  const entries: ScheduleEntry[] = [];
  let allYear = true;

  for (const period of periods) {
    const innerPeriods = ensureArray(period.period as unknown[]);

    for (const p of innerPeriods) {
      const pObj = p as Record<string, unknown>;

      // dayWeekMonth gives the applicable days (MON, TUE, ... or ALL)
      const dayWeekMonth = pObj.dayWeekMonth as Record<string, unknown> | undefined;
      const timeRanges = ensureArray(pObj.timeOfDayRange as unknown[]);

      const days = dayWeekMonth
        ? ensureArray(dayWeekMonth.applicableDays as unknown[])
            .map((d) => String(d).trim())
            .filter(Boolean)
        : [];

      // If days cover the whole week, it's effectively all year
      if (days.length > 0 && days.length < 7) allYear = false;

      for (const tr of timeRanges) {
        const trObj = tr as Record<string, unknown>;
        const startTime = String(trObj.startTimeOfPeriod ?? trObj.from ?? "").substring(0, 5);
        const endTime = String(trObj.endTimeOfPeriod ?? trObj.to ?? "").substring(0, 5);

        if (!startTime || !endTime) continue;
        if (startTime === "00:00" && endTime === "23:59") continue; // 24h = unrestricted

        const dayStr = days.length > 0 ? days.join(",") : "ALL";
        entries.push({ day: dayStr, from: startTime, to: endTime });
      }
    }
  }

  return {
    schedule: entries.length > 0 ? entries : null,
    activeAllYear: allYear,
  };
}

// ── Zone parsing ─────────────────────────────────────────────────────────────

/**
 * Parse a single controledZone element from the XML.
 *
 * DGT DATEX II v3 ControledZonePublication structure:
 *
 *   controledZone
 *     ├── @id                      ← zone ID
 *     ├── zoneName.value[]         ← display name
 *     ├── gmlGeometry.Polygon.exterior.LinearRing.posList
 *     ├── zoneCharacteristics[]    ← vehicle + access restrictions
 *     ├── applicablePeriod[]       ← schedule
 *     ├── validityStatus           ← "active" | "inactive"
 *     ├── validityTimeSpec.overallStartTime
 *     ├── validityTimeSpec.overallEndTime
 *     └── fineAmount (optional)
 */
function parseControledZone(
  zone: Record<string, unknown>,
  cityName: string,
  sourceUrl: string
): ZBEZoneData | null {
  try {
    const id = String(zone["@_id"] ?? zone.id ?? "").trim();
    if (!id) return null;

    // ── Name ─────────────────────────────────────────────────────────
    const zoneNameObj = zone.zoneName as Record<string, unknown> | undefined;
    const nameValues = ensureArray(zoneNameObj?.value as unknown[]);
    let name = cityName; // fallback to city name

    for (const v of nameValues) {
      if (typeof v === "string" && v.trim()) {
        name = v.trim();
        break;
      }
      if (typeof v === "object" && v !== null) {
        const vObj = v as Record<string, unknown>;
        const text = String(vObj["#text"] ?? vObj.value ?? "").trim();
        if (text) {
          name = text;
          break;
        }
      }
    }

    // ── Geometry ─────────────────────────────────────────────────────
    // DGT places coordinates in gmlGeometry or openlrExtendedArea
    let polygon: GeoJSONPolygon | null = null;

    const gmlGeometry = zone.gmlGeometry as Record<string, unknown> | undefined;
    const gmlPolygon =
      (gmlGeometry?.Polygon as Record<string, unknown>) ??
      (gmlGeometry?.polygon as Record<string, unknown>);

    if (gmlPolygon) {
      const exterior = gmlPolygon.exterior as Record<string, unknown> | undefined;
      const linearRing = exterior?.LinearRing as Record<string, unknown> | undefined;
      const posListRaw = linearRing?.posList;

      if (typeof posListRaw === "string") {
        polygon = parsePosListToPolygon(posListRaw);
      }
    }

    // Alternative: some feeds use openlrExtendedArea with GeoJSON-style coords
    if (!polygon) {
      const extArea = zone.openlrExtendedArea as Record<string, unknown> | undefined;
      const coords = extArea?.coordinates;
      if (Array.isArray(coords) && coords.length > 0) {
        // Attempt to coerce a nested array structure into a GeoJSON polygon
        const ring = (coords as unknown[]).map((c) => {
          const pair = c as number[];
          return [pair[0], pair[1]]; // already [lon, lat] in GeoJSON style
        });
        if (ring.length >= 3) {
          polygon = { type: "Polygon", coordinates: [ring] };
        }
      }
    }

    if (!polygon) {
      log(TAG, `${cityName}/${id}: skipping — no parseable geometry`);
      return null;
    }

    const centroid = computeCentroid(polygon);

    // ── Restrictions ─────────────────────────────────────────────────
    const zoneChars = ensureArray(zone.zoneCharacteristics as unknown[]).map(
      (z) => z as Record<string, unknown>
    );
    const restrictions = extractRestrictions(zoneChars);

    // ── Schedule ──────────────────────────────────────────────────────
    const applicablePeriods = ensureArray(zone.applicablePeriod as unknown[]).map(
      (p) => p as Record<string, unknown>
    );
    const { schedule, activeAllYear } = extractSchedule(applicablePeriods);

    // ── Validity dates ─────────────────────────────────────────────────
    const validitySpec = zone.validityTimeSpec as Record<string, unknown> | undefined;
    const startRaw = String(
      validitySpec?.overallStartTime ?? zone.effectiveFrom ?? ""
    );
    const endRaw = String(
      validitySpec?.overallEndTime ?? zone.effectiveUntil ?? ""
    );

    const effectiveFrom = startRaw ? new Date(startRaw) : new Date("2023-01-01");
    const effectiveUntil = endRaw ? new Date(endRaw) : null;

    // ── Fine amount ────────────────────────────────────────────────────
    const fineRaw = zone.fineAmount ?? zone.penaltyAmount;
    const fineAmount = fineRaw != null ? parseFloat(String(fineRaw)) || null : null;

    return {
      id: `ZBE-${cityName}-${id}`,
      name,
      cityName,
      polygon,
      centroid,
      restrictions,
      schedule,
      activeAllYear,
      fineAmount,
      effectiveFrom: isNaN(effectiveFrom.getTime()) ? new Date("2023-01-01") : effectiveFrom,
      effectiveUntil: effectiveUntil && !isNaN(effectiveUntil.getTime()) ? effectiveUntil : null,
      sourceUrl,
    };
  } catch (err) {
    logError(TAG, `Error parsing zone in ${cityName}`, err);
    return null;
  }
}

/**
 * Parse a ControledZonePublication XML for a single city.
 * Returns all valid ZBEZoneData records found.
 */
function parseCityXml(xml: string, cityName: string, sourceUrl: string): ZBEZoneData[] {
  const zones: ZBEZoneData[] = [];

  try {
    const result = parser.parse(xml);

    // DATEX II v3: d2LogicalModel > payloadPublication
    const publication =
      result?.d2LogicalModel?.payloadPublication ??
      result?.D2LogicalModel?.payloadPublication;

    if (!publication) {
      log(TAG, `${cityName}: no payloadPublication in XML`);
      return [];
    }

    const zoneList = ensureArray(publication.controledZone as unknown[]);

    for (const zone of zoneList) {
      const zoneObj = zone as Record<string, unknown>;
      const parsed = parseControledZone(zoneObj, cityName, sourceUrl);
      if (parsed) zones.push(parsed);
    }
  } catch (err) {
    logError(TAG, `${cityName}: XML parse error`, err);
  }

  return zones;
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function fetchCity(citySlug: string): Promise<{ xml: string; url: string } | null> {
  const url = `${ZBE_BASE_URL}/${citySlug}.xml`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/xml",
        "User-Agent": "TraficoEspana/1.0 (zbe-collector)",
      },
      signal: AbortSignal.timeout(60_000),
    });

    if (response.status === 404) {
      // City not yet published — expected for many cities
      return null;
    }

    if (!response.ok) {
      logError(TAG, `${citySlug}: HTTP ${response.status} ${response.statusText}`);
      return null;
    }

    const xml = await response.text();
    return { xml, url };
  } catch (err) {
    // Timeout or network error — non-fatal
    logError(TAG, `${citySlug}: fetch error`, err);
    return null;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function run(prisma: PrismaClient): Promise<void> {
  const now = new Date();
  log(TAG, `Starting at ${now.toISOString()}`);
  log(TAG, `Trying ${ZBE_CITIES.length} cities`);

  // 1. Fetch all cities in parallel (gracefully skip 404s)
  const fetchResults = await Promise.all(
    ZBE_CITIES.map(async (city) => {
      const result = await fetchCity(city);
      return { city, result };
    })
  );

  const successfulCities = fetchResults.filter((r) => r.result !== null);
  log(
    TAG,
    `Fetched ${successfulCities.length}/${ZBE_CITIES.length} cities successfully`
  );

  // 2. Parse each city's XML
  let allZones: ZBEZoneData[] = [];

  for (const { city, result } of successfulCities) {
    if (!result) continue;
    const zones = parseCityXml(result.xml, city, result.url);
    if (zones.length > 0) {
      log(TAG, `${city}: ${zones.length} zone(s) parsed`);
      allZones = allZones.concat(zones);
    } else {
      log(TAG, `${city}: XML fetched but no zones parsed`);
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
