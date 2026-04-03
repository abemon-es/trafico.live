"use client";

const TILES_BASE = "https://tiles.trafico.live";
const HEALTH_URL = `${TILES_BASE}/health`;
const CHECK_INTERVAL = 60_000;

let tileServerHealthy: boolean | null = null;
let lastCheck = 0;

/**
 * Check if tiles.trafico.live is reachable.
 * Result is cached for 60s to avoid hammering the health endpoint.
 */
export async function isTileServerHealthy(): Promise<boolean> {
  const now = Date.now();
  if (tileServerHealthy !== null && now - lastCheck < CHECK_INTERVAL) {
    return tileServerHealthy;
  }

  try {
    const res = await fetch(HEALTH_URL, {
      method: "HEAD",
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    tileServerHealthy = res.ok;
  } catch {
    tileServerHealthy = false;
  }
  lastCheck = now;
  return tileServerHealthy;
}

/** Reset health state (e.g., on map error) */
export function resetTileHealth(): void {
  tileServerHealthy = null;
  lastCheck = 0;
}
