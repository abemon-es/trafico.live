/**
 * Gas Station Collector Service
 *
 * Fetches terrestrial gas station data and fuel prices from MINETUR API
 * and stores them in PostgreSQL.
 *
 * Run 3x daily via Railway cron (prices update throughout the day).
 * Last manual trigger: 2026-01-26
 *
 * Data source:
 * - https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
}

const MINETUR_API_URL =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/";

// Province INE codes mapping
const PROVINCES: Record<string, string> = {
  "01": "Álava",
  "02": "Albacete",
  "03": "Alicante",
  "04": "Almería",
  "05": "Ávila",
  "06": "Badajoz",
  "07": "Baleares",
  "08": "Barcelona",
  "09": "Burgos",
  "10": "Cáceres",
  "11": "Cádiz",
  "12": "Castellón",
  "13": "Ciudad Real",
  "14": "Córdoba",
  "15": "A Coruña",
  "16": "Cuenca",
  "17": "Girona",
  "18": "Granada",
  "19": "Guadalajara",
  "20": "Gipuzkoa",
  "21": "Huelva",
  "22": "Huesca",
  "23": "Jaén",
  "24": "León",
  "25": "Lleida",
  "26": "La Rioja",
  "27": "Lugo",
  "28": "Madrid",
  "29": "Málaga",
  "30": "Murcia",
  "31": "Navarra",
  "32": "Ourense",
  "33": "Asturias",
  "34": "Palencia",
  "35": "Las Palmas",
  "36": "Pontevedra",
  "37": "Salamanca",
  "38": "Santa Cruz de Tenerife",
  "39": "Cantabria",
  "40": "Segovia",
  "41": "Sevilla",
  "42": "Soria",
  "43": "Tarragona",
  "44": "Teruel",
  "45": "Toledo",
  "46": "Valencia",
  "47": "Valladolid",
  "48": "Bizkaia",
  "49": "Zamora",
  "50": "Zaragoza",
  "51": "Ceuta",
  "52": "Melilla",
};

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
  // Fuel prices (all strings with comma decimal separator)
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
  "% BioEtanol": string;
  "% Éster metílico": string;
}

interface APIResponse {
  Fecha: string; // "26/01/2026 2:24:07"
  ListaEESSPrecio: APIStation[];
}

// Parse Spanish decimal format "1,349" -> 1.349
function parsePrice(priceStr: string): number | null {
  if (!priceStr || priceStr.trim() === "") return null;
  const normalized = priceStr.replace(",", ".");
  const value = parseFloat(normalized);
  return isNaN(value) ? null : value;
}

// Parse Spanish coordinate format "39,211417" -> 39.211417
function parseCoordinate(coordStr: string): number {
  if (!coordStr) return NaN;
  const normalized = coordStr.replace(",", ".");
  return parseFloat(normalized);
}

// Check if schedule indicates 24h operation
function is24Hours(schedule: string): boolean {
  if (!schedule) return false;
  return schedule.includes("24H") || schedule.includes("24h");
}

// Parse API date format "26/01/2026 2:24:07" -> Date
function parseAPIDate(dateStr: string): Date {
  const [datePart, timePart] = dateStr.split(" ");
  const [day, month, year] = datePart.split("/").map(Number);
  const [hour, minute, second] = timePart.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, second);
}

async function main() {
  const prisma = createPrismaClient();
  const now = new Date();
  // Use UTC date to ensure consistency across timezones
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  console.log(`[gas-station-collector] Starting at ${now.toISOString()}`);

  try {
    // 1. FETCH from MINETUR API
    console.log(`[gas-station-collector] Fetching from ${MINETUR_API_URL}`);
    const response = await fetch(MINETUR_API_URL, {
      headers: {
        Accept: "application/json",
        "User-Agent": "TraficoEspana/1.0 (gas-station-collector)",
      },
      signal: AbortSignal.timeout(180000), // 3 minutes timeout for ~12k stations
    });

    if (!response.ok) {
      throw new Error(`MINETUR API error: ${response.status} ${response.statusText}`);
    }

    const data: APIResponse = await response.json();
    const stations = data.ListaEESSPrecio;
    const priceUpdateTime = parseAPIDate(data.Fecha);

    console.log(
      `[gas-station-collector] Fetched ${stations.length} stations (prices from ${data.Fecha})`
    );

    if (stations.length === 0) {
      console.log("[gas-station-collector] No stations found, exiting");
      return;
    }

    // 2. Process stations - use transaction batching for better performance
    const BATCH_SIZE = 100; // Smaller batches for transaction
    let processed = 0;
    let errors = 0;

    // Prepare all station data first
    const validStations = stations
      .map((station) => {
        const latitude = parseCoordinate(station.Latitud);
        const longitude = parseCoordinate(station["Longitud (WGS84)"]);

        // Skip invalid coordinates
        if (isNaN(latitude) || isNaN(longitude)) {
          return null;
        }

        const provinceCode = station.IDProvincia.padStart(2, "0");
        const provinceName = PROVINCES[provinceCode] || station.Provincia;

        return {
          id: station.IDEESS,
          name: station.Rótulo || "Sin nombre",
          latitude,
          longitude,
          address: station.Dirección || null,
          postalCode: station["C.P."] || null,
          locality: station.Localidad || null,
          municipality: station.Municipio || null,
          municipalityCode: station.IDMunicipio || null,
          province: provinceCode,
          provinceName,
          communityCode: station.IDCCAA.padStart(2, "0"),

          // Fuel prices
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
          priceAdblue: null as number | null, // Not in API response

          // Station info
          schedule: station.Horario || null,
          is24h: is24Hours(station.Horario),
          margin: station.Margen || null,
          saleType: station["Tipo Venta"] || null,

          // Timestamps
          lastPriceUpdate: priceUpdateTime,
          lastUpdated: now,
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);

    console.log(`[gas-station-collector] Processing ${validStations.length} valid stations...`);

    // Process in transactional batches
    for (let i = 0; i < validStations.length; i += BATCH_SIZE) {
      const batch = validStations.slice(i, i + BATCH_SIZE);

      try {
        // Use $transaction for batch upserts
        await prisma.$transaction(
          batch.map((station) =>
            prisma.gasStation.upsert({
              where: { id: station.id },
              create: station,
              update: {
                name: station.name,
                latitude: station.latitude,
                longitude: station.longitude,
                address: station.address,
                postalCode: station.postalCode,
                locality: station.locality,
                municipality: station.municipality,
                municipalityCode: station.municipalityCode,
                province: station.province,
                provinceName: station.provinceName,
                communityCode: station.communityCode,
                priceGasoleoA: station.priceGasoleoA,
                priceGasoleoB: station.priceGasoleoB,
                priceGasoleoPremium: station.priceGasoleoPremium,
                priceGasolina95E5: station.priceGasolina95E5,
                priceGasolina95E10: station.priceGasolina95E10,
                priceGasolina98E5: station.priceGasolina98E5,
                priceGasolina98E10: station.priceGasolina98E10,
                priceGLP: station.priceGLP,
                priceGNC: station.priceGNC,
                priceGNL: station.priceGNL,
                priceHidrogeno: station.priceHidrogeno,
                priceAdblue: station.priceAdblue,
                schedule: station.schedule,
                is24h: station.is24h,
                margin: station.margin,
                saleType: station.saleType,
                lastPriceUpdate: station.lastPriceUpdate,
                lastUpdated: station.lastUpdated,
              },
            })
          ),
          { timeout: 60000 } // 60 second timeout per batch
        );
        processed += batch.length;
      } catch (err) {
        errors += batch.length;
        console.error(`[gas-station-collector] Batch error at ${i}:`, err);
      }

      // Progress every 1000
      if ((i + BATCH_SIZE) % 1000 === 0 || i + BATCH_SIZE >= validStations.length) {
        console.log(
          `[gas-station-collector] Progress: ${Math.min(i + BATCH_SIZE, validStations.length)}/${validStations.length}`
        );
      }
    }

    // 3. Save daily price history using bulk insert with conflict handling
    console.log("[gas-station-collector] Saving daily price history...");

    // Get all stations with prices
    const stationsWithPrices = validStations.filter(
      (s) => s.priceGasoleoA !== null || s.priceGasolina95E5 !== null
    );

    // Prepare history records
    const historyRecords = stationsWithPrices.map((station) => ({
      stationId: station.id,
      recordedAt: today,
      priceGasoleoA: station.priceGasoleoA,
      priceGasolina95E5: station.priceGasolina95E5,
      priceGasolina98E5: station.priceGasolina98E5,
      priceGLP: station.priceGLP,
    }));

    // Batch upsert history using transaction
    let historyCount = 0;
    for (let i = 0; i < historyRecords.length; i += BATCH_SIZE) {
      const batch = historyRecords.slice(i, i + BATCH_SIZE);

      try {
        await prisma.$transaction(
          batch.map((record) =>
            prisma.gasStationPriceHistory.upsert({
              where: {
                stationId_recordedAt: {
                  stationId: record.stationId,
                  recordedAt: record.recordedAt,
                },
              },
              create: record,
              update: {
                priceGasoleoA: record.priceGasoleoA,
                priceGasolina95E5: record.priceGasolina95E5,
                priceGasolina98E5: record.priceGasolina98E5,
                priceGLP: record.priceGLP,
              },
            })
          ),
          { timeout: 60000 }
        );
        historyCount += batch.length;
      } catch (err) {
        console.error(`[gas-station-collector] History batch error at ${i}:`, err);
      }
    }

    console.log(`[gas-station-collector] Saved ${historyCount} history records`);

    // 4. Summary statistics
    const stats = await prisma.gasStation.groupBy({
      by: ["province"],
      _count: true,
      _avg: {
        priceGasoleoA: true,
        priceGasolina95E5: true,
      },
    });

    console.log(`[gas-station-collector] Stations by province (top 10):`);
    const sortedStats = stats.sort((a, b) => b._count - a._count);
    for (const stat of sortedStats.slice(0, 10)) {
      const provinceName = stat.province ? PROVINCES[stat.province] || stat.province : "Unknown";
      const avgDiesel = stat._avg.priceGasoleoA
        ? `€${Number(stat._avg.priceGasoleoA).toFixed(3)}`
        : "N/A";
      const avgGas95 = stat._avg.priceGasolina95E5
        ? `€${Number(stat._avg.priceGasolina95E5).toFixed(3)}`
        : "N/A";
      console.log(`  ${provinceName}: ${stat._count} stations (Diesel: ${avgDiesel}, G95: ${avgGas95})`);
    }

    const totalStations = stats.reduce((sum, s) => sum + s._count, 0);
    console.log(`[gas-station-collector] Total stations: ${totalStations}`);

    // 24h stations count
    const stations24h = await prisma.gasStation.count({ where: { is24h: true } });
    console.log(`[gas-station-collector] 24h stations: ${stations24h}`);

    console.log(
      `[gas-station-collector] Collection completed: ${processed} processed, ${errors} errors`
    );
  } catch (error) {
    console.error("[gas-station-collector] Fatal error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
