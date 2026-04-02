/**
 * Backfill HourlyTrafficProfile from existing TrafficIntensity data.
 *
 * Aggregates all raw sensor readings in the rolling 48h window into
 * hourly profile slots. Run once to bootstrap, or after gaps in collection.
 *
 * Safe to re-run: uses ON CONFLICT with weighted merge so existing
 * profiles are updated (not overwritten) with the new observations.
 */

import { PrismaClient } from "@prisma/client";
import { log, logError } from "../../shared/utils.js";

const TASK = "backfill-profiles";

export async function run(prisma: PrismaClient): Promise<void> {
  log(TASK, "Starting HourlyTrafficProfile backfill from raw intensity data");

  try {
    // Count available raw data
    const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM "TrafficIntensity"
      WHERE "source" = 'MADRID' AND "error" = false AND "intensity" > 0
    `;
    const rawCount = Number(countResult[0].count);
    log(TASK, `Found ${rawCount.toLocaleString()} valid raw readings to process`);

    if (rawCount === 0) {
      log(TASK, "No raw data available — nothing to backfill");
      return;
    }

    // Aggregate raw readings into (sensorId, dayOfWeek, hour) buckets
    // and merge into HourlyTrafficProfile using weighted average
    const result = await prisma.$executeRaw`
      INSERT INTO "HourlyTrafficProfile"
        ("id", "sensorId", "source", "dayOfWeek", "hour", "avgIntensity", "avgOccupancy", "avgServiceLevel", "sampleCount", "updatedAt")
      SELECT
        gen_random_uuid()::text,
        "sensorId",
        'MADRID',
        EXTRACT(DOW FROM "recordedAt" AT TIME ZONE 'Europe/Madrid')::int AS dow,
        EXTRACT(HOUR FROM "recordedAt" AT TIME ZONE 'Europe/Madrid')::int AS h,
        ROUND(AVG("intensity"))::int,
        ROUND(AVG("occupancy"))::int,
        ROUND(AVG("serviceLevel")::numeric, 2),
        COUNT(*)::int,
        NOW()
      FROM "TrafficIntensity"
      WHERE "source" = 'MADRID' AND "error" = false AND "intensity" > 0
      GROUP BY "sensorId", dow, h
      ON CONFLICT ("sensorId", "source", "dayOfWeek", "hour") DO UPDATE SET
        "avgIntensity" = ROUND(
          (
            "HourlyTrafficProfile"."avgIntensity" * "HourlyTrafficProfile"."sampleCount"
            + EXCLUDED."avgIntensity" * EXCLUDED."sampleCount"
          )::numeric / NULLIF("HourlyTrafficProfile"."sampleCount" + EXCLUDED."sampleCount", 0)
        )::int,
        "avgOccupancy" = ROUND(
          (
            COALESCE("HourlyTrafficProfile"."avgOccupancy", 0) * "HourlyTrafficProfile"."sampleCount"
            + COALESCE(EXCLUDED."avgOccupancy", 0) * EXCLUDED."sampleCount"
          )::numeric / NULLIF("HourlyTrafficProfile"."sampleCount" + EXCLUDED."sampleCount", 0)
        )::int,
        "avgServiceLevel" = ROUND(
          (
            "HourlyTrafficProfile"."avgServiceLevel" * "HourlyTrafficProfile"."sampleCount"
            + EXCLUDED."avgServiceLevel" * EXCLUDED."sampleCount"
          ) / NULLIF("HourlyTrafficProfile"."sampleCount" + EXCLUDED."sampleCount", 0), 2
        ),
        "sampleCount" = "HourlyTrafficProfile"."sampleCount" + EXCLUDED."sampleCount",
        "updatedAt" = NOW()
    `;

    log(TASK, `Backfill complete — ${result} profile rows upserted`);

    // Report coverage
    const coverage = await prisma.$queryRaw<[{ slots: bigint; sensors: bigint }]>`
      SELECT COUNT(DISTINCT ("dayOfWeek", "hour")) as slots,
             COUNT(DISTINCT "sensorId") as sensors
      FROM "HourlyTrafficProfile"
      WHERE "source" = 'MADRID'
    `;
    log(TASK, `Profile coverage: ${coverage[0].slots}/168 time slots, ${coverage[0].sensors} sensors`);

  } catch (error) {
    logError(TASK, "Backfill failed:", error);
    throw error;
  }
}
