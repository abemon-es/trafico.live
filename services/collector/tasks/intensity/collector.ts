/**
 * Real-Time Traffic Intensity Collector
 *
 * Fetches live traffic sensor data from Madrid's open data platform.
 * 6,117 measurement points updated every 5 minutes.
 *
 * Source: https://informo.madrid.es/informo/tmadrid/pm.xml
 * Fields: intensity (veh/h), occupancy (%), load (%), service level (0-3),
 *         saturation capacity, coordinates (UTM Zone 30N)
 *
 * Also builds hourly traffic profiles by aggregating snapshots over time.
 */

import { PrismaClient, Prisma } from "@prisma/client";
import { log, logError } from "../../shared/utils.js";
import { createXMLParser } from "../../shared/xml.js";
import { utmToWgs84 as utmToWgs84Raw } from "../imd/utm-converter.js";

const TASK = "intensity";
const MADRID_URL = "https://informo.madrid.es/informo/tmadrid/pm.xml";

function utmToWgs84(easting: number, northing: number): { lat: number; lon: number } {
  const { latitude, longitude } = utmToWgs84Raw(easting, northing);
  return { lat: latitude, lon: longitude };
}

interface SensorReading {
  sensorId: number;
  description: string | null;
  intensity: number;
  occupancy: number | null;
  load: number | null;
  serviceLevel: number;
  saturation: number | null;
  latitude: number;
  longitude: number;
  error: boolean;
}

const parser = createXMLParser({
  isArray: (name) => name === "pm",
});

async function fetchMadridData(): Promise<SensorReading[]> {
  log(TASK, "Fetching Madrid traffic intensity data...");
  const response = await fetch(MADRID_URL, {
    headers: { "User-Agent": "trafico.live-collector/1.0" },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) throw new Error(`Madrid feed error: ${response.status}`);

  const xml = await response.text();
  const parsed = parser.parse(xml);
  const pms = parsed?.pms?.pm || [];

  const readings: SensorReading[] = [];

  for (const pm of pms) {
    const sensorId = parseInt(pm.idelem);
    if (!sensorId) continue;

    const intensity = parseInt(pm.intensidad) || 0;
    const serviceLevel = parseInt(pm.nivelServicio) ?? 0;
    const isError = pm.error === "S";

    // Parse UTM coordinates (Madrid uses comma as decimal separator)
    const rawX = String(pm.st_x || "").replace(",", ".");
    const rawY = String(pm.st_y || "").replace(",", ".");
    const utmX = parseFloat(rawX);
    const utmY = parseFloat(rawY);

    if (!utmX || !utmY || utmX < 400000 || utmX > 500000) continue;

    const { lat, lon } = utmToWgs84(utmX, utmY);
    if (lat < 40 || lat > 41 || lon < -4.5 || lon > -3) continue; // Madrid bounds

    readings.push({
      sensorId,
      description: pm.descripcion || null,
      intensity,
      occupancy: pm.ocupacion != null ? parseInt(pm.ocupacion) : null,
      load: pm.carga != null ? parseInt(pm.carga) : null,
      serviceLevel: Math.min(serviceLevel, 3),
      saturation: pm.intensidadSat ? parseInt(pm.intensidadSat) : null,
      latitude: lat,
      longitude: lon,
      error: isError,
    });
  }

  log(TASK, `Parsed ${readings.length} sensor readings from ${pms.length} PMs`);
  return readings;
}

async function upsertReadings(prisma: PrismaClient, readings: SensorReading[]): Promise<number> {
  const now = new Date();
  // Round to nearest 5 minutes for dedup
  now.setMinutes(Math.floor(now.getMinutes() / 5) * 5, 0, 0);

  let count = 0;
  const batchSize = 100;

  for (let i = 0; i < readings.length; i += batchSize) {
    const batch = readings.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((r) =>
        prisma.trafficIntensity.upsert({
          where: {
            sensorId_source_recordedAt: {
              sensorId: r.sensorId,
              source: "MADRID",
              recordedAt: now,
            },
          },
          update: {
            intensity: r.intensity,
            occupancy: r.occupancy,
            load: r.load,
            serviceLevel: r.serviceLevel,
            saturation: r.saturation,
            error: r.error,
          },
          create: {
            sensorId: r.sensorId,
            description: r.description,
            intensity: r.intensity,
            occupancy: r.occupancy,
            load: r.load,
            serviceLevel: r.serviceLevel,
            saturation: r.saturation,
            latitude: r.latitude,
            longitude: r.longitude,
            source: "MADRID",
            recordedAt: now,
            error: r.error,
          },
        })
      )
    );
    count += results.filter((r) => r.status === "fulfilled").length;
  }

  return count;
}

async function updateHourlyProfiles(prisma: PrismaClient, readings: SensorReading[]): Promise<void> {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const hour = now.getHours();

  const valid = readings.filter((r) => !r.error && r.intensity > 0);
  if (valid.length === 0) return;

  // Batch upsert: single SQL statement instead of 12,000+ sequential round-trips.
  // All sensor values are passed as $N parameters — no string interpolation of user data.
  const batchSize = 500;
  for (let i = 0; i < valid.length; i += batchSize) {
    const batch = valid.slice(i, i + batchSize);

    // Each row uses 6 parameters: sensorId, dayOfWeek, hour, intensity, occupancy, serviceLevel
    const values = batch
      .map((_, idx) => {
        const b = idx * 6;
        return `(gen_random_uuid()::text, $${b + 1}, 'MADRID', $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6}, 1, NOW())`;
      })
      .join(",\n");

    const params: (number | null)[] = batch.flatMap((r) => [
      r.sensorId,
      dayOfWeek,
      hour,
      r.intensity,
      r.occupancy ?? null,
      r.serviceLevel,
    ]);

    await prisma.$executeRawUnsafe(
      `INSERT INTO "HourlyTrafficProfile"
        ("id", "sensorId", "source", "dayOfWeek", "hour", "avgIntensity", "avgOccupancy", "avgServiceLevel", "sampleCount", "updatedAt")
      VALUES ${values}
      ON CONFLICT ("sensorId", "source", "dayOfWeek", "hour") DO UPDATE SET
        "avgIntensity" = ROUND(
          ("HourlyTrafficProfile"."avgIntensity" * "HourlyTrafficProfile"."sampleCount" + EXCLUDED."avgIntensity")::numeric
          / ("HourlyTrafficProfile"."sampleCount" + 1)
        ),
        "avgOccupancy" = CASE
          WHEN EXCLUDED."avgOccupancy" IS NOT NULL THEN ROUND(
            ("HourlyTrafficProfile"."avgOccupancy" * "HourlyTrafficProfile"."sampleCount" + EXCLUDED."avgOccupancy")::numeric
            / ("HourlyTrafficProfile"."sampleCount" + 1)
          )
          ELSE "HourlyTrafficProfile"."avgOccupancy"
        END,
        "avgServiceLevel" = ROUND(
          ("HourlyTrafficProfile"."avgServiceLevel" * "HourlyTrafficProfile"."sampleCount" + EXCLUDED."avgServiceLevel")
          / ("HourlyTrafficProfile"."sampleCount" + 1), 2
        ),
        "sampleCount" = "HourlyTrafficProfile"."sampleCount" + 1,
        "updatedAt" = NOW()`,
      ...params
    );
  }
}

export async function run(prisma: PrismaClient): Promise<void> {
  log(TASK, "Starting traffic intensity collection");

  try {
    const readings = await fetchMadridData();

    if (readings.length === 0) {
      logError(TASK, "No readings received");
      return;
    }

    // Store raw snapshot
    const upserted = await upsertReadings(prisma, readings);
    log(TASK, `Upserted ${upserted} intensity readings`);

    // Update hourly profiles (running averages)
    await updateHourlyProfiles(prisma, readings);
    log(TASK, "Updated hourly traffic profiles");

    // Cleanup: batch-delete old readings (max 10k per run to avoid long locks)
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const deleted = await prisma.$executeRaw`
      DELETE FROM "TrafficIntensity"
      WHERE id IN (
        SELECT id FROM "TrafficIntensity"
        WHERE "recordedAt" < ${cutoff}
        LIMIT 10000
      )
    `;
    if (deleted > 0) {
      log(TASK, `Cleaned up ${deleted} old readings`);
    }

    // Stats
    const avgIntensity = Math.round(
      readings.reduce((s, r) => s + r.intensity, 0) / readings.length
    );
    const congested = readings.filter((r) => r.serviceLevel >= 2).length;
    log(TASK, `Avg intensity: ${avgIntensity} veh/h, congested sensors: ${congested}/${readings.length}`);
  } catch (error) {
    logError(TASK, "Failed:", error);
    throw error;
  }
}
