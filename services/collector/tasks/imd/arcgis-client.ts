/**
 * ArcGIS REST API client for the Ministry's traffic map services.
 *
 * Handles paginated queries against MapServer layers with automatic
 * result offset for datasets larger than maxRecordCount (1000).
 *
 * Source: mapas.fomento.gob.es/arcgis/rest/services/MapaTrafico/
 */

import { log, logError } from "../../shared/utils.js";

const BASE_URL =
  "https://mapas.fomento.gob.es/arcgis/rest/services/MapaTrafico";
const MAX_RECORDS = 1000;
const TASK = "imd";

export interface ArcGISFeature {
  attributes: Record<string, unknown>;
  geometry?: {
    x?: number;
    y?: number;
    paths?: number[][][];
  };
}

interface ArcGISResponse {
  features?: ArcGISFeature[];
  exceededTransferLimit?: boolean;
  error?: { code: number; message: string };
}

/**
 * Available layer IDs per map year service (Mapa{YEAR}web)
 */
export const LAYERS = {
  STATIONS: 1, // Estaciones — Point geometry
  SEGMENTS: 2, // Tramos — Polyline geometry
  IMD_THEMATIC: 3, // Temático IMD — Polyline geometry
  IMD_HEAVY: 4, // Temático IMD Pesados — Polyline geometry
} as const;

/**
 * Years with confirmed working ArcGIS services
 */
export const AVAILABLE_YEARS = [2015, 2016, 2017, 2018, 2019] as const;

function buildServiceUrl(year: number): string {
  return `${BASE_URL}/Mapa${year}web/MapServer`;
}

/**
 * Query a single page of features from an ArcGIS MapServer layer.
 */
async function queryPage(
  serviceUrl: string,
  layerId: number,
  offset: number,
  where = "1=1"
): Promise<ArcGISResponse> {
  const params = new URLSearchParams({
    where,
    outFields: "*",
    returnGeometry: "true",
    resultOffset: String(offset),
    resultRecordCount: String(MAX_RECORDS),
    f: "json",
  });

  const url = `${serviceUrl}/${layerId}/query?${params}`;
  const response = await fetch(url, {
    headers: { "User-Agent": "trafico.live-collector/1.0" },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`ArcGIS query failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<ArcGISResponse>;
}

/**
 * Fetch ALL features from a layer with automatic pagination.
 * Returns all features across all pages.
 */
export async function fetchAllFeatures(
  year: number,
  layerId: number,
  where = "1=1"
): Promise<ArcGISFeature[]> {
  const serviceUrl = buildServiceUrl(year);
  const allFeatures: ArcGISFeature[] = [];
  let offset = 0;
  let hasMore = true;
  const MAX_PAGES = 500;
  let pageCount = 0;

  log(TASK, `Fetching layer ${layerId} for year ${year}...`);

  while (hasMore && pageCount < MAX_PAGES) {
    pageCount++;
    try {
      const data = await queryPage(serviceUrl, layerId, offset, where);

      if (data.error) {
        logError(TASK, `ArcGIS error: ${data.error.message}`);
        break;
      }

      const features = data.features || [];
      allFeatures.push(...features);

      if (features.length < MAX_RECORDS && !data.exceededTransferLimit) {
        hasMore = false;
      } else {
        offset += MAX_RECORDS;
        // Rate limit: 300ms between pages to avoid government server throttling
        await new Promise((r) => setTimeout(r, 300));
      }

      if (features.length > 0) {
        log(TASK, `  Fetched ${allFeatures.length} features (offset ${offset})...`);
      }
    } catch (error) {
      logError(TASK, `Failed at offset ${offset}:`, error);
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const retryData = await queryPage(serviceUrl, layerId, offset, where);
        const features = retryData.features || [];
        allFeatures.push(...features);
        if (features.length < MAX_RECORDS && !retryData.exceededTransferLimit) hasMore = false;
        else offset += MAX_RECORDS;
      } catch {
        logError(TASK, `Retry also failed at offset ${offset}, stopping.`);
        hasMore = false;
      }
    }
  }

  if (pageCount >= MAX_PAGES) {
    logError(TASK, `Reached max page limit (${MAX_PAGES}) for layer ${layerId}/${year}`);
  }

  log(TASK, `Total: ${allFeatures.length} features from layer ${layerId} (${year})`);
  return allFeatures;
}
