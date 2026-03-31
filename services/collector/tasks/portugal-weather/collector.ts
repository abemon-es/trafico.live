/**
 * Portugal Weather Alerts Collector
 *
 * Fetches weather warnings from IPMA (Instituto Português do Mar e da Atmosfera).
 * No authentication required. JSON format, CORS enabled.
 *
 * API: https://api.ipma.pt/open-data/forecast/warnings/warnings_www.json
 * Updates: Continuous (warnings issued/lifted as needed)
 */

import { PrismaClient } from "@prisma/client";
import { log, logError } from "../../shared/utils.js";

const TASK = "portugal-weather";
const IPMA_WARNINGS_URL = "https://api.ipma.pt/open-data/forecast/warnings/warnings_www.json";

// IPMA area codes → Portuguese district/island group names
const IPMA_AREAS: Record<string, string> = {
  AVR: "Aveiro",
  BEJ: "Beja",
  BGC: "Bragança",
  BRG: "Braga",
  CBR: "Coimbra",
  CTB: "Castelo Branco",
  EVR: "Évora",
  FAR: "Faro",
  GDA: "Guarda",
  LRA: "Leiria",
  LSB: "Lisboa",
  PTG: "Portalegre",
  PTO: "Porto",
  SAG: "Sagres",
  STR: "Santarém",
  STB: "Setúbal",
  VCT: "Viana do Castelo",
  VIS: "Viseu",
  VRL: "Vila Real",
  MPS: "Madeira - Porto Santo",
  MCS: "Madeira - Costa Sul",
  MCN: "Madeira - Costa Norte",
  AOR: "Açores - Grupo Oriental",
  ACE: "Açores - Grupo Central",
  AOC: "Açores - Grupo Ocidental",
};

interface IPMAWarning {
  text: string;
  awarenessTypeName: string;
  startTime: string;
  endTime: string;
  idAreaAviso: string;
  awarenessLevel: string; // green, yellow, orange, red
}

function sanitize(str: string): string {
  return str.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 50);
}

function buildAlertId(warning: IPMAWarning): string {
  const area = warning.idAreaAviso || "UNK";
  const type = sanitize(warning.awarenessTypeName || "other");
  const time = warning.startTime?.replace(/[^0-9T]/g, "").substring(0, 15) || "notime";
  return `IPMA-${area}-${type}-${time}`;
}

export async function run(prisma: PrismaClient) {
  const now = new Date();
  log(TASK, `Starting at ${now.toISOString()}`);

  try {
    // Fetch IPMA warnings
    const response = await fetch(IPMA_WARNINGS_URL, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`IPMA API error: ${response.status} ${response.statusText}`);
    }

    const data: unknown = await response.json();

    if (!Array.isArray(data)) {
      log(TASK, "Response is not an array, skipping");
      return;
    }

    const warnings = data as IPMAWarning[];
    log(TASK, `Fetched ${warnings.length} warnings`);

    if (warnings.length === 0) {
      log(TASK, "No active warnings");
      return;
    }

    // Process warnings
    let upserted = 0;
    let skipped = 0;

    for (const warning of warnings) {
      // Skip warnings without required fields
      if (!warning.idAreaAviso || !warning.awarenessTypeName || !warning.startTime) {
        skipped++;
        continue;
      }

      const startedAt = new Date(warning.startTime);
      const endedAt = warning.endTime ? new Date(warning.endTime) : undefined;

      // Validate dates
      if (isNaN(startedAt.getTime())) {
        skipped++;
        continue;
      }

      const alertId = buildAlertId(warning);
      const areaCode = warning.idAreaAviso;
      const areaName = IPMA_AREAS[areaCode] || areaCode;

      try {
        await prisma.portugalWeatherAlert.upsert({
          where: { alertId },
          create: {
            alertId,
            type: warning.awarenessTypeName || "Outro",
            severity: (warning.awarenessLevel || "unknown").toLowerCase(),
            areaCode,
            areaName,
            startedAt,
            endedAt: endedAt && !isNaN(endedAt.getTime()) ? endedAt : undefined,
            description: warning.text || undefined,
            isActive: true,
            fetchedAt: now,
          },
          update: {
            severity: (warning.awarenessLevel || "unknown").toLowerCase(),
            endedAt: endedAt && !isNaN(endedAt.getTime()) ? endedAt : undefined,
            description: warning.text || undefined,
            isActive: true,
            fetchedAt: now,
          },
        });
        upserted++;
      } catch (error) {
        logError(TASK, `Error processing alert ${alertId}`, error);
        skipped++;
      }
    }

    log(TASK, `Processed: ${upserted} upserted, ${skipped} skipped`);

    // Deactivate expired alerts
    const expiredResult = await prisma.portugalWeatherAlert.updateMany({
      where: {
        isActive: true,
        OR: [
          { endedAt: { lt: now } },
          { fetchedAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
        ],
      },
      data: { isActive: false },
    });

    if (expiredResult.count > 0) {
      log(TASK, `Deactivated ${expiredResult.count} expired alerts`);
    }

    // Log summary by severity
    const stats = await prisma.portugalWeatherAlert.groupBy({
      by: ["severity", "isActive"],
      _count: true,
    });

    log(TASK, "Current stats:");
    for (const stat of stats) {
      log(TASK, `  ${stat.severity} (${stat.isActive ? "active" : "inactive"}): ${stat._count}`);
    }
  } catch (error) {
    logError(TASK, "Fatal error", error);
    throw error;
  }

  log(TASK, `Finished at ${new Date().toISOString()}`);
}
