/**
 * Puertos del Estado — State Port Catalog Collector
 * Source: INSPIRE WFS at geoserver.puertos.es
 * 50 state-owned ports with polygon boundaries
 */

import { PrismaClient } from "@prisma/client";
import { log, logError } from "../../shared/utils.js";

const TASK = "puertos-estado";
const WFS_URL = "https://geoserver.puertos.es/wms-inspire/puertos?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=TN.WaterTransportNetwork.PortArea&OUTPUTFORMAT=application/json";

// Port Authority codes → coastal zone names
const COASTAL_ZONES: Record<string, string> = {
  "0101": "A Coruña", "0102": "Ferrol-San Cibrao", "0201": "Avilés",
  "0202": "Gijón", "0301": "Santander", "0401": "Bilbao", "0501": "Pasaia",
  "0601": "Tarragona", "0701": "Barcelona", "0801": "Baleares",
  "0901": "Valencia", "0902": "Gandía", "0903": "Sagunto",
  "1001": "Alicante", "1101": "Cartagena", "1201": "Almería",
  "1202": "Carboneras", "1301": "Motril", "1401": "Málaga",
  "1501": "Bahía de Algeciras", "1601": "Bahía de Cádiz",
  "1701": "Sevilla", "1801": "Huelva",
  "1901": "Las Palmas", "2001": "S/C de Tenerife",
  "2101": "Vigo", "2201": "Marín y Ría de Pontevedra",
  "2301": "Vilagarcía de Arousa", "2401": "Castellón",
  "2501": "Ceuta", "2601": "Melilla",
};

function computeCentroid(geometry: { type: string; coordinates: number[][][] | number[][][][] }): { lat: number; lon: number } | null {
  let coords: number[][] = [];
  if (geometry.type === "Polygon") {
    coords = (geometry.coordinates as number[][][])[0] || [];
  } else if (geometry.type === "MultiPolygon") {
    for (const polygon of (geometry.coordinates as number[][][][])) {
      coords.push(...(polygon[0] || []));
    }
  }
  if (coords.length === 0) return null;
  const sumLon = coords.reduce((s, c) => s + c[0], 0);
  const sumLat = coords.reduce((s, c) => s + c[1], 0);
  return { lat: sumLat / coords.length, lon: sumLon / coords.length };
}

export async function run(prisma: PrismaClient): Promise<void> {
  log(TASK, "Fetching Puertos del Estado WFS...");

  const res = await fetch(WFS_URL, {
    headers: { "User-Agent": "trafico.live collector/1.0", "Accept": "application/json" },
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    logError(TASK, `WFS returned HTTP ${res.status}`);
    return;
  }

  const geojson = await res.json() as {
    type: string;
    features?: Array<{
      geometry: { type: string; coordinates: number[][][] | number[][][][] };
      properties?: Record<string, string | number>;
    }>;
  };

  const features = geojson.features || [];
  log(TASK, `Received ${features.length} port zone features`);

  // Group by port name to aggregate service zones
  const portMap = new Map<string, { lats: number[]; lons: number[]; codAp: string; idProv: string; idCcaa: string }>();

  for (const f of features) {
    const name = String(f.properties?.puerto || "").trim();
    if (!name) continue;
    const centroid = computeCentroid(f.geometry);
    if (!centroid) continue;
    // Sanity check: within Spain's bounding box
    if (centroid.lat < 27 || centroid.lat > 44 || centroid.lon < -20 || centroid.lon > 5) continue;

    const existing = portMap.get(name) || {
      lats: [], lons: [],
      codAp: String(f.properties?.cod_ap || ""),
      idProv: String(f.properties?.id_prov || ""),
      idCcaa: String(f.properties?.id_ccaa || ""),
    };
    existing.lats.push(centroid.lat);
    existing.lons.push(centroid.lon);
    portMap.set(name, existing);
  }

  log(TASK, `Grouped into ${portMap.size} unique ports`);

  let upserted = 0;
  for (const [name, data] of portMap) {
    const lat = data.lats.reduce((s, v) => s + v, 0) / data.lats.length;
    const lon = data.lons.reduce((s, v) => s + v, 0) / data.lons.length;
    const slug = name.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const coastalZone = COASTAL_ZONES[data.codAp] || null;
    const province = data.idProv.padStart(2, "0");

    try {
      await prisma.spanishPort.upsert({
        where: { slug },
        create: {
          slug, name, type: "COMMERCIAL",
          latitude: lat, longitude: lon,
          province: province !== "00" ? province : null,
          coastalZone,
        },
        update: {
          name, type: "COMMERCIAL",
          latitude: lat, longitude: lon,
          province: province !== "00" ? province : null,
          coastalZone,
        },
      });
      upserted++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logError(TASK, `Failed ${name}: ${msg.slice(0, 80)}`);
    }
  }

  log(TASK, `Upserted ${upserted} state ports`);
}
