/**
 * src/lib/seo/indexability.ts: the noindex rules a page and the sitemap share.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:indexability
 */

import assert from "node:assert/strict";
import {
  EPHEMERAL_ARTICLE_CATEGORIES,
  EPHEMERAL_ARTICLE_MAX_AGE_MS,
  POSTAL_CODE_MIN_GAS_STATIONS,
  isStaleArticle,
} from "../src/lib/seo/indexability";

const now = Date.UTC(2026, 9, 20);
const daysAgo = (d: number) => new Date(now - d * 24 * 60 * 60 * 1000);

assert.equal(POSTAL_CODE_MIN_GAS_STATIONS, 3);
assert.equal(EPHEMERAL_ARTICLE_MAX_AGE_MS, 90 * 24 * 60 * 60 * 1000);
assert.deepEqual(EPHEMERAL_ARTICLE_CATEGORIES, ["DAILY_REPORT", "PRICE_ALERT", "INCIDENT_DIGEST", "WEATHER_ALERT"]);

// Ephemeral reports go stale after 90 days; evergreen ones never do.
assert.equal(isStaleArticle("DAILY_REPORT", daysAgo(91), now), true);
assert.equal(isStaleArticle("DAILY_REPORT", daysAgo(89), now), false);
assert.equal(isStaleArticle("WEATHER_ALERT", daysAgo(400), now), true);
assert.equal(isStaleArticle("ANNUAL_REPORT", daysAgo(400), now), false);
assert.equal(isStaleArticle("ROAD_ANALYSIS", daysAgo(400), now), false);
assert.equal(isStaleArticle("GUIDE", daysAgo(400), now), false);

console.log("seo indexability: all checks passed");
