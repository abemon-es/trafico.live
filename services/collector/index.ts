/**
 * Unified Collector Dispatcher
 *
 * Reads the TASK env var and runs the corresponding collector.
 * Each collector exports a run() function.
 *
 * After certain data collectors finish, relevant insight generators
 * are triggered automatically so reports always reflect fresh data.
 */
import * as Sentry from "@sentry/node";
import { getPrisma, getPool } from "./shared/prisma.js";

// Initialize Sentry for collector error tracking
// GlitchTip uses UUID keys with hyphens; Sentry SDK requires \w+ — strip hyphens
const SENTRY_DSN = process.env.SENTRY_DSN?.replace(
  /\/\/([0-9a-f-]+)@/,
  (_, key: string) => `//${key.replace(/-/g, "")}@`
);
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || "production",
    tracesSampleRate: 0.1,
  });
}

const TASK = process.env.TASK;

const VALID_TASKS = [
  // Real-time (every 2-5 min)
  "v16", "incident", "panel", "detector", "intensity",
  // Frequent (6h-daily)
  "weather", "maritime-forecast", "camera", "radar", "charger", "gas-station", "maritime-fuel",
  // Infrequent (weekly)
  "speedlimit", "risk-zones", "zbe",
  // Content generation
  "insights",
  // International
  "andorra", "portugal-weather", "portugal-fuel",
  // Railway
  "renfe-gtfs", "renfe-alerts", "renfe-ld-realtime",
  // Analytics & Historical
  "cnmc-fuel", "aemet-historical", "mobility-od", "accident-microdata",
  // Aggregation
  "daily-stats",
  // One-shot / manual
  "historical-accidents", "imd", "sasemar",
  // Search index
  "typesense-sync",
];

if (!TASK) {
  console.error(`TASK environment variable is required. Valid tasks: ${VALID_TASKS.join(", ")}`);
  process.exit(1);
}

if (!VALID_TASKS.includes(TASK)) {
  console.error(`Unknown task: ${TASK}. Valid tasks: ${VALID_TASKS.join(", ")}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Post-ingestion insight triggers
//
// Instead of running all insights on a fixed cron, we chain specific
// generators after the data collector that feeds them. Each generator
// is idempotent (checks slug existence), so duplicate triggers are safe.
// ---------------------------------------------------------------------------

type InsightTrigger = {
  name: string;
  fn: (prisma: import("@prisma/client").PrismaClient) => Promise<number>;
};

async function getPostIngestionTriggers(task: string): Promise<InsightTrigger[]> {
  // Only import generators when actually needed (after a relevant collector)
  const generatorModule = () => import("./tasks/insights/generators/index.js");

  switch (task) {
    case "gas-station": {
      // Fuel prices just updated → trigger fuel-related reports
      const g = await generatorModule();
      return [
        { name: "daily-fuel", fn: g.generateDailyFuelReport },
        { name: "weekly-price-ranking", fn: g.generateWeeklyPriceRanking },
        { name: "monthly-fuel", fn: g.generateMonthlyFuelReport },
      ];
    }
    case "v16": {
      // DailyStats/HourlyStats just updated → trigger traffic reports + weekly digest
      const g = await generatorModule();
      return [
        { name: "daily-report", fn: g.generateDailyReport },
        { name: "weekly-report", fn: g.generateWeeklyReport },
        { name: "incident-spike", fn: g.generateEnhancedIncidentSpike },
        { name: "monthly-accidents", fn: g.generateMonthlyAccidentReport },
        { name: "weekly-digest", fn: g.sendWeeklyDigest }, // Monday: sends email after weekly report
      ];
    }
    case "weather": {
      // Weather alerts just updated → trigger weather alert report
      const g = await generatorModule();
      return [
        { name: "weather-alert", fn: g.generateEnhancedWeatherAlert },
      ];
    }
    case "historical-accidents": {
      // Historical data just loaded → generate annual reports
      const g = await generatorModule();
      return [
        { name: "annual-accidents", fn: g.generateAnnualAccidentReports },
      ];
    }
    case "imd": {
      // IMD data just loaded → generate road analyses
      const g = await generatorModule();
      return [
        { name: "road-imd", fn: g.generateRoadIMDAnalyses },
      ];
    }
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// Post-ingestion Typesense sync
// ---------------------------------------------------------------------------

const TYPESENSE_SYNC_MAP: Record<string, string[]> = {
  "gas-station": ["gas_stations"],
  "maritime-fuel": ["maritime_stations"],
  camera: ["cameras"],
  charger: ["ev_chargers"],
  radar: ["radars"],
  panel: ["variable_panels"],
  "risk-zones": ["risk_zones"],
  zbe: ["zbe_zones"],
  "renfe-gtfs": ["railway_stations", "railway_routes"],
  "renfe-alerts": ["railway_alerts"],
  imd: ["traffic_stations"],
  insights: ["articles"],
  incident: ["incidents"],
  v16: ["incidents"],
  weather: ["weather_alerts"],
};

async function runTypesenseSync(
  prisma: import("@prisma/client").PrismaClient,
  collections: string[]
): Promise<void> {
  if (!process.env.TYPESENSE_URL || !process.env.TYPESENSE_API_KEY) return;
  for (const collection of collections) {
    try {
      const savedCol = process.env.SYNC_COLLECTION;
      const savedMode = process.env.SYNC_MODE;
      process.env.SYNC_COLLECTION = collection;
      process.env.SYNC_MODE = "incremental";
      const mod = await import("./tasks/typesense-sync/collector.js");
      await mod.run(prisma);
      if (savedCol) process.env.SYNC_COLLECTION = savedCol;
      else delete process.env.SYNC_COLLECTION;
      if (savedMode) process.env.SYNC_MODE = savedMode;
      else delete process.env.SYNC_MODE;
    } catch (error) {
      console.error(`[dispatcher] Typesense sync ${collection} failed:`, error);
      Sentry.captureException(error, {
        tags: { task: TASK!, typesenseCollection: collection, layer: "collector" },
      });
    }
  }
}

async function main() {
  const startTime = Date.now();
  console.log(`[dispatcher] Starting task: ${TASK} at ${new Date().toISOString()}`);

  try {
    const prisma = getPrisma();

    // Run the primary collector
    const taskModule = await import(`./tasks/${TASK}/collector.js`);
    await taskModule.run(prisma);

    const collectorElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[dispatcher] Task ${TASK} completed in ${collectorElapsed}s`);

    // Run post-ingestion insight triggers (if any)
    const triggers = await getPostIngestionTriggers(TASK!);
    if (triggers.length > 0) {
      console.log(`[dispatcher] Running ${triggers.length} post-ingestion insight triggers...`);
      const results = await Promise.allSettled(
        triggers.map((t) => t.fn(prisma))
      );
      let created = 0;
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        if (r.status === "fulfilled") {
          created += r.value;
          if (r.value > 0) console.log(`[dispatcher] Trigger ${triggers[i].name}: created ${r.value} article(s)`);
        } else {
          console.error(`[dispatcher] Trigger ${triggers[i].name} failed:`, r.reason);
          Sentry.captureException(r.reason, {
            tags: { task: TASK!, trigger: triggers[i].name, layer: "collector" },
          });
        }
      }
      if (created > 0) {
        console.log(`[dispatcher] Post-ingestion: ${created} total articles created`);
      }
    }

    // Run post-ingestion Typesense sync
    const tsCollections = TYPESENSE_SYNC_MAP[TASK!];
    if (tsCollections) {
      console.log(`[dispatcher] Syncing Typesense: ${tsCollections.join(", ")}...`);
      await runTypesenseSync(prisma, tsCollections);
    }

    const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    if (triggers.length > 0 || tsCollections) {
      console.log(`[dispatcher] Total (collector + triggers): ${totalElapsed}s`);
    }
  } catch (error) {
    console.error(`[dispatcher] Task ${TASK} failed:`, error);
    Sentry.captureException(error, {
      tags: { task: TASK!, layer: "collector" },
    });
    await Sentry.flush(2000);
    process.exit(1);
  } finally {
    const pool = getPool();
    if (pool) {
      await pool.end().catch(() => {});
    }
  }
}

main();
