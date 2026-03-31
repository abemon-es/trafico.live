/**
 * Weather Collector Service
 *
 * Fetches weather alerts from AEMET that could impact traffic.
 * Stores them in the WeatherAlert table for correlation with incidents.
 *
 * @deprecated Use unified collector: services/collector/ with TASK=weather
 */

import { PrismaClient, WeatherAlertType as PrismaWeatherAlertType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { fetchAEMETAlerts, AEMETAlert, WeatherAlertType } from "./aemet-parser.js";

// Map parser types to Prisma enum
const TYPE_MAP: Record<WeatherAlertType, PrismaWeatherAlertType> = {
  RAIN: "RAIN",
  SNOW: "SNOW",
  ICE: "ICE",
  FOG: "FOG",
  WIND: "WIND",
  TEMPERATURE: "TEMPERATURE",
  STORM: "STORM",
  COASTAL: "COASTAL",
  OTHER: "OTHER",
};

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const aemetApiKey = process.env.AEMET_API_KEY;
  if (!aemetApiKey) {
    console.warn("[weather-collector] AEMET_API_KEY not set, skipping weather collection");
    return;
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const now = new Date();
  console.log(`[weather-collector] Starting at ${now.toISOString()}`);

  try {
    // Fetch weather alerts from AEMET
    const alerts = await fetchAEMETAlerts(aemetApiKey);
    console.log(`[weather-collector] Fetched ${alerts.length} alerts`);

    if (alerts.length === 0) {
      console.log("[weather-collector] No alerts to process");
      return;
    }

    // Batch upsert alerts
    let created = 0;
    let updated = 0;

    for (const alert of alerts) {
      try {
        await prisma.weatherAlert.upsert({
          where: { alertId: alert.alertId },
          create: {
            alertId: alert.alertId,
            type: TYPE_MAP[alert.type],
            severity: alert.severity,
            province: alert.province,
            provinceName: alert.provinceName,
            startedAt: alert.startedAt,
            endedAt: alert.endedAt,
            fetchedAt: now,
            description: alert.description,
            isActive: true,
          },
          update: {
            endedAt: alert.endedAt,
            fetchedAt: now,
            description: alert.description,
            isActive: true,
          },
        });
        created++;
      } catch (error) {
        console.error(`[weather-collector] Error processing alert ${alert.alertId}:`, error);
      }
    }

    console.log(`[weather-collector] Processed ${created} alerts`);

    // Deactivate expired alerts
    const expiredResult = await prisma.weatherAlert.updateMany({
      where: {
        isActive: true,
        OR: [
          { endedAt: { lt: now } },
          { fetchedAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } }, // Not seen in 24h
        ],
      },
      data: { isActive: false },
    });

    if (expiredResult.count > 0) {
      console.log(`[weather-collector] Deactivated ${expiredResult.count} expired alerts`);
    }

    // Log summary
    const stats = await prisma.weatherAlert.groupBy({
      by: ["type", "isActive"],
      _count: true,
    });

    console.log("[weather-collector] Current stats:");
    for (const stat of stats) {
      console.log(`  ${stat.type} (${stat.isActive ? "active" : "inactive"}): ${stat._count}`);
    }

  } catch (error) {
    console.error("[weather-collector] Fatal error:", error);
    process.exit(1);
  }

  console.log(`[weather-collector] Finished at ${new Date().toISOString()}`);
}

main();
