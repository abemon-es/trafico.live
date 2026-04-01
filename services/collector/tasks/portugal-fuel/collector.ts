/**
 * Portugal Fuel Collector Task
 *
 * Fetches Portuguese gas station fuel prices from the DGEG public API
 * (Direção-Geral de Energia e Geologia). No authentication required.
 *
 * Strategy:
 *   1. Fetch all 18 Portuguese districts
 *   2. For each district, fetch stations for 4 key fuel types in parallel
 *   3. Merge results by station ID (same station appears once per fuel query)
 *   4. Upsert into PortugalGasStation
 *   5. Save daily price history
 *
 * Data source: https://precoscombustiveis.dgeg.gov.pt
 *
 * Rate limiting: 200ms delay between API calls (respectful to DGEG servers).
 */

import { PrismaClient } from "@prisma/client";
import { log, logError } from "../../shared/utils.js";

const TASK = "portugal-fuel";
const BASE_URL = "https://precoscombustiveis.dgeg.gov.pt/api/PrecoComb";
const FETCH_TIMEOUT_MS = 30_000;
const RATE_LIMIT_MS = 200;

// Fuel type IDs — all 9 types from DGEG
const FUEL_TYPES = [
  { id: "2101", field: "priceGasoleoSimples" as const,    label: "Gasóleo simples" },
  { id: "2102", field: "priceGasoleoEspecial" as const,   label: "Gasóleo especial" },
  { id: "2103", field: "priceGasoleoColorido" as const,   label: "Gasóleo colorido" },
  { id: "3201", field: "priceGasolina95" as const,        label: "Gasolina 95" },
  { id: "3202", field: "priceGasolina95Especial" as const, label: "Gasolina 95 especial" },
  { id: "3400", field: "priceGasolina98" as const,        label: "Gasolina 98" },
  { id: "3401", field: "priceGasolina98Especial" as const, label: "Gasolina 98 especial" },
  { id: "1120", field: "priceGPL" as const,               label: "GPL" },
  { id: "4100", field: "priceGNC" as const,               label: "GNC" },
] as const;

type FuelPriceField = typeof FUEL_TYPES[number]["field"];

// ─── API response shapes ───────────────────────────────────────────────────

interface ApiDistrictsResponse {
  status: boolean;
  resultado: Array<{
    Id: string;
    Nome: string;
  }>;
}

interface ApiStationResult {
  Id: string;
  Nome: string;
  TipoPosto?: string;
  Municipio?: string;
  IDMunicipio?: string;
  Preco?: string;
  Marca?: string;
  Combustivel?: string;
  DataAtualizacao?: string;
  Distrito?: string;
  IDDistrito?: string;
  Morada?: string;
  Localidade?: string;
  CodPostal?: string;
  Latitude?: string;
  Longitude?: string;
}

interface ApiStationsResponse {
  status: boolean;
  resultado: ApiStationResult[];
}

// ─── Merged station shape ──────────────────────────────────────────────────

interface MergedStation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string | null;
  locality: string | null;
  postalCode: string | null;
  district: string | null;
  districtId: string | null;
  municipality: string | null;
  municipalityId: string | null;
  brand: string | null;
  stationType: string | null;
  priceGasoleoSimples: number | null;
  priceGasoleoEspecial: number | null;
  priceGasoleoColorido: number | null;
  priceGasolina95: number | null;
  priceGasolina95Especial: number | null;
  priceGasolina98: number | null;
  priceGasolina98Especial: number | null;
  priceGPL: number | null;
  priceGNC: number | null;
  lastPriceUpdate: Date | null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function parsePrice(price: string | number | undefined | null): number | null {
  if (price == null) return null;
  if (typeof price === "number") return isNaN(price) ? null : price;
  const trimmed = String(price).trim();
  if (trimmed === "") return null;
  // Format: "1,819 €" — strip euro sign, trim, replace comma decimal separator
  const cleaned = trimmed.replace("€", "").trim().replace(",", ".");
  const value = parseFloat(cleaned);
  return isNaN(value) ? null : value;
}

function parseCoordinate(coord: string | number | undefined | null): number | null {
  if (coord == null) return null;
  if (typeof coord === "number") return isNaN(coord) ? null : coord;
  const trimmed = String(coord).trim();
  if (trimmed === "") return null;
  const value = parseFloat(trimmed);
  return isNaN(value) ? null : value;
}

/**
 * Parse DGEG date format: "27-03-2026" → Date
 */
function parseDGEGDate(dateStr: string | undefined): Date | null {
  if (!dateStr || dateStr.trim() === "") return null;
  const parts = dateStr.trim().split("-");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map(Number);
  if (!day || !month || !year) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJSON<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "TraficoLive/1.0 (portugal-fuel-collector)",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`DGEG API error: ${response.status} ${response.statusText} — ${url}`);
  }

  return response.json() as Promise<T>;
}

// ─── Main collector ────────────────────────────────────────────────────────

export async function run(prisma: PrismaClient) {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  log(TASK, `Starting at ${now.toISOString()}`);

  // ── 1. Fetch districts ─────────────────────────────────────────────────

  log(TASK, "Fetching Portuguese districts...");
  const districtsData = await fetchJSON<ApiDistrictsResponse>(
    `${BASE_URL}/GetDistritos?f=json`
  );

  if (!districtsData.status || !Array.isArray(districtsData.resultado)) {
    throw new Error("DGEG districts API returned unexpected response");
  }

  const districts = districtsData.resultado;
  log(TASK, `Found ${districts.length} districts`);

  // ── 2. Fetch stations per district+fuel, merge by station ID ───────────

  // Map: stationId → MergedStation
  const stationMap = new Map<string, MergedStation>();

  let apiCallCount = 0;

  for (const district of districts) {
    for (const fuelType of FUEL_TYPES) {
      if (apiCallCount > 0) {
        await sleep(RATE_LIMIT_MS);
      }
      apiCallCount++;

      const url =
        `${BASE_URL}/PesquisarPostos?qtd=99999` +
        `&idsTiposComb=${fuelType.id}` +
        `&idDistrito=${district.Id}` +
        `&f=json`;

      let data: ApiStationsResponse;
      try {
        data = await fetchJSON<ApiStationsResponse>(url);
      } catch (err) {
        logError(TASK, `Failed fetching ${district.Nome} / ${fuelType.label}`, err);
        continue;
      }

      if (!data.status || !Array.isArray(data.resultado)) {
        continue;
      }

      for (const result of data.resultado) {
        const stationId = result.Id != null ? String(result.Id) : "";
        if (!stationId) continue;

        const price = parsePrice(result.Preco);

        if (!stationMap.has(stationId)) {
          // First time we see this station — populate all base fields
          const lat = parseCoordinate(result.Latitude);
          const lon = parseCoordinate(result.Longitude);

          // Skip stations without valid coordinates
          if (lat === null || lon === null) continue;

          stationMap.set(stationId, {
            id: stationId,
            name: result.Nome || "Desconhecido",
            latitude: lat,
            longitude: lon,
            address: result.Morada || null,
            locality: result.Localidade || null,
            postalCode: result.CodPostal || null,
            district: result.Distrito || district.Nome || null,
            districtId: String(result.IDDistrito || district.Id || ""),
            municipality: result.Municipio || null,
            municipalityId: result.IDMunicipio != null ? String(result.IDMunicipio) : null,
            brand: result.Marca || null,
            stationType: result.TipoPosto || null,
            priceGasoleoSimples: null,
            priceGasoleoEspecial: null,
            priceGasoleoColorido: null,
            priceGasolina95: null,
            priceGasolina95Especial: null,
            priceGasolina98: null,
            priceGasolina98Especial: null,
            priceGPL: null,
            priceGNC: null,
            lastPriceUpdate: parseDGEGDate(result.DataAtualizacao),
          });
        }

        // Merge this fuel price into the existing station entry
        const station = stationMap.get(stationId)!;
        station[fuelType.field] = price;

        // Update lastPriceUpdate to most recent known date
        const priceDate = parseDGEGDate(result.DataAtualizacao);
        if (priceDate && (!station.lastPriceUpdate || priceDate > station.lastPriceUpdate)) {
          station.lastPriceUpdate = priceDate;
        }
      }
    }

    log(TASK, `District ${district.Nome} processed (${stationMap.size} stations so far)`);
  }

  const stations = Array.from(stationMap.values());
  const withPrices = stations.filter(
    (s) =>
      s.priceGasoleoSimples !== null ||
      s.priceGasoleoEspecial !== null ||
      s.priceGasoleoColorido !== null ||
      s.priceGasolina95 !== null ||
      s.priceGasolina95Especial !== null ||
      s.priceGasolina98 !== null ||
      s.priceGasolina98Especial !== null ||
      s.priceGPL !== null ||
      s.priceGNC !== null
  );

  log(TASK, `Portugal fuel: ${stations.length} stations, ${withPrices.length} with prices`);

  if (stations.length === 0) {
    log(TASK, "No stations found, exiting");
    return;
  }

  // ── 3. Upsert stations ─────────────────────────────────────────────────

  log(TASK, "Upserting stations into PortugalGasStation...");
  let upserted = 0;
  let errors = 0;

  for (const station of stations) {
    try {
      await prisma.portugalGasStation.upsert({
        where: { id: station.id },
        create: {
          id: station.id,
          name: station.name,
          latitude: station.latitude,
          longitude: station.longitude,
          address: station.address,
          locality: station.locality,
          postalCode: station.postalCode,
          district: station.district,
          districtId: station.districtId,
          municipality: station.municipality,
          municipalityId: station.municipalityId,
          brand: station.brand,
          stationType: station.stationType,
          priceGasoleoSimples: station.priceGasoleoSimples,
          priceGasoleoEspecial: station.priceGasoleoEspecial,
          priceGasoleoColorido: station.priceGasoleoColorido,
          priceGasolina95: station.priceGasolina95,
          priceGasolina95Especial: station.priceGasolina95Especial,
          priceGasolina98: station.priceGasolina98,
          priceGasolina98Especial: station.priceGasolina98Especial,
          priceGPL: station.priceGPL,
          priceGNC: station.priceGNC,
          is24h: false,
          lastPriceUpdate: station.lastPriceUpdate,
          lastUpdated: now,
        },
        update: {
          name: station.name,
          latitude: station.latitude,
          longitude: station.longitude,
          address: station.address,
          locality: station.locality,
          postalCode: station.postalCode,
          district: station.district,
          districtId: station.districtId,
          municipality: station.municipality,
          municipalityId: station.municipalityId,
          brand: station.brand,
          stationType: station.stationType,
          priceGasoleoSimples: station.priceGasoleoSimples,
          priceGasoleoEspecial: station.priceGasoleoEspecial,
          priceGasoleoColorido: station.priceGasoleoColorido,
          priceGasolina95: station.priceGasolina95,
          priceGasolina95Especial: station.priceGasolina95Especial,
          priceGasolina98: station.priceGasolina98,
          priceGasolina98Especial: station.priceGasolina98Especial,
          priceGPL: station.priceGPL,
          priceGNC: station.priceGNC,
          lastPriceUpdate: station.lastPriceUpdate,
          lastUpdated: now,
        },
      });
      upserted++;
    } catch (err) {
      errors++;
      logError(TASK, `Error upserting station ${station.id}`, err);
    }
  }

  log(TASK, `Upserted ${upserted} stations (${errors} errors)`);

  // ── 4. Daily price history ─────────────────────────────────────────────

  log(TASK, "Saving daily price history...");

  const historyResult = await prisma.portugalGasStationPriceHistory.createMany({
    data: withPrices.map((s) => ({
      stationId: s.id,
      recordedAt: today,
      priceGasoleoSimples: s.priceGasoleoSimples,
      priceGasoleoEspecial: s.priceGasoleoEspecial,
      priceGasoleoColorido: s.priceGasoleoColorido,
      priceGasolina95: s.priceGasolina95,
      priceGasolina95Especial: s.priceGasolina95Especial,
      priceGasolina98: s.priceGasolina98,
      priceGasolina98Especial: s.priceGasolina98Especial,
      priceGPL: s.priceGPL,
      priceGNC: s.priceGNC,
    })),
    skipDuplicates: true,
  });

  log(TASK, `Created ${historyResult.count} new history records`);

  const elapsed = ((Date.now() - now.getTime()) / 1000).toFixed(1);
  log(
    TASK,
    `Completed in ${elapsed}s — ${upserted} stations upserted, ${historyResult.count} history records`
  );
}
