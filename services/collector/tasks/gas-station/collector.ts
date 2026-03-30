/**
 * Gas Station Collector Task (Unified Dispatcher)
 *
 * Fetches terrestrial gas station data and fuel prices from MINETUR API,
 * upserts into GasStation table, saves daily price history, and runs
 * the fuel price aggregator.
 *
 * Data source:
 * https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/
 */

import { PrismaClient } from "@prisma/client";
import { PROVINCES } from "../../shared/provinces.js";

const MINETUR_API_URL =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/";

// Provincias con fiscalidad especial (excluir de "national" aggregation)
const TAX_FREE_PROVINCES = ["35", "38", "51", "52"];

interface APIStation {
  IDEESS: string;
  Rótulo: string;
  Latitud: string;
  "Longitud (WGS84)": string;
  Dirección: string;
  "C.P.": string;
  Localidad: string;
  Municipio: string;
  Provincia: string;
  IDProvincia: string;
  IDMunicipio: string;
  IDCCAA: string;
  Horario: string;
  Margen: string;
  "Tipo Venta": string;
  Remisión: string;
  "Precio Gasoleo A": string;
  "Precio Gasoleo B": string;
  "Precio Gasoleo Premium": string;
  "Precio Gasolina 95 E5": string;
  "Precio Gasolina 95 E10": string;
  "Precio Gasolina 98 E5": string;
  "Precio Gasolina 98 E10": string;
  "Precio Gases licuados del petróleo": string;
  "Precio Gas Natural Comprimido": string;
  "Precio Gas Natural Licuado": string;
  "Precio Hidrogeno": string;
}

interface APIResponse {
  Fecha: string;
  ListaEESSPrecio: APIStation[];
}

function parsePrice(priceStr: string): number | null {
  if (!priceStr || priceStr.trim() === "") return null;
  const normalized = priceStr.replace(",", ".");
  const value = parseFloat(normalized);
  return isNaN(value) ? null : value;
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

  console.log(`[gas-station] Starting at ${now.toISOString()}`);

  // ── 1. Fetch from MINETUR API ──────────────────────────────────────────

  console.log(`[gas-station] Fetching from MINETUR API...`);
  const response = await fetch(MINETUR_API_URL, {
    headers: {
      Accept: "application/json",
      "User-Agent": "TraficoLive/1.0 (gas-station-collector)",
    },
    signal: AbortSignal.timeout(180000),
  });

  if (!response.ok) {
    throw new Error(`MINETUR API error: ${response.status} ${response.statusText}`);
  }

  const data: APIResponse = await response.json();
  const stations = data.ListaEESSPrecio;
  const priceUpdateTime = parseAPIDate(data.Fecha);

  console.log(`[gas-station] Fetched ${stations.length} stations (prices from ${data.Fecha})`);

  if (stations.length === 0) {
    console.log("[gas-station] No stations found, exiting");
    return;
  }

  // ── 2. Parse and validate ──────────────────────────────────────────────

  const validStations = stations
    .map((station) => {
      const latitude = parseCoordinate(station.Latitud);
      const longitude = parseCoordinate(station["Longitud (WGS84)"]);
      if (isNaN(latitude) || isNaN(longitude)) return null;

      const provinceCode = station.IDProvincia ? station.IDProvincia.padStart(2, "0") : null;
      const provinceName = (provinceCode ? PROVINCES[provinceCode] : null) || station.Provincia;

      return {
        id: station.IDEESS,
        name: station.Rótulo || "Sin nombre",
        latitude, longitude,
        address: station.Dirección || null,
        postalCode: station["C.P."] || null,
        locality: station.Localidad || null,
        municipality: station.Municipio || null,
        municipalityCode: station.IDMunicipio || null,
        province: provinceCode,
        provinceName,
        communityCode: station.IDCCAA ? station.IDCCAA.padStart(2, "0") : null,
        priceGasoleoA: parsePrice(station["Precio Gasoleo A"]),
        priceGasoleoB: parsePrice(station["Precio Gasoleo B"]),
        priceGasoleoPremium: parsePrice(station["Precio Gasoleo Premium"]),
        priceGasolina95E5: parsePrice(station["Precio Gasolina 95 E5"]),
        priceGasolina95E10: parsePrice(station["Precio Gasolina 95 E10"]),
        priceGasolina98E5: parsePrice(station["Precio Gasolina 98 E5"]),
        priceGasolina98E10: parsePrice(station["Precio Gasolina 98 E10"]),
        priceGLP: parsePrice(station["Precio Gases licuados del petróleo"]),
        priceGNC: parsePrice(station["Precio Gas Natural Comprimido"]),
        priceGNL: parsePrice(station["Precio Gas Natural Licuado"]),
        priceHidrogeno: parsePrice(station["Precio Hidrogeno"]),
        schedule: station.Horario || null,
        is24h: is24Hours(station.Horario),
        margin: station.Margen || null,
        saleType: station["Tipo Venta"] || null,
        lastPriceUpdate: priceUpdateTime,
        lastUpdated: now,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  console.log(`[gas-station] Processing ${validStations.length} valid stations...`);

  // ── 3. Bulk upsert stations ────────────────────────────────────────────

  const BATCH_SIZE = 1000;
  let processed = 0;

  for (let i = 0; i < validStations.length; i += BATCH_SIZE) {
    const batch = validStations.slice(i, i + BATCH_SIZE);

    const values = batch.map((_, idx) => {
      const base = idx * 29;
      return `(${Array.from({ length: 29 }, (__, j) => `$${base + j + 1}`).join(", ")})`;
    }).join(", ");

    const params = batch.flatMap((s) => [
      s.id, s.name, s.latitude, s.longitude, s.address, s.postalCode,
      s.locality, s.municipality, s.municipalityCode, s.province,
      s.provinceName, s.communityCode, s.priceGasoleoA, s.priceGasoleoB,
      s.priceGasoleoPremium, s.priceGasolina95E5, s.priceGasolina95E10,
      s.priceGasolina98E5, s.priceGasolina98E10, s.priceGLP, s.priceGNC,
      s.priceGNL, s.priceHidrogeno, s.schedule, s.is24h, s.margin, s.saleType,
      s.lastPriceUpdate, s.lastUpdated,
    ]);

    await prisma.$executeRawUnsafe(`
      INSERT INTO "GasStation" (
        id, name, latitude, longitude, address, "postalCode",
        locality, municipality, "municipalityCode", province,
        "provinceName", "communityCode", "priceGasoleoA", "priceGasoleoB",
        "priceGasoleoPremium", "priceGasolina95E5", "priceGasolina95E10",
        "priceGasolina98E5", "priceGasolina98E10", "priceGLP", "priceGNC",
        "priceGNL", "priceHidrogeno", schedule, "is24h", margin, "saleType",
        "lastPriceUpdate", "lastUpdated"
      ) VALUES ${values}
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        address = EXCLUDED.address,
        "postalCode" = EXCLUDED."postalCode",
        locality = EXCLUDED.locality,
        municipality = EXCLUDED.municipality,
        "municipalityCode" = EXCLUDED."municipalityCode",
        province = EXCLUDED.province,
        "provinceName" = EXCLUDED."provinceName",
        "communityCode" = EXCLUDED."communityCode",
        "priceGasoleoA" = EXCLUDED."priceGasoleoA",
        "priceGasoleoB" = EXCLUDED."priceGasoleoB",
        "priceGasoleoPremium" = EXCLUDED."priceGasoleoPremium",
        "priceGasolina95E5" = EXCLUDED."priceGasolina95E5",
        "priceGasolina95E10" = EXCLUDED."priceGasolina95E10",
        "priceGasolina98E5" = EXCLUDED."priceGasolina98E5",
        "priceGasolina98E10" = EXCLUDED."priceGasolina98E10",
        "priceGLP" = EXCLUDED."priceGLP",
        "priceGNC" = EXCLUDED."priceGNC",
        "priceGNL" = EXCLUDED."priceGNL",
        "priceHidrogeno" = EXCLUDED."priceHidrogeno",
        schedule = EXCLUDED.schedule,
        "is24h" = EXCLUDED."is24h",
        margin = EXCLUDED.margin,
        "saleType" = EXCLUDED."saleType",
        "lastPriceUpdate" = NOW(),
        "lastUpdated" = NOW()
    `, ...params);

    processed += batch.length;
    if (processed % 5000 === 0 || processed >= validStations.length) {
      console.log(`[gas-station] Stations: ${processed}/${validStations.length}`);
    }
  }

  // ── 4. Daily price history ─────────────────────────────────────────────

  console.log("[gas-station] Saving daily price history...");
  const stationsWithPrices = validStations.filter(
    (s) => s.priceGasoleoA !== null || s.priceGasolina95E5 !== null
  );

  const historyResult = await prisma.gasStationPriceHistory.createMany({
    data: stationsWithPrices.map((s) => ({
      stationId: s.id,
      recordedAt: today,
      priceGasoleoA: s.priceGasoleoA,
      priceGasolina95E5: s.priceGasolina95E5,
      priceGasolina98E5: s.priceGasolina98E5,
      priceGLP: s.priceGLP,
    })),
    skipDuplicates: true,
  });

  console.log(`[gas-station] Created ${historyResult.count} new history records`);

  // ── 5. Aggregation (national, province, community, road stats) ─────────

  console.log("[gas-station] Running fuel price aggregation...");

  // Public stations filter (exclude wholesale/restricted)
  const publicFilter = { OR: [{ saleType: "P" as const }, { saleType: null }] };

  // National stats (Península + Baleares)
  const nationalStats = await prisma.gasStation.aggregate({
    where: { province: { notIn: TAX_FREE_PROVINCES }, ...publicFilter },
    _avg: { priceGasoleoA: true, priceGasolina95E5: true, priceGasolina98E5: true },
    _min: { priceGasoleoA: true, priceGasolina95E5: true, priceGasolina98E5: true },
    _max: { priceGasoleoA: true, priceGasolina95E5: true, priceGasolina98E5: true },
    _count: true,
  });

  await prisma.fuelPriceDailyStats.upsert({
    where: { date_scope: { date: today, scope: "national" } },
    create: {
      date: today, scope: "national",
      avgGasoleoA: nationalStats._avg.priceGasoleoA, minGasoleoA: nationalStats._min.priceGasoleoA, maxGasoleoA: nationalStats._max.priceGasoleoA,
      avgGasolina95: nationalStats._avg.priceGasolina95E5, minGasolina95: nationalStats._min.priceGasolina95E5, maxGasolina95: nationalStats._max.priceGasolina95E5,
      avgGasolina98: nationalStats._avg.priceGasolina98E5, minGasolina98: nationalStats._min.priceGasolina98E5, maxGasolina98: nationalStats._max.priceGasolina98E5,
      stationCount: nationalStats._count,
    },
    update: {
      avgGasoleoA: nationalStats._avg.priceGasoleoA, minGasoleoA: nationalStats._min.priceGasoleoA, maxGasoleoA: nationalStats._max.priceGasoleoA,
      avgGasolina95: nationalStats._avg.priceGasolina95E5, minGasolina95: nationalStats._min.priceGasolina95E5, maxGasolina95: nationalStats._max.priceGasolina95E5,
      avgGasolina98: nationalStats._avg.priceGasolina98E5, minGasolina98: nationalStats._min.priceGasolina98E5, maxGasolina98: nationalStats._max.priceGasolina98E5,
      stationCount: nationalStats._count,
    },
  });
  console.log(`[gas-station] National (Península + Baleares): ${nationalStats._count} stations`);

  // Tax-free territories (Canarias, Ceuta, Melilla)
  const taxFreeStats = await prisma.gasStation.aggregate({
    where: { province: { in: TAX_FREE_PROVINCES }, ...publicFilter },
    _avg: { priceGasoleoA: true, priceGasolina95E5: true, priceGasolina98E5: true },
    _min: { priceGasoleoA: true, priceGasolina95E5: true, priceGasolina98E5: true },
    _max: { priceGasoleoA: true, priceGasolina95E5: true, priceGasolina98E5: true },
    _count: true,
  });

  await prisma.fuelPriceDailyStats.upsert({
    where: { date_scope: { date: today, scope: "tax-free" } },
    create: {
      date: today, scope: "tax-free",
      avgGasoleoA: taxFreeStats._avg.priceGasoleoA, minGasoleoA: taxFreeStats._min.priceGasoleoA, maxGasoleoA: taxFreeStats._max.priceGasoleoA,
      avgGasolina95: taxFreeStats._avg.priceGasolina95E5, minGasolina95: taxFreeStats._min.priceGasolina95E5, maxGasolina95: taxFreeStats._max.priceGasolina95E5,
      avgGasolina98: taxFreeStats._avg.priceGasolina98E5, minGasolina98: taxFreeStats._min.priceGasolina98E5, maxGasolina98: taxFreeStats._max.priceGasolina98E5,
      stationCount: taxFreeStats._count,
    },
    update: {
      avgGasoleoA: taxFreeStats._avg.priceGasoleoA, minGasoleoA: taxFreeStats._min.priceGasoleoA, maxGasoleoA: taxFreeStats._max.priceGasoleoA,
      avgGasolina95: taxFreeStats._avg.priceGasolina95E5, minGasolina95: taxFreeStats._min.priceGasolina95E5, maxGasolina95: taxFreeStats._max.priceGasolina95E5,
      avgGasolina98: taxFreeStats._avg.priceGasolina98E5, minGasolina98: taxFreeStats._min.priceGasolina98E5, maxGasolina98: taxFreeStats._max.priceGasolina98E5,
      stationCount: taxFreeStats._count,
    },
  });

  // Province stats
  const provinceStats = await prisma.gasStation.groupBy({
    by: ["province"],
    where: { province: { not: null }, ...publicFilter },
    _avg: { priceGasoleoA: true, priceGasolina95E5: true, priceGasolina98E5: true },
    _min: { priceGasoleoA: true, priceGasolina95E5: true, priceGasolina98E5: true },
    _max: { priceGasoleoA: true, priceGasolina95E5: true, priceGasolina98E5: true },
    _count: true,
  });

  for (const stat of provinceStats) {
    if (!stat.province) continue;
    await prisma.fuelPriceDailyStats.upsert({
      where: { date_scope: { date: today, scope: `province:${stat.province}` } },
      create: {
        date: today, scope: `province:${stat.province}`,
        avgGasoleoA: stat._avg.priceGasoleoA, minGasoleoA: stat._min.priceGasoleoA, maxGasoleoA: stat._max.priceGasoleoA,
        avgGasolina95: stat._avg.priceGasolina95E5, minGasolina95: stat._min.priceGasolina95E5, maxGasolina95: stat._max.priceGasolina95E5,
        avgGasolina98: stat._avg.priceGasolina98E5, minGasolina98: stat._min.priceGasolina98E5, maxGasolina98: stat._max.priceGasolina98E5,
        stationCount: stat._count,
      },
      update: {
        avgGasoleoA: stat._avg.priceGasoleoA, minGasoleoA: stat._min.priceGasoleoA, maxGasoleoA: stat._max.priceGasoleoA,
        avgGasolina95: stat._avg.priceGasolina95E5, minGasolina95: stat._min.priceGasolina95E5, maxGasolina95: stat._max.priceGasolina95E5,
        avgGasolina98: stat._avg.priceGasolina98E5, minGasolina98: stat._min.priceGasolina98E5, maxGasolina98: stat._max.priceGasolina98E5,
        stationCount: stat._count,
      },
    });
  }
  console.log(`[gas-station] Processed ${provinceStats.length} provinces`);

  // Community stats
  const communityStats = await prisma.gasStation.groupBy({
    by: ["communityCode"],
    where: { communityCode: { not: null }, ...publicFilter },
    _avg: { priceGasoleoA: true, priceGasolina95E5: true, priceGasolina98E5: true },
    _min: { priceGasoleoA: true, priceGasolina95E5: true, priceGasolina98E5: true },
    _max: { priceGasoleoA: true, priceGasolina95E5: true, priceGasolina98E5: true },
    _count: true,
  });

  for (const stat of communityStats) {
    if (!stat.communityCode) continue;
    await prisma.fuelPriceDailyStats.upsert({
      where: { date_scope: { date: today, scope: `community:${stat.communityCode}` } },
      create: {
        date: today, scope: `community:${stat.communityCode}`,
        avgGasoleoA: stat._avg.priceGasoleoA, minGasoleoA: stat._min.priceGasoleoA, maxGasoleoA: stat._max.priceGasoleoA,
        avgGasolina95: stat._avg.priceGasolina95E5, minGasolina95: stat._min.priceGasolina95E5, maxGasolina95: stat._max.priceGasolina95E5,
        avgGasolina98: stat._avg.priceGasolina98E5, minGasolina98: stat._min.priceGasolina98E5, maxGasolina98: stat._max.priceGasolina98E5,
        stationCount: stat._count,
      },
      update: {
        avgGasoleoA: stat._avg.priceGasoleoA, minGasoleoA: stat._min.priceGasoleoA, maxGasoleoA: stat._max.priceGasoleoA,
        avgGasolina95: stat._avg.priceGasolina95E5, minGasolina95: stat._min.priceGasolina95E5, maxGasolina95: stat._max.priceGasolina95E5,
        avgGasolina98: stat._avg.priceGasolina98E5, minGasolina98: stat._min.priceGasolina98E5, maxGasolina98: stat._max.priceGasolina98E5,
        stationCount: stat._count,
      },
    });
  }
  console.log(`[gas-station] Processed ${communityStats.length} communities`);

  // Road stats (roads with >5 stations)
  const roadStats = await prisma.gasStation.groupBy({
    by: ["nearestRoad"],
    where: { nearestRoad: { not: null }, ...publicFilter },
    _avg: { priceGasoleoA: true, priceGasolina95E5: true, priceGasolina98E5: true },
    _min: { priceGasoleoA: true, priceGasolina95E5: true, priceGasolina98E5: true },
    _max: { priceGasoleoA: true, priceGasolina95E5: true, priceGasolina98E5: true },
    _count: true,
    having: { nearestRoad: { _count: { gt: 5 } } },
  });

  for (const stat of roadStats) {
    if (!stat.nearestRoad) continue;
    await prisma.fuelPriceDailyStats.upsert({
      where: { date_scope: { date: today, scope: `road:${stat.nearestRoad}` } },
      create: {
        date: today, scope: `road:${stat.nearestRoad}`,
        avgGasoleoA: stat._avg.priceGasoleoA, minGasoleoA: stat._min.priceGasoleoA, maxGasoleoA: stat._max.priceGasoleoA,
        avgGasolina95: stat._avg.priceGasolina95E5, minGasolina95: stat._min.priceGasolina95E5, maxGasolina95: stat._max.priceGasolina95E5,
        avgGasolina98: stat._avg.priceGasolina98E5, minGasolina98: stat._min.priceGasolina98E5, maxGasolina98: stat._max.priceGasolina98E5,
        stationCount: stat._count,
      },
      update: {
        avgGasoleoA: stat._avg.priceGasoleoA, minGasoleoA: stat._min.priceGasoleoA, maxGasoleoA: stat._max.priceGasoleoA,
        avgGasolina95: stat._avg.priceGasolina95E5, minGasolina95: stat._min.priceGasolina95E5, maxGasolina95: stat._max.priceGasolina95E5,
        avgGasolina98: stat._avg.priceGasolina98E5, minGasolina98: stat._min.priceGasolina98E5, maxGasolina98: stat._max.priceGasolina98E5,
        stationCount: stat._count,
      },
    });
  }
  console.log(`[gas-station] Processed ${roadStats.length} roads`);

  const elapsed = ((Date.now() - now.getTime()) / 1000).toFixed(1);
  console.log(`[gas-station] Completed in ${elapsed}s — ${processed} stations updated`);
}
