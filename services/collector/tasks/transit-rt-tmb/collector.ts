/**
 * Colector GTFS-RT — Posiciones de vehículos: TMB Barcelona (metro + autobús)
 *
 * Fuente: API TMB Open Data (GTFS-RT, protobuf binario)
 * URL:    https://api.tmb.cat/v1/transit/gtfs-rt/vehicle-positions?app_id=...&app_key=...
 * Auth:   Parámetros de consulta app_id + app_key (credenciales gratuitas)
 *
 * Variables de entorno requeridas:
 *   TMB_APP_ID   — app_id del portal TMB developer
 *   TMB_APP_KEY  — app_key del portal TMB developer
 *
 * Registro: https://developer.tmb.cat/
 *
 * Si las credenciales no están configuradas el colector registra un aviso
 * y termina sin error para que el dispatcher no lo marque como fallo.
 *
 * Cadencia: cada 30s (2 pases por invocación de cron de 1 minuto).
 * Filas estimadas: ~800–1.500 vehículos activos (metro + autobús).
 *
 * Fuente GTFS-RT: Transports Metropolitans de Barcelona (TMB).
 */

import * as Sentry from "@sentry/node";
import { PrismaClient } from "@prisma/client";
import { log, logError } from "../../shared/utils.js";
import { heartbeat } from "../../shared/heartbeat.js";
import { decodeVehiclePositions } from "../transit-rt-shared/parser.js";

const TASK = "transit-rt-tmb";

// ID estable de MobilityData para TMB Barcelona
const MDB_ID = "mdb-1052";
const OPERATOR_NAME = "TMB Barcelona";

const PASS_INTERVAL_MS = 30_000;
const DEADLINE_MS = 50_000;

// ── URL del feed (construida en tiempo de ejecución para leer env vars tarde) ──

function buildFeedUrl(): string {
  const appId = process.env.TMB_APP_ID ?? "";
  const appKey = process.env.TMB_APP_KEY ?? "";
  return `https://api.tmb.cat/v1/transit/gtfs-rt/vehicle-positions?app_id=${appId}&app_key=${appKey}`;
}

// ── Resolución de operatorId ───────────────────────────────────────────────────

async function resolveOperatorId(prisma: PrismaClient): Promise<string | null> {
  const byMdbId = await (prisma as any).transitOperator.findFirst({
    where: { mdbId: MDB_ID },
    select: { id: true },
  });
  if (byMdbId) return byMdbId.id as string;

  const byName = await (prisma as any).transitOperator.findFirst({
    where: { name: { contains: "TMB", mode: "insensitive" } },
    select: { id: true },
  });
  if (byName) {
    log(TASK, `Operador resuelto por nombre (mdbId ${MDB_ID} no encontrado)`);
    return byName.id as string;
  }

  log(TASK, `AVISO: TransitOperator no encontrado (mdbId=${MDB_ID}, nombre="${OPERATOR_NAME}") — omitiendo feed`);
  return null;
}

// ── Fetch + inserción ─────────────────────────────────────────────────────────

async function pollOnce(prisma: PrismaClient, operatorId: string): Promise<number> {
  const capturedAt = new Date();

  let buffer: ArrayBuffer;
  try {
    const response = await fetch(buildFeedUrl(), {
      headers: {
        "User-Agent": "trafico.live-collector/1.0",
        Accept: "application/x-protobuf, application/octet-stream, */*",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    buffer = await response.arrayBuffer();
  } catch (err) {
    logError(TASK, "Error al obtener el feed GTFS-RT:", err);
    Sentry.captureException(err, { tags: { task: TASK } });
    return 0;
  }

  const rows = decodeVehiclePositions(buffer, operatorId, capturedAt);

  if (rows.length === 0) {
    log(TASK, "Feed devolvió 0 posiciones válidas");
    return 0;
  }

  try {
    await (prisma as any).transitVehiclePosition.createMany({
      data: rows,
      skipDuplicates: false,
    });
    log(TASK, `Escritas ${rows.length} posiciones de vehículos TMB Barcelona`);
  } catch (err) {
    logError(TASK, "Error al insertar posiciones:", err);
    Sentry.captureException(err, { tags: { task: TASK } });
    return 0;
  }

  return rows.length;
}

// ── Punto de entrada ──────────────────────────────────────────────────────────

export async function run(prisma: PrismaClient): Promise<void> {
  log(TASK, "Iniciando colector de posiciones TMB Barcelona (2 pases, intervalo 30s)");

  if (!process.env.TMB_APP_ID || !process.env.TMB_APP_KEY) {
    log(TASK, "AVISO: TMB_APP_ID / TMB_APP_KEY no configurados — terminando sin error");
    await heartbeat(prisma, TASK, "ok", { skipped: true, reason: "missing_credentials" });
    return;
  }

  const operatorId = await resolveOperatorId(prisma);
  if (!operatorId) {
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
