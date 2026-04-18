/**
 * Tier Path Rules
 *
 * Maps /api/* path patterns to the required feature string.
 * B1 (middleware) imports `matchRule` to determine if a path requires a non-FREE tier.
 *
 * Features are defined in `src/lib/api-tiers.ts` — do not invent new feature strings here.
 *
 * HOW TO ADD A NEW GATED PATH (2 steps):
 *  1. Add `{ pattern: /^\/api\/your-path/, feature: "your_feature" }` to TIER_PATH_RULES below.
 *  2. Ensure the feature string exists in the correct tier's `features` array in api-tiers.ts.
 */

export interface TierPathRule {
  /** RegExp tested against the full pathname (e.g. "/api/movilidad/corredores") */
  pattern: RegExp;
  /** Feature key from API_TIERS[tier].features */
  feature: string;
}

/**
 * Ordered list of path → feature rules.
 * More specific patterns should come before broader ones.
 */
export const TIER_PATH_RULES: TierPathRule[] = [
  // ── Accident microdata (PRO+) ─────────────────────────────────────────────
  { pattern: /^\/api\/accidentes\/microdata/, feature: "accident_microdata" },

  // ── Mobility O-D flows (PRO+) ─────────────────────────────────────────────
  { pattern: /^\/api\/movilidad/, feature: "mobility_od" },

  // ── Fuel price history + trend analysis (PRO+) ───────────────────────────
  { pattern: /^\/api\/combustible\/historico/, feature: "historical_data" },
  { pattern: /^\/api\/combustible\/tendencia/, feature: "trend_analysis" },

  // ── Climate / AEMET historical records (PRO+) ────────────────────────────
  { pattern: /^\/api\/clima\/historico/, feature: "climate_data" },

  // ── Fleet tracking / Renfe LD real-time (PRO+) ───────────────────────────
  { pattern: /^\/api\/flotas/, feature: "fleet_tracking" },
  { pattern: /^\/api\/trenes\/posiciones/, feature: "fleet_tracking" },

  // ── Transport statistics — historical aggregations (PRO+) ────────────────
  { pattern: /^\/api\/estadisticas\/modal/, feature: "historical_data" },
  { pattern: /^\/api\/estadisticas/, feature: "historical_data" },
];

/**
 * Match a pathname against the rule list.
 *
 * @param pathname  - Full request pathname, e.g. "/api/movilidad/corredores"
 * @returns         The required feature string, or null if path is freely accessible.
 */
export function matchRule(pathname: string): string | null {
  for (const rule of TIER_PATH_RULES) {
    if (rule.pattern.test(pathname)) {
      return rule.feature;
    }
  }
  return null;
}
