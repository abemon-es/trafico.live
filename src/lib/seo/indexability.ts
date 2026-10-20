/**
 * When a templated page is noindex, in one place for the page and the sitemap.
 *
 * Each template used to decide on its own, and the sitemap listed the URLs
 * anyway: on 2026-10-20, 3,146 of the 4,626 postcodes, 357 of the 1,017 news
 * articles and 5 of the 20 camera cities in the sitemap answered noindex.
 * Telling Google to fetch a URL and then not to index it is the hygiene the
 * CMO's plan puts first. A page and its sitemap read these together.
 */

import type { ArticleCategory } from "@prisma/client";

/** /codigo-postal/<cp>: fewer gas stations than this is a thin page. */
export const POSTAL_CODE_MIN_GAS_STATIONS = 3;

/** Daily, recurring reports go noindex this long after they are published. */
export const EPHEMERAL_ARTICLE_CATEGORIES: ArticleCategory[] = ["DAILY_REPORT", "PRICE_ALERT", "INCIDENT_DIGEST", "WEATHER_ALERT"];
export const EPHEMERAL_ARTICLE_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

export function isStaleArticle(category: ArticleCategory, publishedAt: Date, now: number = Date.now()): boolean {
  return EPHEMERAL_ARTICLE_CATEGORIES.includes(category) && now - publishedAt.getTime() > EPHEMERAL_ARTICLE_MAX_AGE_MS;
}

/** /camaras/<city>: noindex while the city's province has no active camera. */
export function cameraCityIndexable(activeCamerasInProvince: number): boolean {
  return activeCamerasInProvince > 0;
}
