/**
 * post-hook.ts — Remote PMTiles regeneration trigger for GTFS collectors
 *
 * Fires a webhook to the tile host after a GTFS collector run so that the
 * relevant PMTiles files are rebuilt automatically without manual intervention.
 *
 * ## Integration
 *
 * To wire this into a collector, add at the end of collector.ts:
 *
 *   import { triggerPmtilesRegen, layersForTask } from "./post-hook.js";
 *   // ... inside run(), before returning:
 *   await triggerPmtilesRegen(layersForTask("transit-gtfs"));
 *
 * The leader (agent A1 / whoever owns collector.ts) should add the import and
 * call. Do NOT edit collector.ts from within this file.
 *
 * For ferry-gtfs and renfe-gtfs: the same pattern applies — import this module
 * and call `triggerPmtilesRegen(layersForTask("ferry-gtfs"))` or
 * `triggerPmtilesRegen(layersForTask("renfe-gtfs"))` at the end of their
 * respective collector run() functions. Do NOT edit those files here.
 *
 * ## Environment variables required (in docker-compose.collectors.yml)
 *
 *   PMTILES_REGEN_WEBHOOK_URL  — Full URL of the webhook listener on the tile
 *                                host (e.g. http://tiles-host:9000/regen).
 *                                If unset the hook is a no-op (safe for dev).
 *   PMTILES_REGEN_TOKEN        — Bearer token the webhook listener validates.
 *                                Must match the secret configured on the tile
 *                                host side. Leave unset in dev (no-op anyway).
 */

import * as Sentry from "@sentry/node";
import { log, logError } from "../../shared/utils.js";

const TASK = "post-gtfs-hook";

// ---------------------------------------------------------------------------
// Layer mapping
// ---------------------------------------------------------------------------

type GtfsTask = "transit-gtfs" | "ferry-gtfs" | "renfe-gtfs";

/**
 * Returns the --layer= values that generate-pmtiles.sh expects for the given
 * GTFS collector task.
 *
 * transit-gtfs includes portugal-gas because the PortugalGasStation table is
 * populated by the Portugal fuel collector which shares the weekly cadence;
 * regenerating in the same pass avoids a separate trigger.
 */
export function layersForTask(task: GtfsTask): string[] {
  switch (task) {
    case "transit-gtfs":
      return ["transit-stops", "transit-routes", "portugal-gas"];
    case "ferry-gtfs":
      return ["ferry-stops", "ferry-routes"];
    case "renfe-gtfs":
      return ["railway-stations", "railway-routes"];
  }
}

// ---------------------------------------------------------------------------
// Webhook trigger
// ---------------------------------------------------------------------------

/**
 * Fires a POST request to the PMTiles regen webhook with the given layer
 * names. The webhook consumer (post-gtfs-hook.sh on the tile host) will call
 * generate-pmtiles.sh with the matching --layer= flags.
 *
 * Design rules:
 * - 10 s hard timeout — tiles regen is async on the host side, we only need
 *   the webhook to be accepted (2xx).
 * - Any error is captured to Sentry and logged, but NEVER re-thrown.
 *   A tiles regen failure must not fail the collector run.
 * - If PMTILES_REGEN_WEBHOOK_URL is not set (dev/local), log a WARN and skip.
 */
export async function triggerPmtilesRegen(layers: string[]): Promise<void> {
  const webhookUrl = process.env.PMTILES_REGEN_WEBHOOK_URL;

  if (!webhookUrl) {
    log(
      TASK,
      "WARN: PMTILES_REGEN_WEBHOOK_URL not set — skipping tile regen trigger (no-op in dev)"
    );
    return;
  }

  const token = process.env.PMTILES_REGEN_TOKEN ?? "";
  const body = JSON.stringify({ layers });

  log(TASK, `Triggering PMTiles regen for layers: ${layers.join(", ")}`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    let response: Response;
    try {
      response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "(unreadable body)");
      throw new Error(
        `Webhook responded ${response.status} ${response.statusText}: ${text}`
      );
    }

    log(TASK, `Regen webhook accepted (${response.status}) — tiles will rebuild on tile host`);
  } catch (err) {
    logError(TASK, "ERROR: Failed to trigger PMTiles regen webhook — continuing anyway", err);
    try {
      Sentry.captureException(err, {
        tags: { task: TASK, layers: layers.join(",") },
        extra: { webhookUrl },
      });
    } catch {
      // Sentry may not be initialised (e.g. collector task runs standalone)
    }
  }
}
