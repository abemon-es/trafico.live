import { XMLParser } from "fast-xml-parser";

// DATEX II XML Parser for DGT EV Charger (Electrolineras) API

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
    ].includes(name),
});

export interface ChargerConnector {
  type: string;
  mode: string;
  format: string;
  powerKw: number;
  voltage?: number;
  maxCurrent?: number;
}

export interface ChargerData {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  postalCode?: string;
  city?: string;
  province?: string;
  community?: string;
  operator?: string;
  operatorId?: string;
  siteType?: string;
  connectors: ChargerConnector[];
  totalPowerKw: number;
  connectorCount: number;
  is24h: boolean;
  schedule?: string;
  lastUpdated?: string;
  authMethods: string[];
}

// Parse the EnergyInfrastructure XML
export function parseEnergyInfrastructurePublication(xml: string): ChargerData[] {
  try {
    const result = parser.parse(xml);
    const publication = result?.payload;

    if (!publication) {
      console.warn("No payload found in energy infrastructure response");
      return [];
    }

    const table = publication.energyInfrastructureTable;
    if (!table) {
      console.warn("No energyInfrastructureTable found");
      return [];
    }

    const sites = ensureArray(table.energyInfrastructureSite);
    const chargers: ChargerData[] = [];

    for (const site of sites) {
      const charger = parseSiteAsCharger(site);
      if (charger) {
        chargers.push(charger);
      }
    }

    return chargers;
  } catch (error) {
    console.error("Error parsing energy infrastructure XML:", error);
    return [];
  }
}

function parseSiteAsCharger(site: Record<string, unknown>): ChargerData | null {
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

    const { address, postalCode, city, province, community } = parseAddress(addressObj);

    // Extract operator
    const operatorObj = site.operator as Record<string, unknown> | undefined;
    const operatorNameObj = operatorObj?.name as Record<string, unknown> | undefined;
    const operatorValuesObj = operatorNameObj?.values as Record<string, unknown> | undefined;
    const operator = extractTextValue(operatorValuesObj);
    const operatorId = String(operatorObj?.["@_id"] || "");

    // Extract operating hours
    const operatingHours = site.operatingHours as Record<string, unknown> | undefined;
    const schedule = String(operatingHours?.label || "");
    const is24h = check24Hours(schedule);

    // Extract site type
    const siteType = String(site.typeOfSite || "");

    // Extract last updated
    const lastUpdated = String(site.lastUpdated || "");

    // Extract connectors from stations
    const stations = ensureArray(site.energyInfrastructureStation);
    const allConnectors: ChargerConnector[] = [];
    const authMethods = new Set<string>();

    for (const station of stations) {
      // Collect auth methods
      const authMethodsArr = ensureArray(
        (station as Record<string, unknown>).authenticationAndIdentificationMethods
      );
      for (const method of authMethodsArr) {
        if (typeof method === "string") {
          authMethods.add(method);
        }
      }

      // Parse refill points (charging points)
      const refillPoints = ensureArray((station as Record<string, unknown>).refillPoint);
      for (const point of refillPoints) {
        const connectors = parseRefillPoint(point as Record<string, unknown>);
        allConnectors.push(...connectors);
      }
    }

    // Calculate totals
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
      community,
      operator,
      operatorId,
      siteType,
      connectors: allConnectors,
      totalPowerKw,
      connectorCount,
      is24h,
      schedule: schedule || undefined,
      lastUpdated: lastUpdated || undefined,
      authMethods: Array.from(authMethods),
    };
  } catch (error) {
    console.error("Error parsing charger site:", error);
    return null;
  }
}

function parseRefillPoint(point: Record<string, unknown>): ChargerConnector[] {
  const connectors: ChargerConnector[] = [];
  const connectorArr = ensureArray(point.connector);

  for (const conn of connectorArr) {
    const connObj = conn as Record<string, unknown>;

    const type = String(connObj.connectorType || "unknown");
    const mode = String(connObj.chargingMode || "");
    const format = String(connObj.connectorFormat || "");

    // Power is in watts, convert to kW
    const powerWatts = parseFloat(String(connObj.maxPowerAtSocket || 0));
    const powerKw = powerWatts / 1000;

    const voltage = connObj.voltage ? parseFloat(String(connObj.voltage)) : undefined;
    const maxCurrent = connObj.maximumCurrent ? parseFloat(String(connObj.maximumCurrent)) : undefined;

    if (powerKw > 0) {
      connectors.push({
        type: formatConnectorType(type),
        mode: formatChargingMode(mode),
        format,
        powerKw,
        voltage,
        maxCurrent,
      });
    }
  }

  return connectors;
}

function parseAddress(addressObj: Record<string, unknown> | undefined): {
  address?: string;
  postalCode?: string;
  city?: string;
  province?: string;
  community?: string;
} {
  if (!addressObj) return {};

  const postalCode = String(addressObj.postcode || "").padStart(5, "0");

  const addressLines = ensureArray(addressObj.addressLine);
  let address: string | undefined;
  let city: string | undefined;
  let province: string | undefined;
  let community: string | undefined;

  for (const line of addressLines) {
    const lineObj = line as Record<string, unknown>;
    const textObj = lineObj.text as Record<string, unknown> | undefined;
    const valuesObj = textObj?.values as Record<string, unknown> | undefined;
    const text = extractTextValue(valuesObj) || "";

    // Parse the text based on prefix
    if (text.startsWith("Dirección:")) {
      address = text.replace("Dirección:", "").trim();
    } else if (text.startsWith("Municipio:")) {
      city = text.replace("Municipio:", "").trim();
    } else if (text.startsWith("Provincia:")) {
      province = text.replace("Provincia:", "").trim();
    } else if (text.startsWith("Comunidad Autónoma:")) {
      community = text.replace("Comunidad Autónoma:", "").trim();
    }
  }

  return { address, postalCode, city, province, community };
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
  // Check if schedule shows 24h operation (00:00 - 23:59 for most/all days)
  const has24h = schedule.includes("00:00 - 23:59");
  const weekdayCount = (schedule.match(/00:00 - 23:59/g) || []).length;
  return has24h && weekdayCount >= 5;
}

function formatConnectorType(type: string): string {
  const typeMap: Record<string, string> = {
    iec62196T2COMBO: "CCS Combo 2",
    iec62196T2: "Type 2",
    chademo: "CHAdeMO",
    domestic: "Schuko",
    iec62196T1: "Type 1",
    iec62196T1COMBO: "CCS Combo 1",
    teslaConnector: "Tesla",
  };
  return typeMap[type] || type;
}

function formatChargingMode(mode: string): string {
  const modeMap: Record<string, string> = {
    mode4DC: "DC Fast",
    mode3: "AC",
    mode2: "AC Slow",
    mode1: "AC Basic",
  };
  return modeMap[mode] || mode;
}

function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

// Fetch chargers from DGT EnergyInfrastructure API
export async function fetchDGTChargers(): Promise<ChargerData[]> {
  const url =
    "https://infocar.dgt.es/datex2/v3/miterd/EnergyInfrastructureTablePublication/electrolineras.xml";

  const response = await fetch(url, {
    headers: {
      Accept: "application/xml",
      "User-Agent": "TraficoEspana/1.0 (https://trafico.abemon.es)",
    },
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!response.ok) {
    throw new Error(`DGT Charger API error: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  return parseEnergyInfrastructurePublication(xml);
}
