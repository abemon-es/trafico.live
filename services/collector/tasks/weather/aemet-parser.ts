/**
 * AEMET Weather Alerts Parser
 *
 * Fetches weather alerts from AEMET (Agencia Estatal de Meteorología)
 * that could impact traffic conditions in Spain.
 *
 * API Documentation: https://opendata.aemet.es/
 * Requires API key: Register at https://opendata.aemet.es/centrodedescargas/obtencionAPIKey
 */

import { Severity } from "@prisma/client";

// AEMET API endpoints
const AEMET_BASE_URL = "https://opendata.aemet.es/opendata/api";
const AEMET_ALERTS_URL = `${AEMET_BASE_URL}/avisos_cap/ultimoelaborado/area/esp`;

// Weather alert types that impact traffic
export type WeatherAlertType =
  | "RAIN"
  | "SNOW"
  | "ICE"
  | "FOG"
  | "WIND"
  | "TEMPERATURE"
  | "STORM"
  | "COASTAL"
  | "OTHER";

// CAP alert severity mapping to our Severity enum
const CAP_SEVERITY_MAP: Record<string, Severity> = {
  Extreme: "VERY_HIGH",
  Severe: "HIGH",
  Moderate: "MEDIUM",
  Minor: "LOW",
  Unknown: "LOW",
};

// AEMET alert type keywords mapping
const ALERT_TYPE_KEYWORDS: Record<string, WeatherAlertType> = {
  lluvia: "RAIN",
  lluvias: "RAIN",
  precipitaciones: "RAIN",
  nieve: "SNOW",
  nevada: "SNOW",
  nevadas: "SNOW",
  hielo: "ICE",
  helada: "ICE",
  heladas: "ICE",
  niebla: "FOG",
  nieblas: "FOG",
  viento: "WIND",
  vientos: "WIND",
  rachas: "WIND",
  temperatura: "TEMPERATURE",
  calor: "TEMPERATURE",
  frio: "TEMPERATURE",
  ola: "TEMPERATURE",
  tormenta: "STORM",
  tormentas: "STORM",
  rayo: "STORM",
  granizo: "STORM",
  costero: "COASTAL",
  mar: "COASTAL",
  oleaje: "COASTAL",
  marejada: "COASTAL",
};

// Province code to name mapping (partial - main ones)
const PROVINCE_NAMES: Record<string, string> = {
  "01": "Álava",
  "02": "Albacete",
  "03": "Alicante",
  "04": "Almería",
  "05": "Ávila",
  "06": "Badajoz",
  "07": "Illes Balears",
  "08": "Barcelona",
  "09": "Burgos",
  "10": "Cáceres",
  "11": "Cádiz",
  "12": "Castellón",
  "13": "Ciudad Real",
  "14": "Córdoba",
  "15": "A Coruña",
  "16": "Cuenca",
  "17": "Girona",
  "18": "Granada",
  "19": "Guadalajara",
  "20": "Gipuzkoa",
  "21": "Huelva",
  "22": "Huesca",
  "23": "Jaén",
  "24": "León",
  "25": "Lleida",
  "26": "La Rioja",
  "27": "Lugo",
  "28": "Madrid",
  "29": "Málaga",
  "30": "Murcia",
  "31": "Navarra",
  "32": "Ourense",
  "33": "Asturias",
  "34": "Palencia",
  "35": "Las Palmas",
  "36": "Pontevedra",
  "37": "Salamanca",
  "38": "Santa Cruz de Tenerife",
  "39": "Cantabria",
  "40": "Segovia",
  "41": "Sevilla",
  "42": "Soria",
  "43": "Tarragona",
  "44": "Teruel",
  "45": "Toledo",
  "46": "Valencia",
  "47": "Valladolid",
  "48": "Bizkaia",
  "49": "Zamora",
  "50": "Zaragoza",
  "51": "Ceuta",
  "52": "Melilla",
};

export interface AEMETAlert {
  alertId: string;
  type: WeatherAlertType;
  severity: Severity;
  province: string;
  provinceName?: string;
  startedAt: Date;
  endedAt?: Date;
  description?: string;
  headline?: string;
}

interface CAPAlert {
  identifier: string;
  sender: string;
  sent: string;
  status: string;
  msgType: string;
  info?: CAPInfo | CAPInfo[];
}

interface CAPInfo {
  language?: string;
  category?: string;
  event?: string;
  urgency?: string;
  severity?: string;
  certainty?: string;
  effective?: string;
  onset?: string;
  expires?: string;
  senderName?: string;
  headline?: string;
  description?: string;
  area?: CAPArea | CAPArea[];
  parameter?: CAPParameter | CAPParameter[];
}

interface CAPArea {
  areaDesc?: string;
  geocode?: { valueName: string; value: string } | { valueName: string; value: string }[];
}

interface CAPParameter {
  valueName: string;
  value: string;
}

function detectAlertType(text: string): WeatherAlertType {
  const lowerText = text.toLowerCase();

  for (const [keyword, type] of Object.entries(ALERT_TYPE_KEYWORDS)) {
    if (lowerText.includes(keyword)) {
      return type;
    }
  }

  return "OTHER";
}

function extractProvinceCode(geocodes: { valueName: string; value: string }[]): string | undefined {
  // AEMET uses EMMA_ID or other geocodes that may contain province info
  for (const geo of geocodes) {
    if (geo.valueName === "EMMA_ID" || geo.valueName === "geocode") {
      // EMMA_ID format may be like "ES612" where last 2 digits could relate to province
      const value = geo.value;
      // Try to extract province code from various formats
      const match = value.match(/ES(\d{2})/);
      if (match) {
        return match[1];
      }
    }
  }
  return undefined;
}

function parseAEMETResponse(data: CAPAlert[]): AEMETAlert[] {
  const alerts: AEMETAlert[] = [];

  for (const alert of data) {
    const infos = Array.isArray(alert.info) ? alert.info : alert.info ? [alert.info] : [];

    for (const info of infos) {
      // Skip non-Spanish language entries if multiple exist
      if (info.language && !info.language.startsWith("es")) continue;

      const areas = Array.isArray(info.area) ? info.area : info.area ? [info.area] : [];

      for (const area of areas) {
        const geocodes = Array.isArray(area.geocode) ? area.geocode : area.geocode ? [area.geocode] : [];
        const provinceCode = extractProvinceCode(geocodes);

        // Determine alert type from event or headline
        const typeText = info.event || info.headline || "";
        const alertType = detectAlertType(typeText);

        // Coastal alerts are now included — relevant for maritime section and port traffic

        // Map severity
        const severity = CAP_SEVERITY_MAP[info.severity || "Unknown"] || "LOW";

        // Parse dates
        const startedAt = info.onset ? new Date(info.onset) : info.effective ? new Date(info.effective) : new Date(alert.sent);
        const endedAt = info.expires ? new Date(info.expires) : undefined;

        // Build description
        const description = [info.headline, info.description]
          .filter(Boolean)
          .join(" - ");

        // Generate unique ID combining alert ID and area
        const areaId = area.areaDesc?.replace(/\s+/g, "-").substring(0, 20) || "unknown";
        const alertId = `AEMET-${alert.identifier}-${areaId}`;

        alerts.push({
          alertId,
          type: alertType,
          severity,
          province: provinceCode || "00", // Unknown if not found
          provinceName: provinceCode ? PROVINCE_NAMES[provinceCode] : area.areaDesc,
          startedAt,
          endedAt,
          description: description || undefined,
          headline: info.headline,
        });
      }
    }
  }

  return alerts;
}

// Parse a single CAP XML file
function parseCAPXml(xml: string): CAPAlert | null {
  try {
    // Simple XML parsing without external dependencies
    const getTagContent = (tag: string, content: string): string | null => {
      const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
      const match = content.match(regex);
      return match ? match[1].trim() : null;
    };

    const getAllTagContents = (tag: string, content: string): string[] => {
      const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "gi");
      const matches = [];
      let match;
      while ((match = regex.exec(content)) !== null) {
        matches.push(match[1].trim());
      }
      return matches;
    };

    const identifier = getTagContent("identifier", xml);
    const sender = getTagContent("sender", xml);
    const sent = getTagContent("sent", xml);
    const status = getTagContent("status", xml);
    const msgType = getTagContent("msgType", xml);

    if (!identifier) return null;

    // Parse info blocks - get Spanish one
    const infoBlocks = getAllTagContents("info", xml);
    const infos: CAPInfo[] = [];

    for (const infoXml of infoBlocks) {
      const language = getTagContent("language", infoXml);
      const event = getTagContent("event", infoXml);
      const severity = getTagContent("severity", infoXml);
      const onset = getTagContent("onset", infoXml);
      const expires = getTagContent("expires", infoXml);
      const effective = getTagContent("effective", infoXml);
      const headline = getTagContent("headline", infoXml);
      const description = getTagContent("description", infoXml);

      // Parse areas
      const areaBlocks = getAllTagContents("area", infoXml);
      const areas: CAPArea[] = [];

      for (const areaXml of areaBlocks) {
        const areaDesc = getTagContent("areaDesc", areaXml);
        const geocodeBlocks = getAllTagContents("geocode", areaXml);
        const geocodes: { valueName: string; value: string }[] = [];

        for (const geocodeXml of geocodeBlocks) {
          const valueName = getTagContent("valueName", geocodeXml);
          const value = getTagContent("value", geocodeXml);
          if (valueName && value) {
            geocodes.push({ valueName, value });
          }
        }

        areas.push({ areaDesc: areaDesc || undefined, geocode: geocodes });
      }

      infos.push({
        language: language || undefined,
        event: event || undefined,
        severity: severity || undefined,
        onset: onset || undefined,
        expires: expires || undefined,
        effective: effective || undefined,
        headline: headline || undefined,
        description: description || undefined,
        area: areas,
      });
    }

    return {
      identifier,
      sender: sender || "",
      sent: sent || "",
      status: status || "",
      msgType: msgType || "",
      info: infos,
    };
  } catch (error) {
    console.error("[AEMET] Error parsing CAP XML:", error);
    return null;
  }
}

// Extract XML files from tar archive (simple parser for uncompressed tar)
function extractXmlFromTar(buffer: ArrayBuffer): string[] {
  const xmlFiles: string[] = [];
  const view = new Uint8Array(buffer);
  const decoder = new TextDecoder("utf-8");

  let offset = 0;
  while (offset < view.length - 512) {
    // Read tar header (512 bytes)
    const headerSlice = view.slice(offset, offset + 512);
    const header = decoder.decode(headerSlice);

    // Check if this is a null/empty header (end of archive)
    if (header.startsWith("\0") || header.trim() === "") {
      break;
    }

    // Extract filename from header (first 100 bytes, null-terminated)
    const filenameEnd = header.indexOf("\0");
    const filename = header.slice(0, filenameEnd > 0 && filenameEnd < 100 ? filenameEnd : 100).trim();

    // Extract file size from header (bytes 124-135, octal)
    const sizeStr = header.slice(124, 135).trim();
    const fileSize = parseInt(sizeStr, 8) || 0;

    offset += 512; // Move past header

    if (filename.endsWith(".xml") && fileSize > 0) {
      const contentSlice = view.slice(offset, offset + fileSize);
      const content = decoder.decode(contentSlice);
      xmlFiles.push(content);
    }

    // Move to next header (files are padded to 512-byte blocks)
    offset += Math.ceil(fileSize / 512) * 512;
  }

  return xmlFiles;
}

export async function fetchAEMETAlerts(apiKey: string): Promise<AEMETAlert[]> {
  if (!apiKey) {
    throw new Error("AEMET API key is required");
  }

  console.log("[AEMET] Fetching weather alerts...");

  // Step 1: Get the data URL from AEMET
  const metaResponse = await fetch(AEMET_ALERTS_URL, {
    headers: {
      api_key: apiKey,
      Accept: "application/json",
    },
  });

  if (!metaResponse.ok) {
    throw new Error(`AEMET API error: ${metaResponse.status} ${metaResponse.statusText}`);
  }

  const meta = await metaResponse.json();

  if (meta.estado !== 200 || !meta.datos) {
    console.log("[AEMET] No alerts data available:", meta.descripcion || "Unknown error");
    return [];
  }

  // Step 2: Fetch the actual data (tar archive with XML files)
  const dataResponse = await fetch(meta.datos);

  if (!dataResponse.ok) {
    throw new Error(`AEMET data fetch error: ${dataResponse.status}`);
  }

  // Read as binary (tar archive)
  const buffer = await dataResponse.arrayBuffer();

  // Extract XML files from tar
  const xmlFiles = extractXmlFromTar(buffer);
  console.log(`[AEMET] Extracted ${xmlFiles.length} CAP XML files from tar`);

  if (xmlFiles.length === 0) {
    console.log("[AEMET] No XML files found in archive");
    return [];
  }

  // Parse each XML file
  const capAlerts: CAPAlert[] = [];
  for (const xml of xmlFiles) {
    const alert = parseCAPXml(xml);
    if (alert) {
      capAlerts.push(alert);
    }
  }

  console.log(`[AEMET] Parsed ${capAlerts.length} CAP alerts`);

  const alerts = parseAEMETResponse(capAlerts);
  console.log(`[AEMET] Processed ${alerts.length} weather alerts`);

  return alerts;
}
