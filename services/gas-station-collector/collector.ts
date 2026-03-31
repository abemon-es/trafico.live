/**
 * Gas Station Collector Service
 *
 * Fetches terrestrial gas station data and fuel prices from MINETUR API
 * and stores them in PostgreSQL.
 *
 * Strategy:
 * - GasStation table: Bulk upsert via raw SQL (updates current prices)
 * - GasStationPriceHistory: Bulk insert with skip duplicates (one record/day)
 *
 * Run 3x daily via Railway cron (prices update throughout the day).
 *
 * Data source:
 * - https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/
 *
 * @deprecated Use unified collector: services/collector/ with TASK=gas-station
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

    // 2. Prepare all station data
    const validStations = stations
      .map((station) => {
        const latitude = parseCoordinate(station.Latitud);
        const longitude = parseCoordinate(station["Longitud (WGS84)"]);

        // Skip invalid coordinates
        if (isNaN(latitude) || isNaN(longitude)) {
          return null;
        }

        const provinceCode = station.IDProvincia ? station.IDProvincia.padStart(2, "0") : null;
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

    // 3. Bulk upsert stations using raw SQL (MUCH faster than individual upserts)
    const BATCH_SIZE = 1000;
    let processed = 0;

    for (let i = 0; i < validStations.length; i += BATCH_SIZE) {
      const batch = validStations.slice(i, i + BATCH_SIZE);

      // Build VALUES clause for bulk insert (29 parameters per station)
      const values = batch.map((s, idx) => {
        const base = idx * 29;
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12}, $${base + 13}, $${base + 14}, $${base + 15}, $${base + 16}, $${base + 17}, $${base + 18}, $${base + 19}, $${base + 20}, $${base + 21}, $${base + 22}, $${base + 23}, $${base + 24}, $${base + 25}, $${base + 26}, $${base + 27}, $${base + 28}, $${base + 29})`;
      }).join(", ");

      const params = batch.flatMap((s) => [
        s.id, s.name, s.latitude, s.longitude, s.address, s.postalCode,
        s.locality, s.municipality, s.municipalityCode, s.province,
        s.provinceName, s.communityCode, s.priceGasoleoA, s.priceGasoleoB,
        s.priceGasoleoPremium, s.priceGasolina95E5, s.priceGasolina95E10,
        s.priceGasolina98E5, s.priceGasolina98E10, s.priceGLP, s.priceGNC,
        s.priceGNL, s.priceHidrogeno, s.schedule, s.is24h, s.margin, s.saleType,
        s.lastPriceUpdate, s.lastUpdated
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
        console.log(`[gas-station-collector] Stations: ${processed}/${validStations.length}`);
      }
    }

    console.log(`[gas-station-collector] Updated ${processed} stations`);

    // 4. Save daily price history using bulk INSERT (skip duplicates)
    // This keeps the FIRST prices of the day (if already exists, skip)
    console.log("[gas-station-collector] Saving daily price history...");

    const stationsWithPrices = validStations.filter(
      (s) => s.priceGasoleoA !== null || s.priceGasolina95E5 !== null
    );

    // Use createMany with skipDuplicates - much faster than individual upserts
    const historyResult = await prisma.gasStationPriceHistory.createMany({
      data: stationsWithPrices.map((s) => ({
        stationId: s.id,
        recordedAt: today,
        priceGasoleoA: s.priceGasoleoA,
        priceGasolina95E5: s.priceGasolina95E5,
        priceGasolina98E5: s.priceGasolina98E5,
        priceGLP: s.priceGLP,
      })),
      skipDuplicates: true, // Skip if already have record for this station+date
    });

    console.log(`[gas-station-collector] Created ${historyResult.count} new history records (${stationsWithPrices.length - historyResult.count} already existed)`);

    // 5. Summary statistics
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
    console.log(`[gas-station-collector] Total: ${totalStations} stations`);

    const stations24h = await prisma.gasStation.count({ where: { is24h: true } });
    console.log(`[gas-station-collector] 24h stations: ${stations24h}`);

    const elapsed = ((Date.now() - now.getTime()) / 1000).toFixed(1);
    console.log(`[gas-station-collector] Completed in ${elapsed}s`);

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error("[gas-station-collector] Fatal error:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
