/**
 * Maritime Fuel Collector Task (Unified Dispatcher)
 *
 * Fetches maritime gas station data and fuel prices from MINETUR API,
 * upserts into MaritimeStation table, and saves daily price history.
 *
 * Data source:
 * https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/PostesMaritimos/
 *
 * Notes:
 * - priceGasoleoB is returned in bulk format (per 1000L); values > 10 are
 *   divided by 1000 to normalize to per-litre pricing.
 * - Station ID is IDPosteMaritimo when present, falling back to IDEESS.
 * - Coordinates use comma as decimal separator — normalized before parsing.
 * - The Puerto field contains the port name.
 */

import { PrismaClient } from "@prisma/client";
import { PROVINCES } from "../../shared/provinces.js";

const MINETUR_MARITIME_URL =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/PostesMaritimos/";

interface APIMaritimeStation {
  IDEESS: string;
  IDPosteMaritimo?: string;
  "Rótulo": string;
  Latitud: string;
  "Longitud (WGS84)": string;
  Puerto?: string;
  Localidad: string;
  Provincia: string;
  IDProvincia: string;
  Horario: string;
  "Precio Gasoleo A habitual"?: string;
  "Precio Gasoleo B"?: string;
  "Precio Gasolina 95 E5"?: string;
  "Precio Gasolina 98 E5"?: string;
}

interface APIResponse {
  Fecha: string;
  ListaEESSPrecio: APIMaritimeStation[];
}

function parsePrice(priceStr: string | undefined): number | null {
  if (!priceStr || priceStr.trim() === "") return null;
  const normalized = priceStr.replace(",", ".");
  const value = parseFloat(normalized);
  return isNaN(value) ? null : value;
}

/**
 * Parse bulk price (per 1000L) and convert to per-litre.
 * MINETUR returns Gasoleo B in bulk format (e.g. 626.000 = 626 €/1000L).
 * Normal retail prices are always < 5 €/L, so anything > 10 is bulk.
 */
function parseBulkPrice(priceStr: string | undefined): number | null {
  const price = parsePrice(priceStr);
  if (price === null) return null;
  if (price > 10) {
    return Math.round((price / 1000) * 1000) / 1000;
  }
  return price;
}

function parseCoordinate(coordStr: string): number {
  if (!coordStr) return NaN;
  return parseFloat(coordStr.replace(",", "."));
}

function is24Hours(schedule: string): boolean {
  if (!schedule) return false;
  return schedule.includes("24H") || schedule.includes("24h");
}

function parseAPIDate(dateStr: string): Date {
  const [datePart, timePart] = dateStr.split(" ");
  const [day, month, year] = datePart.split("/").map(Number);
  const [hour, minute, second] = timePart.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, second);
}

export async function run(prisma: PrismaClient) {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  console.log(`[maritime-fuel] Starting at ${now.toISOString()}`);

  // ── 1. Fetch from MINETUR API ──────────────────────────────────────────

  console.log(`[maritime-fuel] Fetching from MINETUR API...`);
  const response = await fetch(MINETUR_MARITIME_URL, {
    headers: {
      Accept: "application/json",
      "User-Agent": "TraficoLive/1.0 (maritime-fuel-collector)",
    },
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    throw new Error(`MINETUR API error: ${response.status} ${response.statusText}`);
  }

  const data: APIResponse = await response.json();
  const stations = data.ListaEESSPrecio;
  const priceUpdateTime = parseAPIDate(data.Fecha);

  console.log(
    `[maritime-fuel] Fetched ${stations.length} maritime stations (prices from ${data.Fecha})`
  );

  if (stations.length === 0) {
    console.log("[maritime-fuel] No stations found, exiting");
    return;
  }

  // ── 2. Parse and validate ──────────────────────────────────────────────

  const validStations = stations
    .map((station) => {
      const latitude = parseCoordinate(station.Latitud);
      const longitude = parseCoordinate(station["Longitud (WGS84)"]);

      if (isNaN(latitude) || isNaN(longitude)) return null;

      const stationId = station.IDPosteMaritimo || station.IDEESS;
      if (!stationId) return null;

      const provinceCode = station.IDProvincia
        ? station.IDProvincia.padStart(2, "0")
        : null;
      const provinceName =
        (provinceCode ? PROVINCES[provinceCode] : null) || station.Provincia;

      return {
        id: stationId,
        name: station["Rótulo"] || "Sin nombre",
        latitude,
        longitude,
        port: station.Puerto || null,
        locality: station.Localidad || null,
        province: provinceCode,
        provinceName,
        priceGasoleoA: parsePrice(station["Precio Gasoleo A habitual"]),
        priceGasoleoB: parseBulkPrice(station["Precio Gasoleo B"]),
        priceGasolina95E5: parsePrice(station["Precio Gasolina 95 E5"]),
        priceGasolina98E5: parsePrice(station["Precio Gasolina 98 E5"]),
        schedule: station.Horario || null,
        is24h: is24Hours(station.Horario),
        lastPriceUpdate: priceUpdateTime,
        lastUpdated: now,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  console.log(`[maritime-fuel] Processing ${validStations.length} valid stations...`);

  // ── 3. Upsert stations ─────────────────────────────────────────────────

  let processed = 0;
  let errors = 0;

  for (const station of validStations) {
    try {
      await prisma.maritimeStation.upsert({
        where: { id: station.id },
        create: {
          id: station.id,
          name: station.name,
          latitude: station.latitude,
          longitude: station.longitude,
          port: station.port,
          locality: station.locality,
          province: station.province,
          provinceName: station.provinceName,
          priceGasoleoA: station.priceGasoleoA,
          priceGasoleoB: station.priceGasoleoB,
          priceGasolina95E5: station.priceGasolina95E5,
          priceGasolina98E5: station.priceGasolina98E5,
          schedule: station.schedule,
          is24h: station.is24h,
          lastPriceUpdate: station.lastPriceUpdate,
          lastUpdated: station.lastUpdated,
        },
        update: {
          name: station.name,
          latitude: station.latitude,
          longitude: station.longitude,
          port: station.port,
          locality: station.locality,
          province: station.province,
          provinceName: station.provinceName,
          priceGasoleoA: station.priceGasoleoA,
          priceGasoleoB: station.priceGasoleoB,
          priceGasolina95E5: station.priceGasolina95E5,
          priceGasolina98E5: station.priceGasolina98E5,
          schedule: station.schedule,
          is24h: station.is24h,
          lastPriceUpdate: station.lastPriceUpdate,
          lastUpdated: station.lastUpdated,
        },
      });
      processed++;
    } catch (error) {
      errors++;
      console.error(`[maritime-fuel] Error upserting station ${station.id}:`, error);
    }
  }

  console.log(`[maritime-fuel] Upserted ${processed} stations (${errors} errors)`);

  // ── 4. Daily price history ─────────────────────────────────────────────

  console.log("[maritime-fuel] Saving daily price history...");

  const stationsWithPrices = validStations.filter(
    (s) => s.priceGasoleoA !== null || s.priceGasolina95E5 !== null
  );

  const historyResult = await prisma.maritimePriceHistory.createMany({
    data: stationsWithPrices.map((s) => ({
      stationId: s.id,
      recordedAt: today,
      priceGasoleoA: s.priceGasoleoA,
      priceGasolina95E5: s.priceGasolina95E5,
    })),
    skipDuplicates: true,
  });

  console.log(`[maritime-fuel] Created ${historyResult.count} new history records`);

  const elapsed = ((Date.now() - now.getTime()) / 1000).toFixed(1);
  console.log(
    `[maritime-fuel] Completed in ${elapsed}s — ${processed} stations updated, ${historyResult.count} history records`
  );
}
