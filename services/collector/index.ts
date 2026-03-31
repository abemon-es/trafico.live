/**
 * Unified Collector Dispatcher
 *
 * Reads the TASK env var and runs the corresponding collector.
 * Each collector exports a run() function.
 */
import { getPrisma, getPool } from "./shared/prisma.js";

const TASK = process.env.TASK;

if (!TASK) {
  console.error("TASK environment variable is required. Valid tasks: v16, incident, panel, weather, camera, radar, charger, speedlimit, insights, gas-station, historical-accidents, imd");
  process.exit(1);
}

const VALID_TASKS = ["v16", "incident", "panel", "weather", "camera", "radar", "charger", "speedlimit", "insights", "gas-station", "historical-accidents", "imd"];

if (!VALID_TASKS.includes(TASK)) {
  console.error(`Unknown task: ${TASK}. Valid tasks: ${VALID_TASKS.join(", ")}`);
  process.exit(1);
}

async function main() {
  const startTime = Date.now();
  console.log(`[dispatcher] Starting task: ${TASK} at ${new Date().toISOString()}`);

  try {
    const prisma = getPrisma();

    // Dynamic import of the task module
    const taskModule = await import(`./tasks/${TASK}/collector.js`);
    await taskModule.run(prisma);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[dispatcher] Task ${TASK} completed in ${elapsed}s`);
  } catch (error) {
    console.error(`[dispatcher] Task ${TASK} failed:`, error);
    process.exit(1);
  } finally {
    const pool = getPool();
    if (pool) {
      await pool.end().catch(() => {});
    }
  }
}

main();
