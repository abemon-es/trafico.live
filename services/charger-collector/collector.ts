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
 *
 * @deprecated Use unified collector: services/collector/ with TASK=charger
 */

import { PrismaClient, ChargerType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { XMLParser } from "fast-xml-parser";

const DGT_CHARGERS_URL =
  "https://infocar.dgt.es/datex2/v3/miterd/EnergyInfrastructureTablePublication/electrolineras.xml";

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

// Reverse lookup: province name -> code
const PROVINCE_NAME_TO_CODE: Record<string, string> = {};
for (const [code, name] of Object.entries(PROVINCES)) {
  PROVINCE_NAME_TO_CODE[name.toLowerCase()] = code;
  PROVINCE_NAME_TO_CODE[name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")] = code;
}

// Additional province name variations
const PROVINCE_ALIASES: Record<string, string> = {
  "alava": "01", "araba": "01",
  "vizcaya": "48", "bizkaia": "48",
  "guipuzcoa": "20", "gipuzkoa": "20",
  "la coruna": "15", "a coruna": "15", "coruna": "15",
  "gerona": "17", "girona": "17",
  "lerida": "25", "lleida": "25",
  "orense": "32", "ourense": "32",
  "baleares": "07", "illes balears": "07", "islas baleares": "07",
  "santa cruz de tenerife": "38", "tenerife": "38",
  "las palmas": "35", "gran canaria": "35",
  "la rioja": "26", "rioja": "26",
  "navarra": "31", "nafarroa": "31",
  "asturias": "33", "principado de asturias": "33",
  "cantabria": "39",
  "murcia": "30", "region de murcia": "30",
  "madrid": "28", "comunidad de madrid": "28"
};

Object.assign(PROVINCE_NAME_TO_CODE, PROVINCE_ALIASES);

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
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
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

function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeProvince(province: string): string | null {
  if (!province) return null;

  // If it's already a 2-digit code, use it
  if (/^\d{2}$/.test(province) && PROVINCES[province]) {
    return province;
  }

  // Try to find by name
  const normalized = province.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  return PROVINCE_NAME_TO_CODE[normalized] || null;
}

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

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
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

    // 3. Prepare upsert operations
    const fetchedIds = new Set<string>();
    let created = 0;
    let updated = 0;

    for (const charger of chargers) {
      fetchedIds.add(charger.id);

      const provinceCode = normalizeProvince(charger.province || "");

      // Map connector types to Prisma enum
      const chargerTypes: ChargerType[] = [...new Set(
        charger.connectors.map(c => mapConnectorType(c.type))
      )];

      // Map payment methods from auth methods
      const paymentMethods: string[] = charger.authMethods.filter(m =>
        m.includes("payment") || m.includes("card") || m.includes("app") || m.includes("rfid")
      );

      await prisma.eVCharger.upsert({
        where: { id: charger.id },
        create: {
          id: charger.id,
          name: charger.name,
          latitude: charger.latitude,
          longitude: charger.longitude,
          address: charger.address || null,
          city: charger.city || null,
          postalCode: charger.postalCode || null,
          province: provinceCode,
          provinceName: provinceCode ? PROVINCES[provinceCode] || null : null,
          chargerTypes,
          powerKw: charger.totalPowerKw,
          connectors: charger.connectorCount,
          operator: charger.operator || null,
          network: null, // Not available in source data
          isPublic: true,
          is24h: charger.is24h,
          paymentMethods,
          lastUpdated: now
        },
        update: {
          name: charger.name,
          latitude: charger.latitude,
          longitude: charger.longitude,
          address: charger.address || null,
          city: charger.city || null,
          postalCode: charger.postalCode || null,
          province: provinceCode,
          provinceName: provinceCode ? PROVINCES[provinceCode] || null : null,
          chargerTypes,
          powerKw: charger.totalPowerKw,
          connectors: charger.connectorCount,
          operator: charger.operator || null,
          isPublic: true,
          is24h: charger.is24h,
          paymentMethods,
          lastUpdated: now
        }
      });

      if (existingIds.has(charger.id)) {
        updated++;
      } else {
        created++;
      }
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

    // Charger type breakdown
    const typeStats = await prisma.eVCharger.findMany({
      select: { chargerTypes: true }
    });

    const typeCount: Record<string, number> = {};
    for (const charger of typeStats) {
      for (const type of charger.chargerTypes) {
        typeCount[type] = (typeCount[type] || 0) + 1;
      }
    }

    console.log(`[charger-collector] Charger types:`);
    for (const [type, count] of Object.entries(typeCount).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${type}: ${count}`);
    }

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
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
