/**
 * Mobility O-D Matrices Collector (v2)
 *
 * Ingests province-level origin-destination trip counts from the
 * Ministerio de Transportes BigData Open Mobility study.
 *
 * Source: https://movilidad-opendata.mitma.es/
 * Format: Monthly TAR archives containing daily CSV files per municipality
 * Coverage: 2022-present, aggregated to province level
 *
 * The raw data is municipality-level O-D matrices in monthly TAR files.
 * We download each month's TAR, extract CSVs, parse, and aggregate to
 * province level (52×52 = 2,704 pairs/day) for storage.
 *
 * IMPORTANT: The CDN requires a browser-like User-Agent header or it
 * rejects the TLS handshake (CloudFront WAF).
 */

import { PrismaClient } from "@prisma/client";
import { createGunzip } from "zlib";
import { Readable } from "stream";
import { log, logError } from "../../shared/utils.js";

const TASK = "mobility-od";

// Correct domain (movilidad-opendata, not opendata-movilidad)
const BASE_URL = "https://movilidad-opendata.mitma.es/estudios_basicos";

// CloudFront requires a browser-like User-Agent or rejects at TLS level
const USER_AGENT = "Mozilla/5.0 (compatible; trafico.live/collector; +https://trafico.live)";

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
 * Extract province code (2 digits) from a municipality code.
 * Municipality codes are 5 digits: first 2 = province.
 * Also handles district codes like "28_079_01" → province "28"
 */
function extractProvinceCode(id: string): string | null {
  if (!id) return null;
  const clean = id.replace(/[_\-]/g, "").trim();
  const code = clean.substring(0, 2);
  if (/^\d{2}$/.test(code) && PROVINCE_NAMES[code]) return code;
  return null;
}

/**
 * Parse a CSV/TSV line (pipe or semicolon delimited)
 */
function parseCSVLine(line: string): string[] {
  const sep = line.includes("|") ? "|" : line.includes(";") ? ";" : ",";
  return line.split(sep).map((f) => f.trim().replace(/^["']|["']$/g, ""));
}

/**
 * Parse TAR header — standard POSIX tar format (512-byte blocks)
 */
function parseTarEntry(buffer: Buffer, offset: number): { name: string; size: number; headerEnd: number } | null {
  if (offset + 512 > buffer.length) return null;
  const header = buffer.subarray(offset, offset + 512);

  // Check for end-of-archive (two zero blocks)
  if (header.every((b) => b === 0)) return null;

  const name = header.subarray(0, 100).toString("utf-8").replace(/\0/g, "").trim();
  const sizeOctal = header.subarray(124, 136).toString("utf-8").replace(/\0/g, "").trim();
  const size = parseInt(sizeOctal, 8) || 0;

  return { name, size, headerEnd: offset + 512 };
}

/**
 * Download a file with proper User-Agent (required by CloudFront WAF)
 */
async function download(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(300_000), // 5 min for large TAR files
    });
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`HTTP ${res.status}`);
    }
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    logError(TASK, `Download failed: ${url}`, err);
    return null;
  }
}

/**
 * Process a single CSV content string, aggregating O-D pairs to province level.
 */
function processCSV(
  content: string,
  aggregation: Map<string, { tripCount: number; distanceSum: number; distanceCount: number }>
): number {
  const lines = content.split("\n");
  if (lines.length < 2) return 0;

  // Parse header
  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase());
  const colDate = headers.findIndex((h) => h.includes("fecha"));
  const colOrigin = headers.findIndex((h) => h.includes("origen"));
  const colDest = headers.findIndex((h) => h.includes("destino"));
  const colTrips = headers.findIndex((h) => h.includes("viajes") || h.includes("trips") || h.includes("n_viajes"));
  const colDistance = headers.findIndex((h) => h.includes("distancia") || h.includes("dist"));

  if (colOrigin < 0 || colDest < 0 || colTrips < 0) return 0;

  let processed = 0;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = parseCSVLine(line);
    const origin = extractProvinceCode(fields[colOrigin]);
    const dest = extractProvinceCode(fields[colDest]);
    if (!origin || !dest) continue;

    const trips = parseFloat(fields[colTrips]?.replace(",", ".") || "0");
    if (isNaN(trips) || trips <= 0) continue;

    // Use date from CSV if available, otherwise derive from filename
    let dateStr = "";
    if (colDate >= 0 && fields[colDate]) {
      // Format: YYYYMMDD or YYYY-MM-DD
      dateStr = fields[colDate].replace(/-/g, "").substring(0, 8);
      if (dateStr.length === 8) {
        dateStr = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
      }
    }

    const distance = colDistance >= 0 ? parseFloat(fields[colDistance]?.replace(",", ".") || "0") : 0;

    const key = `${dateStr}|${origin}|${dest}`;
    const existing = aggregation.get(key) || { tripCount: 0, distanceSum: 0, distanceCount: 0 };
    existing.tripCount += trips;
    if (distance > 0) {
      existing.distanceSum += distance * trips;
      existing.distanceCount += trips;
    }
    aggregation.set(key, existing);
    processed++;
  }
  return processed;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

export async function run(prisma: PrismaClient): Promise<void> {
  log(TASK, "Starting mobility O-D matrix collection");

  // Determine start date
  const latest = await prisma.mobilityODFlow.findFirst({
    orderBy: { date: "desc" },
    select: { date: true },
  });

  let startYear = 2022;
  let startMonth = 1;

  if (latest) {
    const d = new Date(latest.date);
    startYear = d.getFullYear();
    startMonth = d.getMonth() + 1;
    log(TASK, `Resuming from ${startYear}-${String(startMonth).padStart(2, "0")}`);
  } else {
    log(TASK, "No existing data — full backfill from 2022-01");
  }

  const now = new Date();
  const endYear = now.getFullYear();
  const endMonth = now.getMonth() + 1;
  let totalRecords = 0;

  for (let year = startYear; year <= endYear; year++) {
    const mStart = year === startYear ? startMonth : 1;
    const mEnd = year === endYear ? endMonth - 1 : 12;

    for (let month = mStart; month <= mEnd; month++) {
      const ym = `${year}${String(month).padStart(2, "0")}`;

      // Try municipality-level monthly TAR first (most complete)
      const tarUrl = `${BASE_URL}/por-municipios/viajes/meses-completos/${ym}_Viajes_municipios.tar`;
      log(TASK, `Downloading ${ym}...`);

      const tarBuffer = await download(tarUrl);
      if (!tarBuffer) {
        log(TASK, `${ym}: not available, skipping`);
        continue;
      }

      log(TASK, `${ym}: downloaded ${(tarBuffer.length / 1024 / 1024).toFixed(1)} MB TAR`);

      // Parse TAR and extract CSV files
      const aggregation = new Map<
        string,
        { tripCount: number; distanceSum: number; distanceCount: number }
      >();
      let csvCount = 0;
      let offset = 0;

      while (offset < tarBuffer.length) {
        const entry = parseTarEntry(tarBuffer, offset);
        if (!entry) break;

        const { name, size, headerEnd } = entry;
        const dataEnd = headerEnd + size;
        const paddedEnd = Math.ceil(dataEnd / 512) * 512;

        if (name.endsWith(".csv") || name.endsWith(".csv.gz") || name.endsWith(".txt")) {
          let content: string;
          const fileData = tarBuffer.subarray(headerEnd, dataEnd);

          if (name.endsWith(".gz")) {
            // Decompress gzipped CSV
            const { gunzipSync } = await import("zlib");
            try {
              content = gunzipSync(fileData).toString("utf-8");
            } catch {
              offset = paddedEnd;
              continue;
            }
          } else {
            content = fileData.toString("utf-8");
          }

          const processed = processCSV(content, aggregation);
          if (processed > 0) csvCount++;
        }

        offset = paddedEnd;
      }

      // Convert aggregation to records and upsert
      const records: ODRecord[] = [];
      for (const [key, agg] of aggregation) {
        const [dateStr, origin, dest] = key.split("|");
        if (!dateStr || !origin || !dest) continue;
        records.push({
          date: new Date(dateStr),
          originProvince: origin,
          originName: PROVINCE_NAMES[origin] || null,
          destProvince: dest,
          destName: PROVINCE_NAMES[dest] || null,
          tripCount: Math.round(agg.tripCount),
          avgDistanceKm: agg.distanceCount > 0
            ? Math.round((agg.distanceSum / agg.distanceCount) * 10) / 10
            : null,
        });
      }

      // Batch upsert
      let monthUpserted = 0;
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
        monthUpserted += batch.length;
      }

      totalRecords += monthUpserted;
      log(TASK, `${ym}: ${csvCount} CSVs → ${monthUpserted.toLocaleString()} O-D pairs stored`);

      // Be respectful between months
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  log(TASK, `Done: ${totalRecords.toLocaleString()} total O-D pairs`);
}
