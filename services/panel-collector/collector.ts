/**
 * Variable Message Panel Collector Service
 *
 * Fetches variable message panels (PMV) from DGT DATEX II API
 * and stores them in PostgreSQL for fast API access.
 *
 * Run every 5 minutes via Railway cron to keep message data fresh.
 *
 * Data sources:
 * - Predefined locations: https://infocar.dgt.es/datex2/dgt/PredefinedLocationsPublication/paneles/content.xml
 * - Current messages: https://infocar.dgt.es/datex2/dgt/SituationPublication/paneles/content.xml
 *
 * @deprecated Use unified collector: services/collector/ with TASK=panel
 */

import { PrismaClient, PanelMessageType, Direction } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { XMLParser } from "fast-xml-parser";

const DGT_PANELS_LOCATIONS_URL =
  "https://infocar.dgt.es/datex2/dgt/PredefinedLocationsPublication/paneles/content.xml";
const DGT_PANELS_MESSAGES_URL =
  "https://infocar.dgt.es/datex2/dgt/SituationPublication/paneles/content.xml";

// Province INE codes mapping
const PROVINCES: Record<string, string> = {
  "01": "Álava", "02": "Albacete", "03": "Alicante", "04": "Almería",
  "05": "Ávila", "06": "Badajoz", "07": "Baleares", "08": "Barcelona",
  "09": "Burgos", "10": "Cáceres", "11": "Cádiz", "12": "Castellón",
  "13": "Ciudad Real", "14": "Córdoba", "15": "A Coruña", "16": "Cuenca",
  "17": "Girona", "18": "Granada", "19": "Guadalajara", "20": "Gipuzkoa",
  "21": "Huelva", "22": "Huesca", "23": "Jaén", "24": "León",
  "25": "Lleida", "26": "La Rioja", "27": "Lugo", "28": "Madrid",
  "29": "Málaga", "30": "Murcia", "31": "Navarra", "32": "Ourense",
  "33": "Asturias", "34": "Palencia", "35": "Las Palmas", "36": "Pontevedra",
  "37": "Salamanca", "38": "Santa Cruz de Tenerife", "39": "Cantabria",
  "40": "Segovia", "41": "Sevilla", "42": "Soria", "43": "Tarragona",
  "44": "Teruel", "45": "Toledo", "46": "Valencia", "47": "Valladolid",
  "48": "Bizkaia", "49": "Zamora", "50": "Zaragoza", "51": "Ceuta", "52": "Melilla"
};

interface PanelLocation {
  panelId: string;
  name: string;
  latitude: number;
  longitude: number;
  roadNumber: string;
  kmPoint: number | null;
  direction: Direction | null;
  provinceCode: string | null;
}

interface PanelMessage {
  locationRef: string;
  message: string | null;
  pictograms: string[];
  messageType: PanelMessageType | null;
  startedAt: Date | null;
}

// XML Parser
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  isArray: (name) => ["predefinedLocation", "situation", "situationRecord", "name", "datexPictogram", "pictogramListEntry"].includes(name),
});

function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function parseDirection(dir: string): Direction | null {
  switch (dir?.toLowerCase()) {
    case "positive":
    case "ascending":
      return "ASCENDING";
    case "negative":
    case "descending":
      return "DESCENDING";
    case "both":
      return "BOTH";
    default:
      return null;
  }
}

function classifyMessage(pictograms: string[], message: string | null): PanelMessageType | null {
  const allContent = [...pictograms, message || ""].join(" ").toLowerCase();

  // Speed related
  if (allContent.includes("velocidad") || allContent.includes("speed") || /\d{2,3}\s*km/i.test(allContent)) {
    return "SPEED_LIMIT";
  }

  // Danger/Alert
  if (allContent.includes("peligro") || allContent.includes("danger") || allContent.includes("accidente") ||
      allContent.includes("accident") || pictograms.includes("danger")) {
    return "DANGER";
  }

  // Weather precaution
  if (allContent.includes("viento") || allContent.includes("wind") || allContent.includes("lluvia") ||
      allContent.includes("rain") || allContent.includes("niebla") || allContent.includes("fog") ||
      allContent.includes("hielo") || allContent.includes("ice") || pictograms.includes("crossWind") ||
      pictograms.includes("fog") || pictograms.includes("rain")) {
    return "PRECAUTION";
  }

  // Lane closure
  if (allContent.includes("carril") || allContent.includes("lane") || allContent.includes("cerrado") ||
      allContent.includes("closed")) {
    return "LANE_CLOSED";
  }

  // Detour
  if (allContent.includes("desvío") || allContent.includes("detour") || allContent.includes("salida")) {
    return "DETOUR";
  }

  // Generic precaution
  if (allContent.includes("precaución") || allContent.includes("modere") || allContent.includes("atención") ||
      allContent.includes("prudencia")) {
    return "PRECAUTION";
  }

  // Has message but can't classify
  if (message || pictograms.length > 0) {
    return "INFO";
  }

  return null;
}

async function fetchPanelLocations(): Promise<Map<string, PanelLocation>> {
  const locations = new Map<string, PanelLocation>();

  console.log(`[panel-collector] Fetching panel locations from ${DGT_PANELS_LOCATIONS_URL}`);
  const response = await fetch(DGT_PANELS_LOCATIONS_URL, {
    headers: {
      Accept: "application/xml",
      "User-Agent": "TraficoEspana/1.0 (panel-collector)"
    },
    signal: AbortSignal.timeout(60000)
  });

  if (!response.ok) {
    throw new Error(`DGT Panel Locations API error: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();

  try {
    const result = parser.parse(xml);
    const publication = result?.d2LogicalModel?.payloadPublication;

    if (!publication) {
      console.warn("[panel-collector] No payload found in locations response");
      return locations;
    }

    const locationSet = publication.predefinedLocationSet;
    if (!locationSet) return locations;

    const predefinedLocations = ensureArray(locationSet.predefinedLocation);

    for (const loc of predefinedLocations) {
      const id = String(loc["@_id"] || "");
      if (!id) continue;

      // Extract coordinates
      const innerLocation = loc.predefinedLocation;
      if (!innerLocation) continue;

      const tpegPoint = innerLocation.tpegpointLocation;
      const point = tpegPoint?.point;
      const coords = point?.pointCoordinates;

      const latitude = parseFloat(String(coords?.latitude || 0));
      const longitude = parseFloat(String(coords?.longitude || 0));

      if (!latitude || !longitude) continue;

      // Extract road info from reference point
      const refPoint = innerLocation.referencePoint;
      const roadNumber = String(refPoint?.roadNumber || "");
      const direction = parseDirection(String(refPoint?.directionRelative || ""));

      // km point is in meters, convert to km
      const distanceMeters = parseFloat(String(refPoint?.referencePointDistance || 0));
      const kmPoint = distanceMeters > 0 ? Math.round(distanceMeters / 100) / 10 : null;

      // Province from extension
      const extension = refPoint?.referencePointExtension?.ExtendedReferencePoint;
      const provinceCode = String(extension?.provinceINEIdentifier || "").padStart(2, "0");

      // Panel name
      const locName = loc.predefinedLocationName;
      const nameValue = Array.isArray(locName) ? locName[0]?.value : locName?.value;
      const name = String(nameValue || id.replace("GUID_PMV_", "PMV_"));

      locations.set(id, {
        panelId: id,
        name,
        latitude,
        longitude,
        roadNumber,
        kmPoint,
        direction,
        provinceCode: provinceCode !== "00" ? provinceCode : null,
      });
    }
  } catch (error) {
    console.error("[panel-collector] Error parsing locations XML:", error);
  }

  return locations;
}

async function fetchPanelMessages(): Promise<Map<string, PanelMessage>> {
  const messages = new Map<string, PanelMessage>();

  console.log(`[panel-collector] Fetching panel messages from ${DGT_PANELS_MESSAGES_URL}`);
  const response = await fetch(DGT_PANELS_MESSAGES_URL, {
    headers: {
      Accept: "application/xml",
      "User-Agent": "TraficoEspana/1.0 (panel-collector)"
    },
    signal: AbortSignal.timeout(60000)
  });

  if (!response.ok) {
    throw new Error(`DGT Panel Messages API error: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();

  try {
    const result = parser.parse(xml);
    const publication = result?.d2LogicalModel?.payloadPublication;

    if (!publication) {
      console.warn("[panel-collector] No payload found in messages response");
      return messages;
    }

    const situations = ensureArray(publication.situation);

    for (const situation of situations) {
      const records = ensureArray(situation.situationRecord);

      for (const record of records) {
        // Get location reference
        const groupOfLocations = record.groupOfLocations;
        const locationContained = groupOfLocations?.locationContainedInGroup;
        const locationRef = String(locationContained?.predefinedLocationReference || "");

        if (!locationRef) continue;

        // Get message text
        const message = record.vmsLegend ? String(record.vmsLegend).trim() : null;

        // Get pictograms
        const pictograms = ensureArray(record.datexPictogram).map(p => String(p));

        // Get timestamp
        const startTime = record.validity?.validityTimeSpecification?.overallStartTime;
        const startedAt = startTime ? new Date(String(startTime)) : null;

        // Classify message type
        const messageType = classifyMessage(pictograms, message);

        messages.set(locationRef, {
          locationRef,
          message,
          pictograms,
          messageType,
          startedAt,
        });
      }
    }
  } catch (error) {
    console.error("[panel-collector] Error parsing messages XML:", error);
  }

  return messages;
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

  console.log(`[panel-collector] Starting at ${now.toISOString()}`);

  try {
    // 1. FETCH both data sources
    const [locations, messages] = await Promise.all([
      fetchPanelLocations(),
      fetchPanelMessages()
    ]);

    console.log(`[panel-collector] Fetched ${locations.size} panel locations`);
    console.log(`[panel-collector] Fetched ${messages.size} panel messages`);

    if (locations.size === 0) {
      console.log("[panel-collector] No panel locations found, exiting");
      return;
    }

    // 2. Get existing panel IDs
    const existingPanels = await prisma.variablePanel.findMany({
      select: { panelId: true }
    });
    const existingIds = new Set(existingPanels.map(p => p.panelId));

    // 3. Merge and upsert
    const fetchedIds = new Set<string>();
    let created = 0;
    let updated = 0;
    let withMessage = 0;

    for (const [panelId, location] of locations) {
      fetchedIds.add(panelId);

      // Find message for this panel
      const msg = messages.get(panelId);
      const hasMessage = !!(msg?.message || (msg?.pictograms && msg.pictograms.length > 0));
      if (hasMessage) withMessage++;

      await prisma.variablePanel.upsert({
        where: { panelId },
        create: {
          panelId,
          name: location.name,
          latitude: location.latitude,
          longitude: location.longitude,
          roadNumber: location.roadNumber || null,
          kmPoint: location.kmPoint,
          direction: location.direction,
          province: location.provinceCode,
          provinceName: location.provinceCode ? PROVINCES[location.provinceCode] || null : null,
          message: msg?.message || null,
          messageType: msg?.messageType || null,
          messageCode: msg?.pictograms?.join(",") || null,
          messageStartAt: msg?.startedAt || null,
          fetchedAt: now,
          lastUpdated: now,
          isActive: true,
          hasMessage,
        },
        update: {
          name: location.name,
          latitude: location.latitude,
          longitude: location.longitude,
          roadNumber: location.roadNumber || null,
          kmPoint: location.kmPoint,
          direction: location.direction,
          province: location.provinceCode,
          provinceName: location.provinceCode ? PROVINCES[location.provinceCode] || null : null,
          message: msg?.message || null,
          messageType: msg?.messageType || null,
          messageCode: msg?.pictograms?.join(",") || null,
          messageStartAt: msg?.startedAt || null,
          fetchedAt: now,
          lastUpdated: now,
          isActive: true,
          hasMessage,
        }
      });

      if (existingIds.has(panelId)) {
        updated++;
      } else {
        created++;
      }
    }

    console.log(`[panel-collector] Created: ${created}, Updated: ${updated}`);
    console.log(`[panel-collector] Panels with active messages: ${withMessage}`);

    // 4. Mark panels not in API response as inactive
    const missingIds = [...existingIds].filter(id => !fetchedIds.has(id));
    if (missingIds.length > 0) {
      await prisma.variablePanel.updateMany({
        where: { panelId: { in: missingIds } },
        data: { isActive: false }
      });
      console.log(`[panel-collector] Marked ${missingIds.length} panels as inactive`);
    }

    // 5. Summary statistics
    const stats = await prisma.variablePanel.groupBy({
      by: ["province"],
      where: { isActive: true },
      _count: true
    });

    console.log(`[panel-collector] Panels by province:`);
    const sortedStats = stats.sort((a, b) => b._count - a._count);
    for (const stat of sortedStats.slice(0, 10)) {
      const provinceName = stat.province ? PROVINCES[stat.province] || stat.province : "Unknown";
      console.log(`  ${provinceName}: ${stat._count}`);
    }
    if (stats.length > 10) {
      console.log(`  ... and ${stats.length - 10} more provinces`);
    }

    const totalActive = stats.reduce((sum, s) => sum + s._count, 0);
    console.log(`[panel-collector] Total active panels: ${totalActive}`);

    // Message type breakdown
    const msgStats = await prisma.variablePanel.groupBy({
      by: ["messageType"],
      where: { isActive: true, hasMessage: true },
      _count: true
    });

    if (msgStats.length > 0) {
      console.log(`[panel-collector] Active messages by type:`);
      for (const stat of msgStats) {
        console.log(`  ${stat.messageType || "UNKNOWN"}: ${stat._count}`);
      }
    }

    console.log("[panel-collector] Collection completed successfully");

  } catch (error) {
    console.error("[panel-collector] Fatal error:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
