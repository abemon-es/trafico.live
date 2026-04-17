/**
 * Transit Realtime Feed Configuration
 *
 * Defines the GTFS-RT VehiclePositions feeds for major Spanish urban operators.
 * Each feed entry declares the endpoint, authentication headers, MobilityData ID,
 * and whether the feed is currently active.
 *
 * Auth keys are read from env vars at runtime (not at module load time) so that
 * missing keys produce WARN logs rather than hard errors at startup.
 *
 * Endpoints:
 *   EMT Madrid:       https://openapi.emtmadrid.es/v2/transport/busemtmad/gtfs-rt/
 *                     Requires OAuth2 clientId + passKey headers.
 *                     Env: EMT_MADRID_CLIENT_ID, EMT_MADRID_PASS_KEY
 *
 *   TMB Barcelona:    https://api.tmb.cat/v1/transit/gtfs-rt/vehicle-positions
 *                     Requires app_id + app_key query params.
 *                     Env: TMB_APP_ID, TMB_APP_KEY
 *
 *   Metro de Madrid:  No public GTFS-RT feed available as of 2026.
 *                     TODO: Monitor https://www.metromadrid.es/es/open-data for future release.
 *                     Placeholder entry, enabled: false.
 */

export type RealtimeFeed = {
  /** Stable key used in logs; must match the slug in TransitOperator */
  operatorSlug: string;
  /** Human-readable name for logs */
  operatorName: string;
  /** MobilityData static feed id — used to look up the TransitOperator row */
  mdbId: string;
  /**
   * GTFS-RT endpoint URL. May be a string (static URL) or a function
   * that reads env vars at call time (for feeds with query-param auth).
   */
  url: string | (() => string);
  /**
   * Returns request headers. Called at fetch time so env vars are read lazily.
   * Return undefined if no extra headers are needed.
   */
  headers?: () => Record<string, string>;
  /** Set to false to unconditionally skip this feed (placeholder or disabled) */
  enabled: boolean;
  /** Polling cadence in milliseconds. Default: 30 seconds */
  cadenceMs: number;
};

/**
 * Checks that all required env vars are present for a feed.
 * Returns the first missing var name, or null if all are present.
 */
export function missingEnvVar(...vars: string[]): string | null {
  for (const v of vars) {
    if (!process.env[v]) return v;
  }
  return null;
}

export const REALTIME_FEEDS: RealtimeFeed[] = [
  // ── EMT Madrid (bus) ─────────────────────────────────────────────────────
  // GTFS-RT VehiclePositions via EMT OpenAPI v2.
  // Auth: X-ClientId + passKey headers (OAuth2 client credentials).
  // Note: EMT issues long-lived passKeys tied to a registered clientId.
  // Registration: https://opendata.emtmadrid.es/
  {
    operatorSlug: "emt-madrid",
    operatorName: "EMT Madrid",
    mdbId: "mdb-1030",
    url: "https://openapi.emtmadrid.es/v2/transport/busemtmad/gtfs-rt/",
    headers: () => ({
      "X-ClientId": process.env.EMT_MADRID_CLIENT_ID ?? "",
      passKey: process.env.EMT_MADRID_PASS_KEY ?? "",
      "Content-Type": "application/octet-stream",
    }),
    enabled: true,
    cadenceMs: 30_000,
  },

  // ── TMB Barcelona (metro + bus) ───────────────────────────────────────────
  // GTFS-RT VehiclePositions via TMB API.
  // Auth: app_id and app_key as query params.
  // Registration: https://developer.tmb.cat/
  {
    operatorSlug: "tmb-barcelona",
    operatorName: "TMB Barcelona",
    mdbId: "mdb-1052",
    url: () => {
      const appId = process.env.TMB_APP_ID ?? "";
      const appKey = process.env.TMB_APP_KEY ?? "";
      return `https://api.tmb.cat/v1/transit/gtfs-rt/vehicle-positions?app_id=${appId}&app_key=${appKey}`;
    },
    enabled: true,
    cadenceMs: 30_000,
  },

  // ── Metro de Madrid ───────────────────────────────────────────────────────
  // TODO: Metro de Madrid does not currently publish an open GTFS-RT feed.
  //       Monitor https://www.metromadrid.es/es/open-data for a future release.
  //       When available, add the URL and set enabled: true.
  {
    operatorSlug: "metro-madrid",
    operatorName: "Metro de Madrid",
    mdbId: "mdb-1031",
    url: "https://placeholder.metromadrid.es/gtfs-rt/vehicle-positions.pb",
    enabled: false,
    cadenceMs: 30_000,
  },
];
