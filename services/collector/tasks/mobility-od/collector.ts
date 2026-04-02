/**
 * Mobility O-D Matrices Collector
 *
 * Ingests province-level daily origin-destination trip counts from the
 * Ministerio de Transportes BigData Open Mobility study.
 *
 * Source: https://opendata-movilidad.mitma.es/
 * Format: CSV.gz files organized by date
 * Coverage: 2022-present, province-level aggregation
 * Frequency: One-shot backfill + periodic update
 *
 * The raw data is district-level O-D matrices. We aggregate to province
 * level (52×52 = 2,704 pairs/day) to keep storage manageable.
 */

import { PrismaClient } from "@prisma/client";
import { createGunzip } from "zlib";
import { Readable } from "stream";
import { log, logError } from "../../shared/utils.js";

const TASK = "mobility-od";

// Ministerio base URL for province-level daily files
const BASE_URL =
  "https://opendata-movilidad.mitma.es/estudios_basicos/por-provincias/viajes/ficheros-diarios";

// INE province codes → names (subset, for logging)
const PROVINCE_NAMES: Record<string, string> = {
  "01": "Álava", "02": "Albacete", "03": "Alicante", "04": "Almería",
  "05": "Ávila", "06": "Badajoz", "07": "Baleares", "08": "Barcelona",
  "09": "Burgos", "10": "Cáceres", "11": "Cádiz", "12": "Castellón",
  "13": "Ciudad Real", "14": "Córdoba", "15": "A Coruña", "16": "Cuenca",
  "17": "Girona", "18": "Granada", "19": "Guadalajara", "20": "Gipuzkoa",
  "21": "Huelva", "22": "Huesca", "23": "Jaén", "24": "León",
  "25": "Lleida", "26": "La Rioja", "27": "Lugo", "28": "Madrid",
  "29": "Málaga", "30": "Murcia", "31": "Navarra", "32": "Ourense",
  "33": "Asturias", "34": "Palencia", "35": "Las Palmas", "36": "Pontevedra",
  "37": "Salamanca", "38": "S.C. Tenerife", "39": "Cantabria", "40": "Segovia",
  "41": "Sevilla", "42": "Soria", "43": "Tarragona", "44": "Teruel",
  "45": "Toledo", "46": "Valencia", "47": "Valladolid", "48": "Bizkaia",
  "49": "Zamora", "50": "Zaragoza", "51": "Ceuta", "52": "Melilla",
};

interface ODRecord {
  date: Date;
  originProvince: string;
  originName: string | null;
  destProvince: string;
  destName: string | null;
  tripCount: number;
  avgDistanceKm: number | null;
}

/**
 * Parse a CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if ((char === "|" || char === ";") && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

/**
 * Extract 2-digit province code from a district/province identifier.
 * The ministry uses formats like "01" (province) or "01_001" (district).
 */
function extractProvinceCode(id: string): string | null {
  if (!id) return null;
  // Take first 2 characters — these are the INE province code
  const code = id.substring(0, 2);
  if (/^\d{2}$/.test(code) && PROVINCE_NAMES[code]) return code;
  return null;
}

/**
 * Download and decompress a gzipped CSV file, streaming line by line.
 */
async function* streamGzipCSV(url: string): AsyncGenerator<string> {
  const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  if (!response.body) {
    throw new Error("No response body");
  }

  // Stream directly — never buffer the entire file in memory
  const gunzip = createGunzip();
  const nodeStream = Readable.fromWeb(response.body as import("stream/web").ReadableStream);
  const readable = nodeStream.pipe(gunzip);

  let remainder = "";
  for await (const chunk of readable) {
    const text = remainder + chunk.toString("utf-8");
    const lines = text.split("\n");
    remainder = lines.pop() || "";
    for (const line of lines) {
      if (line.trim()) yield line;
    }
  }
  if (remainder.trim()) yield remainder;
}

/**
 * Aggregate district-level rows to province-level O-D pairs.
 */
function aggregateToProvince(
  records: Map<string, { tripCount: number; distanceSum: number; distanceCount: number }>
): ODRecord[] {
  const results: ODRecord[] = [];
  for (const [key, agg] of records) {
    const [dateStr, origin, dest] = key.split("|");
    results.push({
      date: new Date(dateStr),
      originProvince: origin,
      originName: PROVINCE_NAMES[origin] || null,
      destProvince: dest,
      destName: PROVINCE_NAMES[dest] || null,
      tripCount: Math.round(agg.tripCount),
      avgDistanceKm:
        agg.distanceCount > 0
          ? Math.round((agg.distanceSum / agg.distanceCount) * 10) / 10
          : null,
    });
  }
  return results;
}

/**
 * Generate date range as YYYYMMDD strings for a given month.
 */
function getDatesForMonth(year: number, month: number): string[] {
  const dates: string[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const d = `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`;
    dates.push(d);
  }
  return dates;
}

export async function run(prisma: PrismaClient): Promise<void> {
  log(TASK, "Starting mobility O-D matrix collection");

  // Determine start date: latest date in DB or default to 2022-01
  const latest = await prisma.mobilityODFlow.findFirst({
    orderBy: { date: "desc" },
    select: { date: true },
  });

  let startYear = 2022;
  let startMonth = 1;

  if (latest) {
    const d = new Date(latest.date);
    startYear = d.getFullYear();
    startMonth = d.getMonth() + 1; // re-process last month for completeness
    log(TASK, `Resuming from ${startYear}-${String(startMonth).padStart(2, "0")}`);
  } else {
    log(TASK, "No existing data — full backfill from 2022-01");
  }

  const now = new Date();
  const endYear = now.getFullYear();
  const endMonth = now.getMonth() + 1;
  let totalRecords = 0;
  let totalDays = 0;

  for (let year = startYear; year <= endYear; year++) {
    const mStart = year === startYear ? startMonth : 1;
    const mEnd = year === endYear ? endMonth - 1 : 12; // Skip current month (incomplete)

    for (let month = mStart; month <= mEnd; month++) {
      const ym = `${year}${String(month).padStart(2, "0")}`;
      const dates = getDatesForMonth(year, month);
      let monthRecords = 0;

      for (const dateStr of dates) {
        // Skip future dates
        const dateObj = new Date(`${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`);
        if (dateObj >= now) continue;

        const url = `${BASE_URL}/${ym}/${dateStr}_Viajes_provincias.csv.gz`;

        try {
          const aggregation = new Map<
            string,
            { tripCount: number; distanceSum: number; distanceCount: number }
          >();

          let headerParsed = false;
          let colOrigin = -1;
          let colDest = -1;
          let colTrips = -1;
          let colDistance = -1;

          for await (const line of streamGzipCSV(url)) {
            if (!headerParsed) {
              // Parse header to find column indices
              const headers = parseCSVLine(line).map((h) => h.toLowerCase());
              colOrigin = headers.findIndex((h) => h.includes("origen"));
              colDest = headers.findIndex((h) => h.includes("destino"));
              colTrips = headers.findIndex((h) => h.includes("viajes") || h.includes("trips"));
              colDistance = headers.findIndex((h) => h.includes("distancia") || h.includes("distance"));

              if (colOrigin < 0 || colDest < 0 || colTrips < 0) {
                logError(TASK, `Cannot identify columns in ${dateStr}: ${headers.join(", ")}`);
                break;
              }
              headerParsed = true;
              continue;
            }

            const fields = parseCSVLine(line);
            const origin = extractProvinceCode(fields[colOrigin]);
            const dest = extractProvinceCode(fields[colDest]);
            if (!origin || !dest) continue;

            const trips = parseFloat(fields[colTrips]?.replace(",", ".") || "0");
            const distance = colDistance >= 0
              ? parseFloat(fields[colDistance]?.replace(",", ".") || "0")
              : 0;

            if (isNaN(trips) || trips <= 0) continue;

            const key = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}|${origin}|${dest}`;
            const existing = aggregation.get(key) || { tripCount: 0, distanceSum: 0, distanceCount: 0 };
            existing.tripCount += trips;
            if (distance > 0) {
              existing.distanceSum += distance * trips;
              existing.distanceCount += trips;
            }
            aggregation.set(key, existing);
          }

          // Batch upsert aggregated records
          const records = aggregateToProvince(aggregation);
          if (records.length > 0) {
            // Use createMany with skipDuplicates for performance, then handle updates separately
            for (const batch of chunk(records, 500)) {
              await Promise.all(
                batch.map((r) =>
                  prisma.mobilityODFlow.upsert({
                    where: {
                      date_originProvince_destProvince: {
                        date: r.date,
                        originProvince: r.originProvince,
                        destProvince: r.destProvince,
                      },
                    },
                    create: r,
                    update: {
                      tripCount: r.tripCount,
                      avgDistanceKm: r.avgDistanceKm,
                      originName: r.originName,
                      destName: r.destName,
                    },
                  })
                )
              );
            }
            monthRecords += records.length;
            totalDays++;
          }
        } catch (error) {
          // 404 = file doesn't exist for this date (weekend gap, etc.) — skip silently
          if (error instanceof Error && error.message.includes("404")) continue;
          logError(TASK, `Failed to process ${dateStr}`, error);
        }

        // Respectful rate: 200ms between file downloads
        await new Promise((r) => setTimeout(r, 200));
      }

      totalRecords += monthRecords;
      log(TASK, `${ym}: ${monthRecords} O-D pairs stored`);
    }
  }

  log(TASK, `Done: ${totalRecords} O-D pairs across ${totalDays} days`);
}

/**
 * Split array into chunks of given size.
 */
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
