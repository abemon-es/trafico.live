/**
 * EV Charger Collector Service
 *
 * Fetches electric vehicle charging stations from DGT NAP EnergyInfrastructure API
 * and stores them in PostgreSQL for fast API access.
 *
 * Run daily via Railway cron (data updates every ~24h).
 *
 * Data source:
 * - https://infocar.dgt.es/datex2/v3/miterd/EnergyInfrastructureTablePublication/electrolineras.xml
 */

import { PrismaClient, ChargerType } from "@prisma/client";
import { PROVINCES, normalizeProvince } from "../../shared/provinces.js";
import { ensureArray } from "../../shared/utils.js";
import { createXMLParser } from "../../shared/xml.js";

const DGT_CHARGERS_URL =
  "https://infocar.dgt.es/datex2/v3/miterd/EnergyInfrastructureTablePublication/electrolineras.xml";

interface ChargerConnector {
  type: string;
  mode: string;
  format: string;
  powerKw: number;
  voltage?: number;
  maxCurrent?: number;
}

interface ChargerData {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  postalCode?: string;
  city?: string;
  province?: string;
  operator?: string;
  connectors: ChargerConnector[];
  totalPowerKw: number;
  connectorCount: number;
  is24h: boolean;
  schedule?: string;
  authMethods: string[];
}

// XML Parser
const parser = createXMLParser({
  isArray: (name) =>
    [
      "energyInfrastructureSite",
      "energyInfrastructureStation",
      "refillPoint",
      "connector",
      "addressLine",
      "authenticationAndIdentificationMethods",
      "value",
    ].includes(name),
});

function extractTextValue(valuesObj: Record<string, unknown> | undefined): string | undefined {
  if (!valuesObj) return undefined;

  const valueArr = ensureArray(valuesObj.value);
  for (const v of valueArr) {
    if (typeof v === "string") return v;
    if (typeof v === "object" && v !== null) {
      const obj = v as Record<string, unknown>;
      if (obj["#text"]) return String(obj["#text"]);
    }
  }

  return undefined;
}

function check24Hours(schedule: string): boolean {
  if (!schedule) return false;
  const has24h = schedule.includes("00:00 - 23:59");
  const weekdayCount = (schedule.match(/00:00 - 23:59/g) || []).length;
  return has24h && weekdayCount >= 5;
}

function mapConnectorType(type: string): ChargerType {
  const typeMap: Record<string, ChargerType> = {
    iec62196T2: "AC_TYPE2",
    iec62196T1: "AC_TYPE1",
    iec62196T2COMBO: "DC_CCS2",
    iec62196T1COMBO: "DC_CCS",
    chademo: "DC_CHADEMO",
    teslaConnector: "TESLA",
    domestic: "SCHUKO",
  };
  return typeMap[type] || "OTHER";
}

function parseAddress(addressObj: Record<string, unknown> | undefined): {
  address?: string;
  postalCode?: string;
  city?: string;
  province?: string;
} {
  if (!addressObj) return {};

  const postalCode = String(addressObj.postcode || "").padStart(5, "0");

  const addressLines = ensureArray(addressObj.addressLine);
  let address: string | undefined;
  let city: string | undefined;
  let province: string | undefined;

  for (const line of addressLines) {
    const lineObj = line as Record<string, unknown>;
    const textObj = lineObj.text as Record<string, unknown> | undefined;
    const valuesObj = textObj?.values as Record<string, unknown> | undefined;
    const text = extractTextValue(valuesObj) || "";

    if (text.startsWith("Dirección:")) {
      address = text.replace("Dirección:", "").trim();
    } else if (text.startsWith("Municipio:")) {
      city = text.replace("Municipio:", "").trim();
    } else if (text.startsWith("Provincia:")) {
      province = text.replace("Provincia:", "").trim();
    }
  }

  return { address, postalCode: postalCode !== "00000" ? postalCode : undefined, city, province };
}

function parseRefillPoint(point: Record<string, unknown>): ChargerConnector[] {
  const connectors: ChargerConnector[] = [];
  const connectorArr = ensureArray(point.connector);

  for (const conn of connectorArr) {
    const connObj = conn as Record<string, unknown>;

    const type = String(connObj.connectorType || "unknown");
    const mode = String(connObj.chargingMode || "");
    const format = String(connObj.connectorFormat || "");

    const powerWatts = parseFloat(String(connObj.maxPowerAtSocket || 0));
    const powerKw = powerWatts / 1000;

    const voltage = connObj.voltage ? parseFloat(String(connObj.voltage)) : undefined;
    const maxCurrent = connObj.maximumCurrent ? parseFloat(String(connObj.maximumCurrent)) : undefined;

    if (powerKw > 0) {
      connectors.push({
        type,
        mode,
        format,
        powerKw,
        voltage,
        maxCurrent,
      });
    }
  }

  return connectors;
}

function parseSite(site: Record<string, unknown>): ChargerData | null {
  try {
    const id = String(site["@_id"] || "");
    if (!id) return null;

    // Extract name
    const nameObj = site.name as Record<string, unknown> | undefined;
    const valuesObj = nameObj?.values as Record<string, unknown> | undefined;
    const name = extractTextValue(valuesObj) || `Electrolinera ${id}`;

    // Extract coordinates
    const locationRef = site.locationReference as Record<string, unknown> | undefined;
    const coordsForDisplay = locationRef?.coordinatesForDisplay as Record<string, unknown> | undefined;

    const latitude = parseFloat(String(coordsForDisplay?.latitude || 0));
    const longitude = parseFloat(String(coordsForDisplay?.longitude || 0));

    if (!latitude || !longitude) return null;

    // Extract address info
    const extension = locationRef?._locationReferenceExtension as Record<string, unknown> | undefined;
    const facilityLocation = extension?.facilityLocation as Record<string, unknown> | undefined;
    const addressObj = facilityLocation?.address as Record<string, unknown> | undefined;

    const { address, postalCode, city, province } = parseAddress(addressObj);

    // Extract operator
    const operatorObj = site.operator as Record<string, unknown> | undefined;
    const operatorNameObj = operatorObj?.name as Record<string, unknown> | undefined;
    const operatorValuesObj = operatorNameObj?.values as Record<string, unknown> | undefined;
    const operator = extractTextValue(operatorValuesObj);

    // Extract operating hours
    const operatingHours = site.operatingHours as Record<string, unknown> | undefined;
    const schedule = String(operatingHours?.label || "");
    const is24h = check24Hours(schedule);

    // Extract connectors from stations
    const stations = ensureArray(site.energyInfrastructureStation);
    const allConnectors: ChargerConnector[] = [];
    const authMethods = new Set<string>();

    for (const station of stations) {
      const authMethodsArr = ensureArray(
        (station as Record<string, unknown>).authenticationAndIdentificationMethods
      );
      for (const method of authMethodsArr) {
        if (typeof method === "string") {
          authMethods.add(method);
        }
      }

      const refillPoints = ensureArray((station as Record<string, unknown>).refillPoint);
      for (const point of refillPoints) {
        const connectors = parseRefillPoint(point as Record<string, unknown>);
        allConnectors.push(...connectors);
      }
    }

    const totalPowerKw = allConnectors.reduce((sum, c) => sum + c.powerKw, 0);
    const connectorCount = allConnectors.length;

    return {
      id,
      name,
      latitude,
      longitude,
      address,
      postalCode,
      city,
      province,
      operator,
      connectors: allConnectors,
      totalPowerKw,
      connectorCount,
      is24h,
      schedule: schedule || undefined,
      authMethods: Array.from(authMethods),
    };
  } catch (error) {
    console.error("[charger-collector] Error parsing site:", error);
    return null;
  }
}

function parseChargers(xml: string): ChargerData[] {
  const chargers: ChargerData[] = [];

  try {
    const result = parser.parse(xml);
    const publication = result?.payload;

    if (!publication) {
      console.warn("[charger-collector] No payload found in response");
      return [];
    }

    const table = publication.energyInfrastructureTable;
    if (!table) {
      console.warn("[charger-collector] No energyInfrastructureTable found");
      return [];
    }

    const sites = ensureArray(table.energyInfrastructureSite);

    for (const site of sites) {
      const charger = parseSite(site as Record<string, unknown>);
      if (charger) {
        chargers.push(charger);
      }
    }
  } catch (error) {
    console.error("[charger-collector] Error parsing XML:", error);
  }

  return chargers;
}

export async function run(prisma: PrismaClient) {
  const now = new Date();

  console.log(`[charger-collector] Starting at ${now.toISOString()}`);

  try {
    // 1. FETCH from DGT API
    console.log(`[charger-collector] Fetching from ${DGT_CHARGERS_URL}`);
    const response = await fetch(DGT_CHARGERS_URL, {
      headers: {
        Accept: "application/xml",
        "User-Agent": "TraficoEspana/1.0 (charger-collector)"
      },
      signal: AbortSignal.timeout(120000) // 2 minutes timeout for large XML
    });

    if (!response.ok) {
      throw new Error(`DGT Charger API error: ${response.status} ${response.statusText}`);
    }

    const xml = await response.text();
    const chargers = parseChargers(xml);

    console.log(`[charger-collector] Fetched ${chargers.length} chargers from API`);

    if (chargers.length === 0) {
      console.log("[charger-collector] No chargers found, exiting");
      return;
    }

    // 2. Get existing charger IDs
    const existingChargers = await prisma.eVCharger.findMany({
      select: { id: true }
    });
    const existingIds = new Set(existingChargers.map(c => c.id));

    // 3. Batch upsert via raw SQL INSERT ... ON CONFLICT
    const fetchedIds = new Set<string>();
    let created = 0;
    let updated = 0;

    const BATCH = 500;
    const COLS = 16;

    for (let i = 0; i < chargers.length; i += BATCH) {
      const batch = chargers.slice(i, i + BATCH);

      const values = batch.map((_, idx) => {
        const b = idx * COLS;
        return `($${b+1}, $${b+2}, $${b+3}, $${b+4}, $${b+5}, $${b+6}, $${b+7}, $${b+8}, $${b+9}, $${b+10}::"ChargerType"[], $${b+11}, $${b+12}, $${b+13}, $${b+14}, $${b+15}::text[], $${b+16})`;
      }).join(", ");

      const params = batch.flatMap(charger => {
        const provinceCode = normalizeProvince(charger.province || "");
        const chargerTypes = [...new Set(charger.connectors.map(c => mapConnectorType(c.type)))];
        const paymentMethods = charger.authMethods.filter(m =>
          m.includes("payment") || m.includes("card") || m.includes("app") || m.includes("rfid")
        );

        fetchedIds.add(charger.id);
        if (existingIds.has(charger.id)) updated++; else created++;

        return [
          charger.id, charger.name, charger.latitude, charger.longitude,
          charger.address || null, charger.city || null, charger.postalCode || null,
          provinceCode, provinceCode ? PROVINCES[provinceCode] || null : null,
          chargerTypes, // ChargerType[] — cast in SQL
          Math.min(charger.totalPowerKw, 9999.99), charger.connectorCount,
          charger.operator || null, charger.is24h,
          paymentMethods, // String[] — cast in SQL
          now
        ];
      });

      await prisma.$executeRawUnsafe(`
        INSERT INTO "EVCharger" (
          id, name, latitude, longitude, address, city, "postalCode",
          province, "provinceName", "chargerTypes", "powerKw", connectors,
          operator, "is24h", "paymentMethods", "lastUpdated"
        ) VALUES ${values}
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
          address = EXCLUDED.address, city = EXCLUDED.city, "postalCode" = EXCLUDED."postalCode",
          province = EXCLUDED.province, "provinceName" = EXCLUDED."provinceName",
          "chargerTypes" = EXCLUDED."chargerTypes", "powerKw" = EXCLUDED."powerKw",
          connectors = EXCLUDED.connectors, operator = EXCLUDED.operator,
          "is24h" = EXCLUDED."is24h", "paymentMethods" = EXCLUDED."paymentMethods",
          "lastUpdated" = EXCLUDED."lastUpdated"
      `, ...params);
    }

    console.log(`[charger-collector] Created: ${created}, Updated: ${updated}`);

    // 4. Delete chargers not in API response (they may have been removed)
    const missingIds = [...existingIds].filter(id => !fetchedIds.has(id));
    if (missingIds.length > 0) {
      await prisma.eVCharger.deleteMany({
        where: { id: { in: missingIds } }
      });
      console.log(`[charger-collector] Deleted ${missingIds.length} chargers no longer in API`);
    }

    // 5. Summary statistics
    const stats = await prisma.eVCharger.groupBy({
      by: ["province"],
      _count: true
    });

    console.log(`[charger-collector] Chargers by province:`);
    const sortedStats = stats.sort((a, b) => b._count - a._count);
    for (const stat of sortedStats.slice(0, 10)) {
      const provinceName = stat.province ? PROVINCES[stat.province] || stat.province : "Unknown";
      console.log(`  ${provinceName}: ${stat._count}`);
    }
    if (stats.length > 10) {
      console.log(`  ... and ${stats.length - 10} more provinces`);
    }

    const totalChargers = stats.reduce((sum, s) => sum + s._count, 0);
    console.log(`[charger-collector] Total chargers: ${totalChargers}`);

    // 24h availability
    const availability = await prisma.eVCharger.groupBy({
      by: ["is24h"],
      _count: true
    });

    console.log(`[charger-collector] 24h availability:`);
    for (const stat of availability) {
      console.log(`  ${stat.is24h ? "24h" : "Limited hours"}: ${stat._count}`);
    }

    console.log("[charger-collector] Collection completed successfully");

  } catch (error) {
    console.error("[charger-collector] Fatal error:", error);
    throw error;
  }
}
