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

import { PrismaClient } from "@prisma/client";
import { log, logError } from "../../shared/utils.js";
import { createXMLParser } from "../../shared/xml.js";

const TASK = "intensity";
const MADRID_URL = "https://informo.madrid.es/informo/tmadrid/pm.xml";

// UTM Zone 30N → WGS84 (simplified for Madrid area)
const a = 6378137.0;
const f = 1 / 298.257223563;
const k0 = 0.9996;
const e = Math.sqrt(2 * f - f * f);
const e2 = e * e;
const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
const lon0 = (-3 * Math.PI) / 180;

function utmToWgs84(easting: number, northing: number): { lat: number; lon: number } {
  const x = easting - 500000;
  const y = northing;
  const M = y / k0;
  const mu = M / (a * (1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 * e2 * e2) / 256));
  const phi1 =
    mu +
    ((3 * e1) / 2 - (27 * e1 * e1 * e1) / 32) * Math.sin(2 * mu) +
    ((21 * e1 * e1) / 16 - (55 * e1 * e1 * e1 * e1) / 32) * Math.sin(4 * mu) +
    ((151 * e1 * e1 * e1) / 96) * Math.sin(6 * mu);
  const sp = Math.sin(phi1),
    cp = Math.cos(phi1),
    tp = sp / cp;
  const N1 = a / Math.sqrt(1 - e2 * sp * sp);
  const T1 = tp * tp;
  const C1 = (e2 / (1 - e2)) * cp * cp;
  const R1 = (a * (1 - e2)) / Math.pow(1 - e2 * sp * sp, 1.5);
  const D = x / (N1 * k0);
  const lat =
    phi1 -
    ((N1 * tp) / R1) *
      ((D * D) / 2 -
        ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * (e2 / (1 - e2))) * D ** 4) / 24 +
        ((61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * (e2 / (1 - e2)) - 3 * C1 * C1) * D ** 6) / 720);
  const lon =
    lon0 +
    (D - ((1 + 2 * T1 + C1) * D ** 3) / 6 +
      ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * (e2 / (1 - e2)) + 24 * T1 * T1) * D ** 5) / 120) /
      cp;
  return {
    lat: Math.round((lat * 180) / Math.PI * 1e6) / 1e6,
    lon: Math.round((lon * 180) / Math.PI * 1e6) / 1e6,
  };
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
  const dayOfWeek = now.getDay(); // 0=Sunday
  const hour = now.getHours();

  for (const r of readings) {
    if (r.error || r.intensity <= 0) continue;

    try {
      const existing = await prisma.hourlyTrafficProfile.findUnique({
        where: {
          sensorId_source_dayOfWeek_hour: {
            sensorId: r.sensorId,
            source: "MADRID",
            dayOfWeek,
            hour,
          },
        },
      });

      if (existing) {
        // Running average
        const n = existing.sampleCount;
        const newAvgInt = Math.round((existing.avgIntensity * n + r.intensity) / (n + 1));
        const newAvgOcc =
          existing.avgOccupancy != null && r.occupancy != null
            ? Math.round((existing.avgOccupancy * n + r.occupancy) / (n + 1))
            : existing.avgOccupancy;
        const newAvgSL =
          existing.avgServiceLevel != null
            ? Math.round(((Number(existing.avgServiceLevel) * n + r.serviceLevel) / (n + 1)) * 100) / 100
            : r.serviceLevel;

        await prisma.hourlyTrafficProfile.update({
          where: { id: existing.id },
          data: {
            avgIntensity: newAvgInt,
            avgOccupancy: newAvgOcc,
            avgServiceLevel: newAvgSL,
            sampleCount: n + 1,
            updatedAt: now,
          },
        });
      } else {
        await prisma.hourlyTrafficProfile.create({
          data: {
            sensorId: r.sensorId,
            source: "MADRID",
            dayOfWeek,
            hour,
            avgIntensity: r.intensity,
            avgOccupancy: r.occupancy,
            avgServiceLevel: r.serviceLevel,
            sampleCount: 1,
          },
        });
      }
    } catch {
      // Skip individual sensor errors
    }
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

    // Cleanup: remove raw readings older than 48h
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const deleted = await prisma.trafficIntensity.deleteMany({
      where: { recordedAt: { lt: cutoff } },
    });
    if (deleted.count > 0) {
      log(TASK, `Cleaned up ${deleted.count} old readings`);
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
