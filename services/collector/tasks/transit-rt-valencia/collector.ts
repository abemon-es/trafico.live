/**
 * Colector de posiciones de vehículos: EMT Valencia (autobuses)
 *
 * Fuente: Valencia Open Data Soft — API REST JSON (no protobuf GTFS-RT)
 * URL:    https://valencia.opendatasoft.com/api/explore/v2.1/catalog/datasets/emt-tiempo-real/records
 * Auth:   Sin autenticación (datos abiertos Ayuntamiento de Valencia)
 *
 * Nota: La fuente de Valencia EMT en OpenDataSoft publica posiciones en formato
 * JSON (no binario GTFS-RT protobuf). El colector parsea el JSON y lo normaliza
 * al mismo esquema TransitVehiclePosition que los otros operadores.
 *
 * Campos del JSON mapeados:
 *   idvehiculo  → vehicleId
 *   linea       → routeId
 *   latitud/longitud → latitude/longitude
 *   velocidad   → speedKmh (ya en km/h según la fuente)
 *   sentido     → bearing (si disponible)
 *
 * Cadencia: cada 30s (2 pases por invocación de cron de 1 minuto).
 * Filas estimadas: ~200–600 vehículos activos según el horario.
 *
 * Fuente: Ayuntamiento de Valencia (ODbL / datos abiertos).
 * Documentación: https://valencia.opendatasoft.com/
 */

import * as Sentry from "@sentry/node";
import { PrismaClient } from "@prisma/client";
import { log, logError } from "../../shared/utils.js";
import { heartbeat } from "../../shared/heartbeat.js";

const TASK = "transit-rt-valencia";

// MobilityData ID para EMT Valencia (operador de autobús urbano)
const MDB_ID = "mdb-1064";
const OPERATOR_NAME = "EMT Valencia";

// API OpenDataSoft de Valencia — sin autenticación
// Endpoint v2.1 con paginación (limit 100 es el máximo por página)
const FEED_URL =
  "https://valencia.opendatasoft.com/api/explore/v2.1/catalog/datasets/emt-tiempo-real/records?limit=100&offset=0";

const PASS_INTERVAL_MS = 30_000;
const DEADLINE_MS = 50_000;

// ── Tipos del JSON de respuesta ────────────────────────────────────────────────

interface OdsRecord {
  idvehiculo?: string | number;
  linea?: string | number;
  latitud?: number | string;
  longitud?: number | string;
  velocidad?: number | string;
  sentido?: number | string;
  // Algunos datasets usan "geo_point_2d" como objeto {lat, lon}
  geo_point_2d?: { lat?: number; lon?: number } | string;
  [key: string]: unknown;
}

interface OdsResponse {
  total_count?: number;
  results?: OdsRecord[];
}

// ── Resolución de operatorId ───────────────────────────────────────────────────

async function resolveOperatorId(prisma: PrismaClient): Promise<string | null> {
  const byMdbId = await (prisma as any).transitOperator.findFirst({
    where: { mdbId: MDB_ID },
    select: { id: true },
  });
  if (byMdbId) return byMdbId.id as string;

  const byName = await (prisma as any).transitOperator.findFirst({
    where: { name: { contains: "EMT Valencia", mode: "insensitive" } },
    select: { id: true },
  });
  if (byName) {
    log(TASK, `Operador resuelto por nombre (mdbId ${MDB_ID} no encontrado)`);
    return byName.id as string;
  }

  // Segunda búsqueda más amplia por ciudad
  const byCity = await (prisma as any).transitOperator.findFirst({
    where: {
      city: { contains: "Valencia", mode: "insensitive" },
      mode: { contains: "bus", mode: "insensitive" },
    },
    select: { id: true },
  });
  if (byCity) {
    log(TASK, `Operador resuelto por ciudad+modo (mdbId ${MDB_ID} no encontrado)`);
    return byCity.id as string;
  }

  log(TASK, `AVISO: TransitOperator no encontrado (mdbId=${MDB_ID}, nombre="${OPERATOR_NAME}") — omitiendo feed`);
  return null;
}

// ── Parseo JSON → filas ───────────────────────────────────────────────────────

function parseRecords(
  records: OdsRecord[],
  operatorId: string,
  capturedAt: Date
): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = [];

  for (const record of records) {
    // Coordenadas: intentar geo_point_2d primero, luego latitud/longitud
    let lat: number | null = null;
    let lon: number | null = null;

    if (record.geo_point_2d) {
      if (typeof record.geo_point_2d === "object") {
        lat = Number(record.geo_point_2d.lat) || null;
        lon = Number(record.geo_point_2d.lon) || null;
      } else if (typeof record.geo_point_2d === "string") {
        const parts = record.geo_point_2d.split(",").map((s) => parseFloat(s.trim()));
        if (parts.length === 2) {
          lat = isNaN(parts[0]) ? null : parts[0];
          lon = isNaN(parts[1]) ? null : parts[1];
        }
      }
    }

    if (lat == null) lat = record.latitud != null ? Number(record.latitud) || null : null;
    if (lon == null) lon = record.longitud != null ? Number(record.longitud) || null : null;

    if (lat == null || lon == null) continue;
    if (lat === 0 && lon === 0) continue;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) continue;

    const vehicleId = String(record.idvehiculo ?? "").trim();
    if (!vehicleId) continue;

    const routeId = record.linea != null ? String(record.linea).trim() : null;

    // Velocidad en km/h (la fuente ya la devuelve en km/h)
    const speedKmhRaw = record.velocidad != null ? Number(record.velocidad) : null;
    const speedKmh = speedKmhRaw != null && !isNaN(speedKmhRaw) ? speedKmhRaw : null;
    // Convertimos a m/s para el campo legacy speed
    const speed = speedKmh != null ? Math.round((speedKmh / 3.6) * 10) / 10 : null;

    // Rumbo / sentido: algunos feeds Valencia exponen el ángulo de dirección
    const bearingRaw = record.sentido != null ? Number(record.sentido) : null;
    const bearing = bearingRaw != null && !isNaN(bearingRaw) ? bearingRaw : null;

    rows.push({
      operatorId,
      vehicleId,
      tripId: null,
      routeId,
      latitude: lat,
      longitude: lon,
      bearing,
      speed,
      speedKmh,
      occupancyStatus: null,
      scheduledTime: null,
      timestamp: capturedAt,
      capturedAt,
      fetchedAt: capturedAt,
    });
  }

  return rows;
}

// ── Fetch + inserción ─────────────────────────────────────────────────────────

async function pollOnce(prisma: PrismaClient, operatorId: string): Promise<number> {
  const capturedAt = new Date();

  let data: OdsResponse;
  try {
    const response = await fetch(FEED_URL, {
      headers: {
        "User-Agent": "trafico.live-collector/1.0",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    data = await response.json() as OdsResponse;
  } catch (err) {
    logError(TASK, "Error al obtener el feed JSON:", err);
    Sentry.captureException(err, { tags: { task: TASK } });
    return 0;
  }

  const records = data.results ?? [];

  if (records.length === 0) {
    log(TASK, `Feed devolvió 0 registros (total_count=${data.total_count ?? "desconocido"})`);
    return 0;
  }

  const rows = parseRecords(records, operatorId, capturedAt);

  if (rows.length === 0) {
    log(TASK, `${records.length} registros recibidos pero 0 posiciones válidas`);
    return 0;
  }

  try {
    await (prisma as any).transitVehiclePosition.createMany({
      data: rows,
      skipDuplicates: false,
    });
    log(TASK, `Escritas ${rows.length} posiciones de vehículos EMT Valencia`);
  } catch (err) {
    logError(TASK, "Error al insertar posiciones:", err);
    Sentry.captureException(err, { tags: { task: TASK } });
    return 0;
  }

  return rows.length;
}

// ── Punto de entrada ──────────────────────────────────────────────────────────

export async function run(prisma: PrismaClient): Promise<void> {
  log(TASK, "Iniciando colector de posiciones EMT Valencia (2 pases, intervalo 30s)");

  // Valencia no requiere credenciales, pero si el operador no existe en DB
  // no tiene sentido escribir filas sin FK válida.
  const operatorId = await resolveOperatorId(prisma);
  if (!operatorId) {
    log(TASK, "AVISO: Operador EMT Valencia no encontrado en BD — ejecutar transit-gtfs primero");
    await heartbeat(prisma, TASK, "ok", { skipped: true, reason: "operator_not_found" });
    return;
  }

  const startTime = Date.now();
  let totalWritten = 0;

  for (let pass = 1; pass <= 2; pass++) {
    const elapsed = Date.now() - startTime;
    if (elapsed >= DEADLINE_MS) {
      log(TASK, `Límite de tiempo (${DEADLINE_MS}ms) alcanzado antes del pase ${pass} — omitiendo`);
      break;
    }

    log(TASK, `Pase ${pass}/2`);
    const written = await pollOnce(prisma, operatorId);
    totalWritten += written;
    log(TASK, `Pase ${pass} completado — ${written} posiciones escritas`);

    if (pass < 2) {
      const passElapsed = Date.now() - startTime;
      const remaining = PASS_INTERVAL_MS - passElapsed;
      if (remaining > 0 && passElapsed + remaining < DEADLINE_MS) {
        await new Promise<void>((resolve) => setTimeout(resolve, remaining));
      }
    }
  }

  log(TASK, `Finalizado — total posiciones escritas: ${totalWritten}`);
  await heartbeat(prisma, TASK, "ok", { written: totalWritten });
}
