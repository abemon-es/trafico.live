/**
 * What the AQForecast rows really are, read from the cams-aq heartbeat.
 *
 * The collector writes a CAMS forecast for a gridpoint when CAMS answers, and
 * otherwise the latest MITECO reading repeated over the five days
 * («persistence»), which is not a forecast. The table has no source column,
 * so the run's counts in the heartbeat meta (`meta.sources`, since
 * 2026-10-24) are the only record. Until then every row was persistence while
 * /calidad-aire/prevision and /api/calidad-aire/forecast said «CAMS».
 *
 * Fail closed: CAMS is claimed only when the last run got it for every
 * gridpoint with data and that run is fresh (within cams-aq's staleness
 * threshold). No heartbeat, no counts (a run before 2026-10-24), any
 * persistence point or a stale run → not CAMS. The page's noindex and its
 * sitemap entry hang off this same answer (CMO, 2026-10-24), so the page
 * goes back to the index on its own the day CAMS arrives.
 */

import { STALE_THRESHOLDS } from "./collector-thresholds";

export const CAMS_SOURCE = "Copernicus Atmosphere Monitoring Service (CAMS) / ECMWF";
export const PERSISTENCE_SOURCE =
  "MITECO, Índice de calidad del aire (ica.miteco.es, CC-BY 4.0): última medición repetida, no es un pronóstico";

export interface AqForecastSource {
  cams: boolean;
  camsPoints: number;
  persistencePoints: number;
  /** For an API `source` field or a footer. */
  label: string;
}

const count = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0);

export function aqForecastSource(
  meta: unknown,
  lastSuccessAt: Date | null | undefined,
  now: number = Date.now()
): AqForecastSource {
  const sources =
    meta !== null && typeof meta === "object" && !Array.isArray(meta)
      ? (meta as { sources?: unknown }).sources
      : undefined;
  const s = sources !== null && typeof sources === "object" ? (sources as Record<string, unknown>) : {};
  const camsPoints = count(s.cams);
  const persistencePoints = count(s.persistence);
  const threshold = (STALE_THRESHOLDS["cams-aq"] ?? STALE_THRESHOLDS["_default"]) * 1000;
  const fresh = lastSuccessAt != null && now - lastSuccessAt.getTime() <= threshold;
  const cams = fresh && camsPoints > 0 && persistencePoints === 0;
  return { cams, camsPoints, persistencePoints, label: cams ? CAMS_SOURCE : PERSISTENCE_SOURCE };
}
