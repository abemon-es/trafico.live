/**
 * The Search Console API returns search-analytics rows sorted by clicks and
 * has no ordering parameter (an `orderBy` in the request body is ignored). On
 * a site with 15 clicks a month, "the top 20 rows" were the few pages with a
 * click and then whatever came next, so the pages that earn impressions and
 * no clicks never reached the snapshot. Ask for every row and rank here.
 */

export interface RankedRow {
  impressions: number;
  clicks: number;
}

/** The `n` rows with most impressions; ties by clicks, then by input order. */
export function topByImpressions<T extends RankedRow>(rows: readonly T[], n = 20): T[] {
  return rows
    .map((row, i) => ({ row, i }))
    .sort((a, b) => b.row.impressions - a.row.impressions || b.row.clicks - a.row.clicks || a.i - b.i)
    .slice(0, n)
    .map(({ row }) => row);
}
