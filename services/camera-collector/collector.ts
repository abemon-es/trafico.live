/**
 * Camera Collector Service
 *
 * Fetches traffic cameras from DGT NAP DevicePublication API
 * and stores them in PostgreSQL for fast API access.
 *
 * Run daily via Railway cron to keep camera data fresh.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { XMLParser } from "fast-xml-parser";

const DGT_CAMERAS_URL =
  "https://nap.dgt.es/datex2/v3/dgt/DevicePublication/camaras_datex2_v36.xml";

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
  // Also add simplified versions
  PROVINCE_NAME_TO_CODE[name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")] = code;
}

interface CameraData {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  road: string;
  direction: string;
  kmPoint: number | null;
  province: string;
  imageUrl: string;
}

// XML Parser
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  isArray: (name) => ["device"].includes(name),
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
  const normalized = province.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return PROVINCE_NAME_TO_CODE[normalized] || null;
}

function parseCameras(xml: string): CameraData[] {
  const cameras: CameraData[] = [];

  try {
    const result = parser.parse(xml);
    const publication = result?.payload;

    if (!publication) {
      console.warn("[camera-collector] No payload found in response");
      return [];
    }

    const devices = ensureArray(publication.device) as Record<string, unknown>[];

    for (const device of devices) {
      // Only process camera devices
      const deviceType = device.typeOfDevice;
      if (deviceType !== "camera") continue;

      const camera = parseDevice(device);
      if (camera) {
        cameras.push(camera);
      }
    }
  } catch (error) {
    console.error("[camera-collector] Error parsing XML:", error);
  }

  return cameras;
}

function parseDevice(device: Record<string, unknown>): CameraData | null {
  try {
    const id = String(device["@_id"] || "");
    const imageUrl = String(device.deviceUrl || "");

    if (!id || !imageUrl) return null;

    // Extract location data
    const pointLocation = device.pointLocation as Record<string, unknown> | undefined;
    if (!pointLocation) return null;

    // Get coordinates from TPEG point location
    const tpegPointLocation = pointLocation.tpegPointLocation as Record<string, unknown> | undefined;
    const point = tpegPointLocation?.point as Record<string, unknown> | undefined;
    const pointCoordinates = point?.pointCoordinates as Record<string, unknown> | undefined;

    const latitude = parseFloat(String(pointCoordinates?.latitude || 0));
    const longitude = parseFloat(String(pointCoordinates?.longitude || 0));

    if (!latitude || !longitude) return null;

    // Get road info from supplementary description
    const supplementary = pointLocation.supplementaryPositionalDescription as Record<string, unknown> | undefined;
    const roadInfo = supplementary?.roadInformation as Record<string, unknown> | undefined;

    const road = String(roadInfo?.roadName || "");
    const direction = String(roadInfo?.roadDestination || "");

    // Get km point and province from TPEG extension
    const extension = point?._tpegNonJunctionPointExtension as Record<string, unknown> | undefined;
    const extendedPoint = extension?.extendedTpegNonJunctionPoint as Record<string, unknown> | undefined;

    const kmPoint = extendedPoint?.kilometerPoint
      ? parseFloat(String(extendedPoint.kilometerPoint))
      : null;
    const province = String(extendedPoint?.province || "");

    // Build camera name: "A-62 km 25.3 → BURGOS"
    const kmStr = kmPoint !== null ? ` km ${kmPoint}` : "";
    const dirStr = direction ? ` → ${direction}` : "";
    const name = `${road}${kmStr}${dirStr}`;

    return {
      id,
      name: name || `Cámara ${id}`,
      latitude,
      longitude,
      road,
      direction,
      kmPoint,
      province,
      imageUrl,
    };
  } catch (error) {
    console.error("[camera-collector] Error parsing device:", error);
    return null;
  }
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

  console.log(`[camera-collector] Starting at ${now.toISOString()}`);

  try {
    // 1. FETCH from DGT API
    console.log(`[camera-collector] Fetching from ${DGT_CAMERAS_URL}`);
    const response = await fetch(DGT_CAMERAS_URL, {
      headers: {
        Accept: "application/xml",
        "User-Agent": "TraficoEspana/1.0 (camera-collector)"
      },
      signal: AbortSignal.timeout(60000)
    });

    if (!response.ok) {
      throw new Error(`DGT Camera API error: ${response.status} ${response.statusText}`);
    }

    const xml = await response.text();
    const cameras = parseCameras(xml);

    console.log(`[camera-collector] Fetched ${cameras.length} cameras from API`);

    if (cameras.length === 0) {
      console.log("[camera-collector] No cameras found, exiting");
      return;
    }

    // 2. Get existing camera IDs
    const existingCameras = await prisma.camera.findMany({
      select: { id: true }
    });
    const existingIds = new Set(existingCameras.map(c => c.id));

    // 3. Prepare upsert operations
    const fetchedIds = new Set<string>();
    let created = 0;
    let updated = 0;

    for (const camera of cameras) {
      fetchedIds.add(camera.id);

      const provinceCode = normalizeProvince(camera.province);

      await prisma.camera.upsert({
        where: { id: camera.id },
        create: {
          id: camera.id,
          name: camera.name,
          latitude: camera.latitude,
          longitude: camera.longitude,
          roadNumber: camera.road || null,
          kmPoint: camera.kmPoint,
          province: provinceCode,
          provinceName: provinceCode ? PROVINCES[provinceCode] || null : null,
          feedUrl: camera.imageUrl,
          thumbnailUrl: camera.imageUrl,
          isActive: true,
          lastUpdated: now
        },
        update: {
          name: camera.name,
          latitude: camera.latitude,
          longitude: camera.longitude,
          roadNumber: camera.road || null,
          kmPoint: camera.kmPoint,
          province: provinceCode,
          provinceName: provinceCode ? PROVINCES[provinceCode] || null : null,
          feedUrl: camera.imageUrl,
          thumbnailUrl: camera.imageUrl,
          isActive: true,
          lastUpdated: now
        }
      });

      if (existingIds.has(camera.id)) {
        updated++;
      } else {
        created++;
      }
    }

    console.log(`[camera-collector] Created: ${created}, Updated: ${updated}`);

    // 4. Mark cameras not in API response as inactive
    const missingIds = [...existingIds].filter(id => !fetchedIds.has(id));
    if (missingIds.length > 0) {
      await prisma.camera.updateMany({
        where: { id: { in: missingIds } },
        data: { isActive: false }
      });
      console.log(`[camera-collector] Marked ${missingIds.length} cameras as inactive`);
    }

    // 5. Summary statistics
    const stats = await prisma.camera.groupBy({
      by: ["province"],
      where: { isActive: true },
      _count: true
    });

    console.log(`[camera-collector] Cameras by province:`);
    for (const stat of stats.slice(0, 10)) {
      const provinceName = stat.province ? PROVINCES[stat.province] || stat.province : "Unknown";
      console.log(`  ${provinceName}: ${stat._count}`);
    }
    if (stats.length > 10) {
      console.log(`  ... and ${stats.length - 10} more provinces`);
    }

    const totalActive = stats.reduce((sum, s) => sum + s._count, 0);
    console.log(`[camera-collector] Total active cameras: ${totalActive}`);

    console.log("[camera-collector] Collection completed successfully");

  } catch (error) {
    console.error("[camera-collector] Fatal error:", error);
    process.exit(1);
  }
}

main();
