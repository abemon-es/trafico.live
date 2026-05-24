/**
 * Colector GTFS-RT — Posiciones de vehículos: EMT Madrid (autobuses)
 *
 * Fuente: API OpenData EMT Madrid (GTFS-RT, protobuf binario)
 * URL:    https://openapi.emtmadrid.es/v2/transport/busemtmad/gtfs-rt/
 * Auth:   Cabeceras X-ClientId + passKey (credenciales gratuitas)
 *
 * Variables de entorno requeridas:
 *   EMT_MADRID_CLIENT_ID  — clientId del portal OpenData EMT
 *   EMT_MADRID_PASS_KEY   — passKey del portal OpenData EMT
 *
 * Registro: https://opendata.emtmadrid.es/
 *
 * Si las credenciales no están configuradas el colector registra un aviso
 * y termina sin error para que el dispatcher no lo marque como fallo.
 *
 * Cadencia: cada 30s (2 pases por invocación de cron de 1 minuto).
 * Filas estimadas: ~1.800–2.500 vehículos activos en hora punta.
 *
 * Fuente GTFS-RT: CC-BY 4.0, EMT Madrid / Ayuntamiento de Madrid.
 */

import * as Sentry from "@sentry/node";
import { PrismaClient } from "@prisma/client";
import { log, logError } from "../../shared/utils.js";
import { heartbeat } from "../../shared/heartbeat.js";
import { decodeVehiclePositions } from "../transit-rt-shared/parser.js";

const TASK = "transit-rt-madrid";

// ID estable de MobilityData para EMT Madrid
const MDB_ID = "mdb-1030";
const OPERATOR_NAME = "EMT Madrid";

// Endpoint GTFS-RT de posiciones de vehículos
const FEED_URL = "https://openapi.emtmadrid.es/v2/transport/busemtmad/gtfs-rt/";

const PASS_INTERVAL_MS = 30_000;
const DEADLINE_MS = 50_000;

// ── Resolución de operatorId ───────────────────────────────────────────────────

async function resolveOperatorId(prisma: PrismaClient): Promise<string | null> {
  // 1. Por mdbId (más fiable)
  const byMdbId = await (prisma as any).transitOperator.findFirst({
    where: { mdbId: MDB_ID },
    select: { id: true },
  });
  if (byMdbId) return byMdbId.id as string;

  // 2. Por nombre (fallback)
  const byName = await (prisma as any).transitOperator.findFirst({
    where: { name: { contains: "EMT Madrid", mode: "insensitive" } },
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
  const clientId = process.env.EMT_MADRID_CLIENT_ID;
  const passKey = process.env.EMT_MADRID_PASS_KEY;

  if (!clientId || !passKey) {
    log(TASK, "AVISO: EMT_MADRID_CLIENT_ID o EMT_MADRID_PASS_KEY no configurados — omitiendo pase");
    return 0;
  }

  const capturedAt = new Date();

  let buffer: ArrayBuffer;
  try {
    const response = await fetch(FEED_URL, {
      headers: {
        "User-Agent": "trafico.live-collector/1.0",
        "X-ClientId": clientId,
        passKey: passKey,
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
    log(TASK, `Escritas ${rows.length} posiciones de vehículos EMT Madrid`);
  } catch (err) {
    logError(TASK, "Error al insertar posiciones:", err);
    Sentry.captureException(err, { tags: { task: TASK } });
    return 0;
  }

  return rows.length;
}

// ── Punto de entrada ──────────────────────────────────────────────────────────

export async function run(prisma: PrismaClient): Promise<void> {
  log(TASK, "Iniciando colector de posiciones EMT Madrid (2 pases, intervalo 30s)");

  // Comprobar credenciales antes de hacer cualquier consulta
  if (!process.env.EMT_MADRID_CLIENT_ID || !process.env.EMT_MADRID_PASS_KEY) {
    log(TASK, "AVISO: EMT_MADRID_CLIENT_ID / EMT_MADRID_PASS_KEY no configurados — terminando sin error");
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
