/**
 * Camera Collector Service
 *
 * Fetches traffic cameras from DGT NAP DevicePublication API
 * and stores them in PostgreSQL for fast API access.
 *
 * Run daily via Railway cron to keep camera data fresh.
 */

import { PrismaClient } from "@prisma/client";
import { PROVINCES, PROVINCE_NAME_TO_CODE, normalizeProvince } from "../../shared/provinces.js";
import { ensureArray } from "../../shared/utils.js";
import { createXMLParser } from "../../shared/xml.js";

const DGT_CAMERAS_URL =
  "https://nap.dgt.es/datex2/v3/dgt/DevicePublication/camaras_datex2_v36.xml";

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
const parser = createXMLParser({
  isArray: (name) => ["device"].includes(name),
});

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

export async function run(prisma: PrismaClient) {
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

    // Chunked parallel upserts (50x parallelism per chunk)
    const CHUNK = 50;
    for (let i = 0; i < cameras.length; i += CHUNK) {
      const chunk = cameras.slice(i, i + CHUNK);
      await Promise.all(chunk.map(camera => {
        fetchedIds.add(camera.id);

        const provinceCode = normalizeProvince(camera.province);

        if (existingIds.has(camera.id)) {
          updated++;
        } else {
          created++;
        }

        return prisma.camera.upsert({
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
      }));
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
    throw error;
  }
}
