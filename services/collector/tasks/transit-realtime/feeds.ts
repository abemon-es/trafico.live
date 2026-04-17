/**
 * Transit Realtime Feed Configuration
 *
 * Defines the GTFS-RT VehiclePositions feeds for major Spanish + Portuguese
 * urban operators. Each entry declares the endpoint, optional auth, and the
 * MobilityData catalog id used to resolve the matching TransitOperator row.
 *
 * Auth keys are read from env at runtime (not at module load) so missing
 * keys produce WARN logs rather than crashing the collector at startup.
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
  // ── PUBLIC FEEDS — no auth required ───────────────────────────────────────

  // Metro Bilbao — via Consorcio de Transportes de Bizkaia (CTB) S3 bucket
  // CC-BY 4.0 · https://data.ctb.eus/dataset/metro-bilbao-online
  {
    operatorSlug: "metro-bilbao",
    operatorName: "Metro Bilbao",
    mdbId: "mdb-3052",
    url: "https://ctb-gtfs-rt.s3.eu-south-2.amazonaws.com/metro-bilbao-vehicle-positions.pb",
    enabled: true,
    cadenceMs: 30_000,
  },

  // Bizkaibus — Diputación Foral de Bizkaia
  // CC-BY 4.0 · https://data.ctb.eus/eu/dataset/bizkaibus-viajes-alertas-retrasos-online
  {
    operatorSlug: "bizkaibus",
    operatorName: "Bizkaibus",
    mdbId: "mdb-1135",
    url: "https://baliabideak.bizkaia.eus/Bizkaibus/GTFSRealTime/FeedVehiculos.pb",
    enabled: true,
    cadenceMs: 30_000,
  },

  // Bilbobus (Bilbao urban bus) — Ayuntamiento de Bilbao open data
  // CC-BY 4.0 · https://www.bilbao.eus/opendata
  {
    operatorSlug: "bilbobus",
    operatorName: "Bilbobus",
    mdbId: "mdb-2681",
    url: "https://www.bilbao.eus/opendata/datos/bilbobus-gtfs-rt",
    enabled: true,
    cadenceMs: 30_000,
  },

  // Carris Metropolitana (Lisbon metro-area bus) — open API
  // https://github.com/carrismetropolitana/api
  {
    operatorSlug: "carris-metropolitana",
    operatorName: "Carris Metropolitana",
    mdbId: "mdb-2027",
    url: "https://api.carrismetropolitana.pt/vehicles.pb",
    enabled: true,
    cadenceMs: 30_000,
  },

  // ── GATED FEEDS — require registration + API keys ────────────────────────

  // EMT Madrid (bus) — OAuth2 clientId + passKey
  // Register: https://opendata.emtmadrid.es/
  // Env: EMT_MADRID_CLIENT_ID, EMT_MADRID_PASS_KEY
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

  // TMB Barcelona (metro + bus) — app_id + app_key query params
  // Register: https://developer.tmb.cat/
  // Env: TMB_APP_ID, TMB_APP_KEY
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
];
