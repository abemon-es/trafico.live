/**
 * IMD Collector Service
 *
 * Fetches traffic counting stations and IMD (Intensidad Media Diaria)
 * data from the Spanish Ministry of Transport's ArcGIS REST API.
 *
 * Data source: mapas.fomento.gob.es/arcgis/rest/services/MapaTrafico/
 * Available years: 2015-2019
 *
 * Layers used:
 *   1 — Estaciones (counting stations, point geometry)
 *   3 — Temático IMD (road segments with IMD, polyline geometry)
 */

import { PrismaClient, RoadType, StationType } from "@prisma/client";
import { log, logError, inferRoadType } from "../../shared/utils.js";
import { normalizeProvince } from "../../shared/provinces.js";
import {
  fetchAllFeatures,
  LAYERS,
  AVAILABLE_YEARS,
  type ArcGISFeature,
} from "./arcgis-client.js";
import { utmToWgs84 } from "./utm-converter.js";

const TASK = "imd";

// Default years to collect (most recent available)
const DEFAULT_YEARS = [2017, 2018, 2019];

interface StationData {
  stationCode: string;
  province: string | null;
  provinceName: string | null;
  roadNumber: string;
  roadType: RoadType | undefined;
  kmPoint: number;
  stationType: StationType | null;
  lanes: string | null;
  configuration: string | null;
  population: string | null;
  latitude: number;
  longitude: number;
  year: number;
  imd: number | null;
  imdLigeros: number | null;
  imdPesados: number | null;
  percentPesados: number | null;
  daysRecorded: number | null;
}

interface SegmentData {
  roadNumber: string;
  roadType: RoadType | undefined;
  kmStart: number;
  kmEnd: number;
  province: string | null;
  provinceName: string | null;
  year: number;
  imd: number;
  imdLigeros: number | null;
  imdPesados: number | null;
  percentPesados: number | null;
  vhKmTotal: number | null;
  vhKmLigeros: number | null;
  vhKmPesados: number | null;
  segmentLength: number | null;
  sourceId: number | null;
}

function parseStationType(type: string | null): StationType | null {
  if (!type) return null;
  const t = type.toUpperCase().trim();
  if (t.includes("PERMANENT") && !t.includes("SEMI")) return "PERMANENT";
  if (t.includes("SEMI")) return "SEMI_PERMANENT";
  if (t.includes("PRIMAR")) return "PRIMARY";
  if (t.includes("SECUNDAR")) return "SECONDARY";
  if (t.includes("COBERTUR")) return "COVERAGE";
  // Spanish terms
  if (t === "P" || t === "PERMANENTE") return "PERMANENT";
  if (t === "SP" || t.startsWith("SEMIPERMANENTE")) return "SEMI_PERMANENT";
  if (t === "E1" || t.startsWith("PRIMARIA")) return "PRIMARY";
  if (t === "E2" || t.startsWith("SECUNDARIA")) return "SECONDARY";
  if (t === "C" || t === "AF" || t.startsWith("COBERTURA") || t.startsWith("AFORAMIENTO")) return "COVERAGE";
  return null;
}

function parseKm(value: unknown): number {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const str = String(value).replace(",", ".").replace("+", ".");
  // Handle "3+800" format → 3.800
  const match = str.match(/^(\d+)\+(\d+)$/);
  if (match) {
    return parseFloat(`${match[1]}.${match[2]}`);
  }
  return parseFloat(str) || 0;
}

function parseStation(feature: ArcGISFeature, year: number): StationData | null {
  const attrs = feature.attributes;
  const geom = feature.geometry;

  if (!geom?.x || !geom?.y) return null;

  const roadNumber = String(attrs.Carretera || attrs.carretera || "").trim();
  if (!roadNumber) return null;

  const stationCode = String(
    attrs["Estación"] || attrs.Estacion || attrs.CLAVE || attrs.estacion || ""
  ).trim();
  if (!stationCode) return null;

  const { latitude, longitude } = utmToWgs84(geom.x, geom.y);

  // Sanity check: Spain is roughly 36-44°N, 10°W-5°E
  if (latitude < 27 || latitude > 44 || longitude < -19 || longitude > 5) {
    return null;
  }

  const provinceName = String(attrs.Provincia || attrs.provincia || "").trim();
  const province = normalizeProvince(provinceName);

  const imdTotal = Number(attrs.IMD_total || attrs.imd_total || 0) || null;
  const imdLigeros = Number(attrs.IMD_ligero || attrs.IMD_ligeros || attrs.imd_ligeros || 0) || null;
  const imdPesados = Number(attrs.IMD_pesado || attrs.IMD_pesados || attrs.imd_pesados || 0) || null;

  return {
    stationCode,
    province,
    provinceName: provinceName || null,
    roadNumber,
    roadType: inferRoadType(roadNumber),
    kmPoint: parseKm(attrs.Pk || attrs.pk || attrs.PK || 0),
    stationType: parseStationType(
      String(attrs.Tipo_de_es || attrs.tipo_de_es || attrs.Tipo || "")
    ),
    lanes: String(attrs["Número_de"] || attrs.Numero_de || "").trim() || null,
    configuration: String(attrs.Configurac || attrs.configurac || "").trim() || null,
    population: String(attrs["Población"] || attrs.Poblacion || attrs.poblacion || "").trim() || null,
    latitude,
    longitude,
    year,
    imd: imdTotal,
    imdLigeros,
    imdPesados,
    percentPesados:
      imdTotal && imdPesados
        ? Math.round((imdPesados / imdTotal) * 10000) / 100
        : Number(attrs["F__VP"] || attrs.f__vp || 0) || null,
    daysRecorded: Number(attrs["Días_afor"] || attrs.Dias_afor || attrs.dias_afor || 0) || null,
  };
}

function parseSegment(feature: ArcGISFeature, year: number): SegmentData | null {
  const attrs = feature.attributes;

  const roadNumber = String(attrs.Nombre || attrs.nombre || "").trim();
  if (!roadNumber) return null;

  const imd = Number(attrs.IMD_total || attrs.imd_total || attrs.IMD || 0);
  if (!imd || imd <= 0) return null;

  const kmStart = parseKm(attrs.Pk_inicio || attrs.pk_inicio);
  const kmEnd = parseKm(attrs.Pk_fin || attrs.pk_fin);
  if (kmStart === 0 && kmEnd === 0) return null; // Reject degenerate km ranges

  const provinceName = String(attrs.Provincia || attrs.provincia || "").trim();
  const province = normalizeProvince(provinceName);

  const imdLigeros = Number(attrs.IMD_ligero || attrs.imd_ligeros || 0) || null;
  const imdPesados = Number(attrs.IMD_pesado || attrs.imd_pesados || attrs.imd_pesado || 0) || null;
  const vhKmTotal = Number(attrs.vh_km_tota || attrs.vh_km_total || 0) || null;
  const vhKmLigeros = Number(attrs.vh_km_lige || attrs.vh_km_ligeros || 0) || null;
  const vhKmPesados = Number(attrs.vh_km_pesa || attrs.vh_km_pesados || 0) || null;

  // Determine road type from Tipo_de_ca field or infer from name
  let roadType: RoadType | undefined;
  const tipoStr = String(attrs.Tipo_de_ca || attrs.tipo_de_ca || "").trim().toUpperCase();
  if (tipoStr.includes("AUTOPISTA")) roadType = "AUTOPISTA";
  else if (tipoStr.includes("AUTOVÍA") || tipoStr.includes("AUTOVIA")) roadType = "AUTOVIA";
  else if (tipoStr.includes("NACIONAL") || tipoStr.includes("RED GENERAL")) roadType = "NACIONAL";
  else if (tipoStr.includes("COMARCAL")) roadType = "COMARCAL";
  else roadType = inferRoadType(roadNumber);

  return {
    roadNumber,
    roadType,
    kmStart,
    kmEnd,
    province,
    provinceName: provinceName || null,
    year,
    imd,
    imdLigeros,
    imdPesados,
    percentPesados:
      imd && imdPesados
        ? Math.round((imdPesados / imd) * 10000) / 100
        : null,
    vhKmTotal,
    vhKmLigeros,
    vhKmPesados,
    segmentLength: Number(attrs.Longitud || attrs.longitud || 0) || null,
    sourceId: Number(attrs.OBJECTID || attrs.ID || attrs.id) || null,
  };
}

async function upsertStations(
  prisma: PrismaClient,
  stations: StationData[]
): Promise<number> {
  let count = 0;
  const batchSize = 200;

  for (let i = 0; i < stations.length; i += batchSize) {
    const batch = stations.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((s) =>
        prisma.trafficStation.upsert({
          where: {
            stationCode_year: {
              stationCode: s.stationCode,
              year: s.year,
            },
          },
          update: {
            province: s.province,
            provinceName: s.provinceName,
            roadNumber: s.roadNumber,
            roadType: s.roadType || null,
            kmPoint: s.kmPoint,
            stationType: s.stationType,
            lanes: s.lanes,
            configuration: s.configuration,
            population: s.population,
            latitude: s.latitude,
            longitude: s.longitude,
            imd: s.imd,
            imdLigeros: s.imdLigeros,
            imdPesados: s.imdPesados,
            percentPesados: s.percentPesados,
            daysRecorded: s.daysRecorded,
          },
          create: {
            stationCode: s.stationCode,
            province: s.province,
            provinceName: s.provinceName,
            roadNumber: s.roadNumber,
            roadType: s.roadType || null,
            kmPoint: s.kmPoint,
            stationType: s.stationType,
            lanes: s.lanes,
            configuration: s.configuration,
            population: s.population,
            latitude: s.latitude,
            longitude: s.longitude,
            year: s.year,
            imd: s.imd,
            imdLigeros: s.imdLigeros,
            imdPesados: s.imdPesados,
            percentPesados: s.percentPesados,
            daysRecorded: s.daysRecorded,
          },
        })
      )
    );

    count += results.filter((r) => r.status === "fulfilled").length;
    const failures = results.filter((r) => r.status === "rejected").length;
    if (failures > 0) {
      logError(TASK, `${failures} station upserts failed in batch at offset ${i}`);
    }
  }

  return count;
}

async function upsertSegments(
  prisma: PrismaClient,
  segments: SegmentData[]
): Promise<number> {
  let count = 0;
  const batchSize = 200;

  for (let i = 0; i < segments.length; i += batchSize) {
    const batch = segments.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((s) =>
        prisma.trafficFlow.upsert({
          where: {
            roadNumber_kmStart_kmEnd_year: {
              roadNumber: s.roadNumber,
              kmStart: s.kmStart,
              kmEnd: s.kmEnd,
              year: s.year,
            },
          },
          update: {
            roadType: s.roadType || null,
            province: s.province,
            provinceName: s.provinceName,
            imd: s.imd,
            imdLigeros: s.imdLigeros,
            imdPesados: s.imdPesados,
            percentPesados: s.percentPesados,
            vhKmTotal: s.vhKmTotal,
            vhKmLigeros: s.vhKmLigeros,
            vhKmPesados: s.vhKmPesados,
            segmentLength: s.segmentLength,
            sourceId: s.sourceId,
          },
          create: {
            roadNumber: s.roadNumber,
            roadType: s.roadType || null,
            kmStart: s.kmStart,
            kmEnd: s.kmEnd,
            province: s.province,
            provinceName: s.provinceName,
            year: s.year,
            imd: s.imd,
            imdLigeros: s.imdLigeros,
            imdPesados: s.imdPesados,
            percentPesados: s.percentPesados,
            vhKmTotal: s.vhKmTotal,
            vhKmLigeros: s.vhKmLigeros,
            vhKmPesados: s.vhKmPesados,
            segmentLength: s.segmentLength,
            sourceId: s.sourceId,
          },
        })
      )
    );

    count += results.filter((r) => r.status === "fulfilled").length;
    const failures = results.filter((r) => r.status === "rejected").length;
    if (failures > 0) {
      logError(TASK, `${failures} segment upserts failed in batch at offset ${i}`);
    }
  }

  return count;
}

export async function run(prisma: PrismaClient): Promise<void> {
  const yearsArg = process.env.IMD_YEARS;
  const years: number[] = yearsArg
    ? yearsArg.split(",").map(Number).filter((y) => AVAILABLE_YEARS.includes(y as typeof AVAILABLE_YEARS[number]))
    : DEFAULT_YEARS;

  log(TASK, `Starting IMD collection for years: ${years.join(", ")}`);
  log(TASK, `Data source: Ministry of Transport ArcGIS REST API`);

  let totalStations = 0;
  let totalSegments = 0;

  for (const year of years) {
    log(TASK, `\n=== Processing year ${year} ===`);

    // 1. Fetch counting stations
    try {
      const stationFeatures = await fetchAllFeatures(year, LAYERS.STATIONS);
      const stations = stationFeatures
        .map((f) => parseStation(f, year))
        .filter((s): s is StationData => s !== null);

      log(TASK, `Parsed ${stations.length} stations from ${stationFeatures.length} features`);

      if (stations.length > 0) {
        const upserted = await upsertStations(prisma, stations);
        totalStations += upserted;
        log(TASK, `Upserted ${upserted} stations for ${year}`);
      }
    } catch (error) {
      logError(TASK, `Failed to fetch stations for ${year}:`, error);
    }

    // 2. Fetch IMD segments
    try {
      const segmentFeatures = await fetchAllFeatures(year, LAYERS.IMD_THEMATIC);
      const segments = segmentFeatures
        .map((f) => parseSegment(f, year))
        .filter((s): s is SegmentData => s !== null);

      log(TASK, `Parsed ${segments.length} segments from ${segmentFeatures.length} features`);

      if (segments.length > 0) {
        const upserted = await upsertSegments(prisma, segments);
        totalSegments += upserted;
        log(TASK, `Upserted ${upserted} segments for ${year}`);
      }
    } catch (error) {
      logError(TASK, `Failed to fetch segments for ${year}:`, error);
    }

    // Rate limiting between years
    if (years.indexOf(year) < years.length - 1) {
      log(TASK, `Waiting 2s before next year...`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  log(TASK, `\n=== IMD Collection Complete ===`);
  log(TASK, `Total stations: ${totalStations}`);
  log(TASK, `Total segments: ${totalSegments}`);
}
