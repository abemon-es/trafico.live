/**
 * Maritime Station Collector
 *
 * Fetches maritime gas station data from MINETUR API
 * and stores them in PostgreSQL.
 *
 * Data source:
 * - https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesMaritimas/
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

const MINETUR_MARITIME_URL =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/PostesMaritimos/";

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

interface APIMaritimeStation {
  IDEESS: string;
  Rótulo: string;
  Latitud: string;
  "Longitud (WGS84)": string;
  Localidad: string;
  Provincia: string;
  IDProvincia: string;
  Horario: string;
  "Precio Gasoleo A": string;
  "Precio Gasoleo B": string;
  "Precio Gasolina 95 E5": string;
  "Precio Gasolina 98 E5": string;
}

interface APIResponse {
  Fecha: string;
  ListaEESSPrecio: APIMaritimeStation[];
}

function parsePrice(priceStr: string): number | null {
  if (!priceStr || priceStr.trim() === "") return null;
  const normalized = priceStr.replace(",", ".");
  const value = parseFloat(normalized);
  return isNaN(value) ? null : value;
}

/**
 * Parse bulk price (per 1000L) and convert to per-litre
 * MINETUR API returns Gasoleo B prices in bulk format (e.g., 626.000 = 626€/1000L)
 * We normalize to per-litre for consistent display (0.626 €/L)
 */
function parseBulkPrice(priceStr: string): number | null {
  const price = parsePrice(priceStr);
  if (price === null) return null;
  // If price > 10, assume it's bulk pricing (per 1000L) and convert to per-litre
  // Normal fuel prices are always < 5 €/L
  if (price > 10) {
    return Math.round((price / 1000) * 1000) / 1000; // Round to 3 decimals
  }
  return price;
}

function parseCoordinate(coordStr: string): number {
  if (!coordStr) return NaN;
  const normalized = coordStr.replace(",", ".");
  return parseFloat(normalized);
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

async function main() {
  const prisma = createPrismaClient();
  const now = new Date();
  // Use UTC date to ensure consistency across timezones
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  console.log(`[maritime-collector] Starting at ${now.toISOString()}`);

  try {
    console.log(`[maritime-collector] Fetching from ${MINETUR_MARITIME_URL}`);
    const response = await fetch(MINETUR_MARITIME_URL, {
      headers: {
        Accept: "application/json",
        "User-Agent": "TraficoEspana/1.0 (maritime-collector)",
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
      `[maritime-collector] Fetched ${stations.length} maritime stations (prices from ${data.Fecha})`
    );

    if (stations.length === 0) {
      console.log("[maritime-collector] No stations found, exiting");
      return;
    }

    // Process all maritime stations
    let processed = 0;
    let errors = 0;

    for (const station of stations) {
      const latitude = parseCoordinate(station.Latitud);
      const longitude = parseCoordinate(station["Longitud (WGS84)"]);

      if (isNaN(latitude) || isNaN(longitude)) {
        errors++;
        continue;
      }

      const provinceCode = station.IDProvincia.padStart(2, "0");
      const provinceName = PROVINCES[provinceCode] || station.Provincia;

      const stationId = station.IDPosteMaritimo || station.IDEESS;
      if (!stationId) {
        errors++;
        continue;
      }

      try {
        await prisma.maritimeStation.upsert({
          where: { id: stationId },
          create: {
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
          },
          update: {
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
          },
        });
        processed++;
      } catch (error) {
        errors++;
        console.error(`[maritime-collector] Error for station ${stationId}:`, error);
      }
    }

    // Save daily history
    console.log("[maritime-collector] Saving daily price history...");

    const stationsWithPrices = await prisma.maritimeStation.findMany({
      where: {
        OR: [
          { priceGasoleoA: { not: null } },
          { priceGasolina95E5: { not: null } },
        ],
      },
      select: {
        id: true,
        priceGasoleoA: true,
        priceGasolina95E5: true,
      },
    });

    for (const station of stationsWithPrices) {
      await prisma.maritimePriceHistory.upsert({
        where: {
          stationId_recordedAt: {
            stationId: station.id,
            recordedAt: today,
          },
        },
        create: {
          stationId: station.id,
          recordedAt: today,
          priceGasoleoA: station.priceGasoleoA,
          priceGasolina95E5: station.priceGasolina95E5,
        },
        update: {
          priceGasoleoA: station.priceGasoleoA,
          priceGasolina95E5: station.priceGasolina95E5,
        },
      });
    }

    console.log(
      `[maritime-collector] Completed: ${processed} processed, ${errors} errors`
    );
  } catch (error) {
    console.error("[maritime-collector] Fatal error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
