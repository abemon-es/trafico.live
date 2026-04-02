/**
 * Renfe LD Real-Time Fleet Positions Collector
 *
 * Polls the unofficial Renfe LD real-time GPS endpoint every 2 minutes.
 * Stores current GPS position, speed, delay, and route info per train.
 * Maintains a rolling 48-hour window — older positions are pruned each run.
 *
 * Source:  https://tiempo-real.largorecorrido.renfe.com/renfe-visor/flotaLD.json
 * Auth:    None required
 * License: Unofficial / undocumented — handle failures gracefully
 *
 * Attribution: "Origen de los datos: Renfe Operadora"
 */

import { PrismaClient, RailwayServiceType } from "@prisma/client";
import { log, logError } from "../../shared/utils.js";

const TASK = "renfe-ld-realtime";

const FLOTA_URL = "https://tiempo-real.largorecorrido.renfe.com/renfe-visor/flotaLD.json";

/** Rolling window: positions older than this are pruned each run */
const RETENTION_HOURS = 48;

/**
 * Maps tipoServicio (numeric product code) → brand label.
 * Matches the mapping used in renfe-alerts collector.
 */
const PRODUCT_BRANDS: Record<number, string> = {
  1: "AVE", 2: "AVE", 3: "Avant", 4: "Alvia", 5: "Alvia",
  6: "Altaria", 7: "Euromed", 8: "Trenhotel", 10: "Talgo",
  11: "Alvia", 12: "AV City", 13: "Intercity", 16: "MD",
  17: "Regional", 18: "REG.EXP", 19: "Intercity",
};

/**
 * Maps a brand label → Prisma RailwayServiceType enum value.
 */
function brandToServiceType(brand: string): RailwayServiceType | null {
  switch (brand) {
    case "AVE":        return "AVE";
    case "Alvia":      return "ALVIA";
    case "Avant":      return "AVANT";
    case "Euromed":    return "EUROMED";
    case "MD":         return "MEDIA_DISTANCIA";
    case "Regional":
    case "REG.EXP":    return "REGIONAL";
    // Altaria, Trenhotel, Talgo, AV City, Intercity → long-distance generic
    default:           return "LARGA_DISTANCIA";
  }
}

/**
 * Raw train object as returned by the Renfe LD real-time API.
 * Fields are camelCase as observed in the JSON payload.
 */
interface RawTrain {
  codTren?: string | number;
  lat?: number | string;
  lng?: number | string;
  latitud?: number | string;
  longitud?: number | string;
  ultRetraso?: number | string;
  estacionAnterior?: string;
  estacionSiguiente?: string;
  horaLlegadaSiguiente?: string;
  velocidad?: number | string;
  tipoServicio?: number | string;
  serie?: string;
  origen?: string;
  destino?: string;
}

interface FlotaResponse {
  trenes?: RawTrain[];
}

/**
 * Safely parse a numeric latitude or longitude value.
 * Returns null if the value is missing, zero, or non-numeric.
 */
function parseCoord(value: number | string | undefined): number | null {
  if (value === undefined || value === null) return null;
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(n) || n === 0) return null;
  return n;
}

/**
 * Safely parse an integer field (delay, speed, service type, etc.).
 */
function parseIntField(value: number | string | undefined): number | null {
  if (value === undefined || value === null) return null;
  const n = typeof value === "string" ? parseInt(value, 10) : Math.round(value);
  return isNaN(n) ? null : n;
}

export async function run(prisma: PrismaClient): Promise<void> {
  log(TASK, "Starting Renfe LD real-time fleet collection");

  // ── 1. Fetch fleet JSON ───────────────────────────────────────────────────
  let rawTrains: RawTrain[] = [];

  try {
    const url = `${FLOTA_URL}?v=${Date.now()}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "trafico.live-collector/1.0" },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      logError(TASK, `Fleet API returned HTTP ${response.status} — skipping run`);
      return;
    }

    const json = await response.json() as FlotaResponse | RawTrain[];

    // The API may return either { trenes: [...] } or a bare array
    if (Array.isArray(json)) {
      rawTrains = json;
    } else if (json && typeof json === "object" && Array.isArray((json as FlotaResponse).trenes)) {
      rawTrains = (json as FlotaResponse).trenes!;
    } else {
      log(TASK, "Unexpected response shape — no trains array found, skipping run");
      return;
    }
  } catch (error) {
    logError(TASK, "Failed to fetch fleet data (non-fatal):", error);
    return;
  }

  log(TASK, `Fetched ${rawTrains.length} raw train entries from fleet API`);

  // ── 2. Filter trains with valid coordinates ───────────────────────────────
  const fetchedAt = new Date();
  let stored = 0;
  let skipped = 0;

  for (const raw of rawTrains) {
    // Support both lat/lng and latitud/longitud field names
    const lat = parseCoord(raw.lat ?? raw.latitud);
    const lng = parseCoord(raw.lng ?? raw.longitud);

    if (lat === null || lng === null) {
      skipped++;
      continue;
    }

    const trainNumber = raw.codTren != null ? String(raw.codTren).trim() : null;
    if (!trainNumber) {
      skipped++;
      continue;
    }

    const tipoServicio = parseIntField(raw.tipoServicio);
    const brand = tipoServicio !== null ? (PRODUCT_BRANDS[tipoServicio] ?? null) : null;
    const serviceType = brand ? brandToServiceType(brand) : null;

    const delay = parseIntField(raw.ultRetraso);
    const speed = parseIntField(raw.velocidad);

    // Parse ETA for next station — format typically "HH:MM" or ISO string
    let nextStationEta: Date | null = null;
    if (raw.horaLlegadaSiguiente) {
      const etaStr = raw.horaLlegadaSiguiente.trim();
      // Handle "HH:MM" format by prepending today's date
      if (/^\d{1,2}:\d{2}$/.test(etaStr)) {
        const [hh, mm] = etaStr.split(":").map(Number);
        const eta = new Date(fetchedAt);
        eta.setHours(hh, mm, 0, 0);
        // If the computed time is in the past by more than 30 min, assume next day
        if (fetchedAt.getTime() - eta.getTime() > 30 * 60 * 1000) {
          eta.setDate(eta.getDate() + 1);
        }
        nextStationEta = eta;
      } else {
        const parsed = new Date(etaStr);
        if (!isNaN(parsed.getTime())) nextStationEta = parsed;
      }
    }

    try {
      // @@unique([trainNumber, fetchedAt]) — round to nearest minute for dedup
      // within the same collection cycle
      const roundedFetchedAt = new Date(fetchedAt);
      roundedFetchedAt.setSeconds(0, 0);

      await prisma.renfeFleetPosition.upsert({
        where: {
          trainNumber_fetchedAt: {
            trainNumber,
            fetchedAt: roundedFetchedAt,
          },
        },
        create: {
          trainNumber,
          serviceType,
          brand,
          latitude: lat,
          longitude: lng,
          speed,
          delay,
          originStation: raw.origen?.trim() || null,
          destStation: raw.destino?.trim() || null,
          prevStation: raw.estacionAnterior?.trim() || null,
          nextStation: raw.estacionSiguiente?.trim() || null,
          nextStationEta,
          rollingStock: raw.serie?.trim() || null,
          fetchedAt: roundedFetchedAt,
        },
        update: {
          // Update position and delay data on re-fetch within the same minute
          serviceType,
          brand,
          latitude: lat,
          longitude: lng,
          speed,
          delay,
          originStation: raw.origen?.trim() || null,
          destStation: raw.destino?.trim() || null,
          prevStation: raw.estacionAnterior?.trim() || null,
          nextStation: raw.estacionSiguiente?.trim() || null,
          nextStationEta,
          rollingStock: raw.serie?.trim() || null,
        },
      });
      stored++;
    } catch (error) {
      logError(TASK, `Error upserting train ${trainNumber}:`, error);
      skipped++;
    }
  }

  log(TASK, `Positions stored: ${stored}, skipped (no coords/error): ${skipped}`);

  // ── 3. Rolling window cleanup — prune positions older than 48 hours ───────
  try {
    const cutoff = new Date(Date.now() - RETENTION_HOURS * 60 * 60 * 1000);
    const pruned = await prisma.renfeFleetPosition.deleteMany({
      where: { fetchedAt: { lt: cutoff } },
    });
    if (pruned.count > 0) {
      log(TASK, `Pruned ${pruned.count} positions older than ${RETENTION_HOURS}h`);
    }
  } catch (error) {
    logError(TASK, "Cleanup failed (non-fatal):", error);
  }

  // ── 4. Summary stats ──────────────────────────────────────────────────────
  try {
    const totalActive = await prisma.renfeFleetPosition.count({
      where: { fetchedAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } },
    });
    log(TASK, `Active fleet positions (last 5min): ${totalActive}`);
  } catch {
    // Non-fatal — stats are informational only
  }
}
