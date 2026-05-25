/**
 * Colector de posiciones de vehículos: EMT Valencia (autobuses)
 *
 * Fuente: Geoportal Valencia — ArcGIS REST MapServer/384 (layer EMT/Seguimiento_EMT)
 * URL:    https://geoportal.valencia.es/server/rest/services/EMT/Seguimiento_EMT/MapServer/384/query
 * Auth:   Sin autenticación (CC BY 4.0, Ajuntament de València / EMT València)
 *
 * NOTA HISTÓRICA: La fuente anterior (valencia.opendatasoft.com — dataset
 * `emt-tiempo-real`) fue retirada por el ayuntamiento en 2026-Q1. La actualización
 * a geoportal layer 384 mantiene el mismo esquema TransitVehiclePosition y devuelve
 * ~275 autobuses activos en tiempo real con cadencia de segundos.
 *
 * Campos ArcGIS mapeados:
 *   gid           → vehicleId
 *   linea         → routeId
 *   trayecto      → metadata extra (no persistido)
 *   geometry.x/y  → longitude/latitude (forzamos outSR=4326 → WGS84)
 *   fecha         → timestamp (ms epoch)
 *
 * Cadencia: cada 30s (2 pases por invocación de cron de 1 minuto).
 * Filas estimadas: ~250–350 vehículos activos según el horario.
 */

import * as Sentry from "@sentry/node";
import { PrismaClient } from "@prisma/client";
import { log, logError } from "../../shared/utils.js";
import { heartbeat } from "../../shared/heartbeat.js";

const TASK = "transit-rt-valencia";

// MobilityData ID para EMT Valencia (operador de autobús urbano)
const MDB_ID = "mdb-1064";
const OPERATOR_NAME = "EMT Valencia";

// Geoportal Valencia ArcGIS REST — sin autenticación, salida JSON ArcGIS estándar
// outSR=4326 fuerza WGS84 en lugar de la proyección nativa ETRS89 UTM 30N.
const FEED_URL =
  "https://geoportal.valencia.es/server/rest/services/EMT/Seguimiento_EMT/MapServer/384/query" +
  "?where=1%3D1&outFields=gid,linea,trayecto,fecha&outSR=4326&f=json";

const PASS_INTERVAL_MS = 30_000;
const DEADLINE_MS = 50_000;

// ── Tipos del JSON de respuesta ArcGIS ─────────────────────────────────────────

interface ArcGisFeature {
  attributes?: {
    gid?: string | number;
    linea?: string | number;
    trayecto?: string;
    fecha?: number; // ms epoch
    [key: string]: unknown;
  };
  geometry?: {
    x?: number; // longitude (cuando outSR=4326)
    y?: number; // latitude  (cuando outSR=4326)
  };
}

interface ArcGisResponse {
  features?: ArcGisFeature[];
  error?: { code?: number; message?: string };
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

function parseFeatures(
  features: ArcGisFeature[],
  operatorId: string,
  capturedAt: Date
): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = [];

  for (const feature of features) {
    const attrs = feature.attributes ?? {};
    const geom = feature.geometry;

    // ArcGIS con outSR=4326 devuelve x=lon, y=lat (no al revés)
    const lon = geom?.x != null ? Number(geom.x) : null;
    const lat = geom?.y != null ? Number(geom.y) : null;
    if (lat == null || lon == null) continue;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (lat === 0 && lon === 0) continue;
    // Sanity check: Valencia metropolitana
    if (lat < 39.0 || lat > 40.0 || lon < -0.8 || lon > 0.2) continue;

    const vehicleId = String(attrs.gid ?? "").trim();
    if (!vehicleId) continue;

    const routeId = attrs.linea != null ? String(attrs.linea).trim() : null;

    // La fuente ArcGIS no expone velocidad ni rumbo
    const timestamp =
      typeof attrs.fecha === "number" && attrs.fecha > 0
        ? new Date(attrs.fecha)
        : capturedAt;

    rows.push({
      operatorId,
      vehicleId,
      tripId: null,
      routeId,
      latitude: lat,
      longitude: lon,
      bearing: null,
      speed: null,
      speedKmh: null,
      occupancyStatus: null,
      scheduledTime: null,
      timestamp,
      capturedAt,
      fetchedAt: capturedAt,
    });
  }

  return rows;
}

// ── Fetch + inserción ─────────────────────────────────────────────────────────

async function pollOnce(prisma: PrismaClient, operatorId: string): Promise<number> {
  const capturedAt = new Date();

  let data: ArcGisResponse;
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

    data = await response.json() as ArcGisResponse;
    if (data.error) {
      throw new Error(`ArcGIS error ${data.error.code ?? "?"}: ${data.error.message ?? "unknown"}`);
    }
  } catch (err) {
    logError(TASK, "Error al obtener el feed ArcGIS:", err);
    Sentry.captureException(err, { tags: { task: TASK } });
    return 0;
  }

  const features = data.features ?? [];

  if (features.length === 0) {
    log(TASK, `Feed devolvió 0 features (probable: sin vehículos activos)`);
    return 0;
  }

  const rows = parseFeatures(features, operatorId, capturedAt);

  if (rows.length === 0) {
    log(TASK, `${features.length} features recibidos pero 0 posiciones válidas`);
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
