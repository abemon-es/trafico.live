/**
 * Speed Limit Collector Service
 *
 * Fetches speed limit data from MITMA TN-ITS feed (ROSATTE XML).
 * The data covers Spain's national road network (Red de Carreteras del Estado).
 *
 * Run weekly via cron (speed limits rarely change).
 *
 * Data source:
 * - https://infocar.dgt.es/tnits/limitesVelocidad.xml
 * - Schema: TN-ITS / ROSATTE (rst:ROSATTESafetyFeatureDataset)
 * - Coordinates: ETRS89 / UTM Zone 30N (EPSG:25830)
 * - Feed type: Delta (Add/Modify/Remove operations)
 *
 * Publisher: Dirección General de Carreteras, MITMA (not DGT)
 */

import { PrismaClient, Direction, RoadType, SpeedLimitType } from "@prisma/client";
import { PROVINCES } from "../../shared/provinces.js";

const TNITS_URL = "https://infocar.dgt.es/tnits/limitesVelocidad.xml";

const TAG = "[speedlimit]";

// ── UTM Zone 30N → WGS84 conversion ──────────────────────────────────

function utmToLatLng(easting: number, northing: number): { lat: number; lng: number } | null {
  // Sanity check: UTM Zone 30N bounds for Spain
  if (northing < 3_500_000 || northing > 5_000_000) return null;
  if (easting < 100_000 || easting > 900_000) return null;

  const k0 = 0.9996;
  const a = 6378137.0;
  const e = 0.081819191;
  const e2 = e * e;
  const ep2 = e2 / (1 - e2);

  const x = easting - 500000;
  const y = northing;

  const M = y / k0;
  const mu = M / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256));

  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const phi1 = mu
    + (3 * e1 / 2 - 27 * e1 * e1 * e1 / 32) * Math.sin(2 * mu)
    + (21 * e1 * e1 / 16 - 55 * e1 * e1 * e1 * e1 / 32) * Math.sin(4 * mu)
    + (151 * e1 * e1 * e1 / 96) * Math.sin(6 * mu);

  const sinPhi = Math.sin(phi1);
  const cosPhi = Math.cos(phi1);
  const tanPhi = sinPhi / cosPhi;

  const N1 = a / Math.sqrt(1 - e2 * sinPhi * sinPhi);
  const T1 = tanPhi * tanPhi;
  const C1 = ep2 * cosPhi * cosPhi;
  const R1 = a * (1 - e2) / Math.pow(1 - e2 * sinPhi * sinPhi, 1.5);
  const D = x / (N1 * k0);

  const lat = phi1
    - (N1 * tanPhi / R1) * (
      D * D / 2
      - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * D * D * D * D / 24
      + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) * D * D * D * D * D * D / 720
    );

  // Zone 30 central meridian = -3° = (30-1)*6 - 180 + 3
  const lng = (-3 * Math.PI / 180)
    + (D
      - (1 + 2 * T1 + C1) * D * D * D / 6
      + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) * D * D * D * D * D / 120
    ) / cosPhi;

  const latDeg = lat * 180 / Math.PI;
  const lngDeg = lng * 180 / Math.PI;

  // Sanity: Spain mainland + islands
  if (latDeg < 27 || latDeg > 44 || lngDeg < -19 || lngDeg > 5) return null;

  return {
    lat: Math.round(latDeg * 1e6) / 1e6,
    lng: Math.round(lngDeg * 1e6) / 1e6,
  };
}

// ── XML regex parsing (no dependency on fast-xml-parser for namespaced XML) ──

interface TnItsRecord {
  gmlId: string;
  uuid: string;
  operation: "Add" | "Modify" | "Remove";
  road: string;
  kmStart: number;
  kmEnd: number;
  direction: string;
  roadCharacter: string; // Tronco, Enlace
  speedLimit: number;
  lat?: number;
  lng?: number;
}

function getTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`));
  return match ? match[1].trim() : "";
}

function parseRecords(xml: string): TnItsRecord[] {
  const records: TnItsRecord[] = [];
  const featureRegex = /<rst:GenericSafetyFeature[^>]*gml:id="(\d+)">([\s\S]*?)<\/rst:GenericSafetyFeature>/g;

  let match;
  while ((match = featureRegex.exec(xml)) !== null) {
    const gmlId = match[1];
    const block = match[2];

    // UUID
    const uuidMatch = block.match(/<rst:id>([^<]+)<\/rst:id>/);
    // There are two rst:id tags (parent wrapper + actual id). Get the one inside SafetyFeatureId
    const idBlock = block.match(/<rst:SafetyFeatureId>([\s\S]*?)<\/rst:SafetyFeatureId>/);
    const uuid = idBlock ? getTag(idBlock[1], "rst:id") : (uuidMatch?.[1] || gmlId);

    // Operation type
    const opMatch = block.match(/<rst:UpdateInfo>[\s\S]*?<rst:type>(\w+)<\/rst:type>/);
    const operation = (opMatch?.[1] || "Add") as "Add" | "Modify" | "Remove";

    // Location reference
    const linearRef = block.match(/<net:SimpleLinearReference>([\s\S]*?)<\/net:SimpleLinearReference>/);
    const road = linearRef ? getTag(linearRef[1], "net:road") : "";
    const fromPos = linearRef ? parseFloat(getTag(linearRef[1], "net:fromPosition")) : 0;
    const toPos = linearRef ? parseFloat(getTag(linearRef[1], "net:toPosition") || "0") : 0;
    const direction = linearRef ? getTag(linearRef[1], "net:applicableDirection") : "";
    const roadCharacter = linearRef ? getTag(linearRef[1], "net:caracter") : "";

    // Speed limit value
    const measureMatch = block.match(/<gml:measure[^>]*>(\d+)<\/gml:measure>/);
    const speedLimit = measureMatch ? parseInt(measureMatch[1], 10) : 0;

    // Coordinates (ETRS89 / UTM Zone 30N)
    const posListMatch = block.match(/<gml:posList>([^<]+)<\/gml:posList>/);
    let lat: number | undefined;
    let lng: number | undefined;

    if (posListMatch) {
      // Format: "northing ,easting" (comma-space separated, dot decimal)
      const parts = posListMatch[1].split(",").map(s => parseFloat(s.trim()));
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        const coords = utmToLatLng(parts[1], parts[0]); // easting, northing
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
        }
      }
    }

    if (!road || speedLimit <= 0 || speedLimit > 150) continue;

    records.push({
      gmlId,
      uuid,
      operation,
      road: road.toUpperCase(),
      kmStart: isNaN(fromPos) ? 0 : fromPos,
      kmEnd: isNaN(toPos) || toPos === 0 ? (isNaN(fromPos) ? 0 : fromPos) : toPos,
      direction,
      roadCharacter,
      speedLimit,
      lat,
      lng,
    });
  }

  return records;
}

// ── Mapping helpers ──

function classifyRoadType(road: string): RoadType | null {
  if (!road) return null;
  if (road.startsWith("AP-")) return "AUTOPISTA";
  if (road.startsWith("A-")) return "AUTOVIA";
  if (road.startsWith("N-")) return "NACIONAL";
  if (road.startsWith("C-")) return "COMARCAL";
  if (road.match(/^[A-Z]{1,2}-\d/)) return "PROVINCIAL";
  return "OTHER";
}

function mapDirection(dir: string): Direction | undefined {
  switch (dir) {
    case "Increasing": return "ASCENDING";
    case "Decreasing": return "DESCENDING";
    case "BothDirections": return "BOTH";
    default: return undefined;
  }
}

function inferSpeedLimitType(speed: number, character: string): SpeedLimitType {
  if (character === "Enlace") return "GENERAL"; // ramp/junction
  if (speed <= 30) return "RESIDENTIAL";
  if (speed <= 50) return "URBAN";
  return "GENERAL";
}

function inferProvinceFromRoad(road: string): string | undefined {
  // Some road prefixes map to provinces
  const prefixMap: Record<string, string> = {
    "M": "28", "B": "08", "V": "46", "Z": "50",
    "SE": "41", "MA": "29", "MU": "30", "GR": "18",
    "BI": "48", "SS": "20", "GI": "17",
  };
  const match = road.match(/^([A-Z]{1,2})-/);
  return match ? prefixMap[match[1]] : undefined;
}

// ── Main ──

export async function run(prisma: PrismaClient) {
  const now = new Date();
  console.log(`${TAG} Starting at ${now.toISOString()}`);
  console.log(`${TAG} Source: ${TNITS_URL}`);

  // 1. FETCH
  const response = await fetch(TNITS_URL, {
    headers: {
      Accept: "application/xml",
      "User-Agent": "TraficoEspana/1.0 (speedlimit-collector)",
    },
    signal: AbortSignal.timeout(120000),
  });

  if (!response.ok) {
    throw new Error(`TN-ITS API error: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  console.log(`${TAG} Fetched ${(xml.length / 1024).toFixed(0)}KB`);

  // 2. PARSE
  const records = parseRecords(xml);
  const adds = records.filter(r => r.operation === "Add" || r.operation === "Modify");
  const removes = records.filter(r => r.operation === "Remove");
  console.log(`${TAG} Parsed ${records.length} records: ${adds.length} add/modify, ${removes.length} remove`);

  if (adds.length === 0 && removes.length === 0) {
    console.log(`${TAG} No records to process`);
    return;
  }

  // 3. CLEAR + INSERT (full refresh — the TN-ITS feed contains the complete current state)
  const deleted = await prisma.speedLimit.deleteMany({});
  console.log(`${TAG} Cleared ${deleted.count} existing speed limits`);

  // 4. BATCH INSERT add/modify records
  const BATCH_SIZE = 100;
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < adds.length; i += BATCH_SIZE) {
    const batch = adds.slice(i, i + BATCH_SIZE);

    const data = batch.map(r => {
      const province = inferProvinceFromRoad(r.road);
      return {
        roadNumber: r.road,
        roadType: classifyRoadType(r.road),
        kmStart: Math.min(r.kmStart, 99999.99),
        kmEnd: Math.min(r.kmEnd, 99999.99),
        startLat: r.lat,
        startLng: r.lng,
        endLat: r.lat, // TN-ITS provides single point per segment
        endLng: r.lng,
        speedLimit: r.speedLimit,
        speedLimitType: inferSpeedLimitType(r.speedLimit, r.roadCharacter),
        direction: mapDirection(r.direction),
        isConditional: false,
        province,
        provinceName: province ? PROVINCES[province] || null : null,
        sourceId: r.uuid,
        lastUpdated: now,
      };
    }).filter(d => {
      if (d.speedLimit <= 0 || d.speedLimit > 150) { skipped++; return false; }
      return true;
    });

    await prisma.speedLimit.createMany({ data, skipDuplicates: true });
    inserted += data.length;
  }

  console.log(`${TAG} Inserted ${inserted} speed limits (${skipped} skipped)`);

  // 5. SUMMARY
  const bySpeed = await prisma.speedLimit.groupBy({
    by: ["speedLimit"],
    _count: true,
    orderBy: { speedLimit: "asc" },
  });

  console.log(`${TAG} Speed limits by value:`);
  for (const s of bySpeed) {
    console.log(`  ${s.speedLimit} km/h: ${s._count} segments`);
  }

  const byRoad = await prisma.speedLimit.groupBy({
    by: ["roadType"],
    _count: true,
  });

  console.log(`${TAG} By road type:`);
  for (const r of byRoad) {
    console.log(`  ${r.roadType || "UNKNOWN"}: ${r._count}`);
  }

  const total = await prisma.speedLimit.count();
  console.log(`${TAG} Total: ${total} speed limits`);
  console.log(`${TAG} Collection completed successfully`);
}
