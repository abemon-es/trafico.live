/**
 * Google Search Console API client
 *
 * Uses the service account claude-agent@claude-automation-484615.iam.gserviceaccount.com
 * which has siteFullUser access to sc-domain:trafico.live.
 *
 * Fetches last-30d aggregate and daily timeseries for clicks, impressions,
 * CTR and average position, plus top 20 pages and queries.
 */

import { google } from "googleapis";
import { log, logError } from "../../shared/utils.js";

const TASK = "gsc-ga4-snapshot";
const GSC_SITE = "sc-domain:trafico.live";

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
  return auth.getClient();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GscDailyRow {
  date: string;        // "YYYY-MM-DD"
  clicks: number;
  impressions: number;
  position: number;
}

export interface GscPageRow {
  page: string;
  clicks: number;
  impressions: number;
  position: number;
  ctr: number;
}

export interface GscQueryRow {
  query: string;
  clicks: number;
  impressions: number;
  position: number;
  ctr: number;
}

export interface GscData {
  clicks30d: number;
  impressions30d: number;
  ctr30d: number;
  avgPosition30d: number;
  dailySeries: GscDailyRow[];
  topPages: GscPageRow[];
  topQueries: GscQueryRow[];
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getDateRange30d(): { startDate: string; endDate: string } {
  const end = new Date();
  end.setDate(end.getDate() - 1); // yesterday (GSC lags 1d)
  const start = new Date(end);
  start.setDate(start.getDate() - 29); // 30 days total
  return { startDate: formatDate(start), endDate: formatDate(end) };
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function fetchGscData(): Promise<GscData> {
  log(TASK, "Fetching GSC data for sc-domain:trafico.live");

  const authClient = await getAuthClient();
  const webmasters = google.webmasters({ version: "v3", auth: authClient as never });

  const { startDate, endDate } = getDateRange30d();
  log(TASK, `GSC date range: ${startDate} → ${endDate}`);

  // ── 1. Aggregate totals (no dimension) ──────────────────────────────────────
  let clicks30d = 0;
  let impressions30d = 0;
  let ctr30d = 0;
  let avgPosition30d = 0;

  try {
    const aggRes = await webmasters.searchanalytics.query({
      siteUrl: GSC_SITE,
      requestBody: {
        startDate,
        endDate,
        dimensions: [],
        rowLimit: 1,
      },
    });
    const rows = aggRes.data.rows ?? [];
    if (rows.length > 0) {
      clicks30d = Math.round(rows[0].clicks ?? 0);
      impressions30d = Math.round(rows[0].impressions ?? 0);
      ctr30d = rows[0].ctr ?? 0;
      avgPosition30d = rows[0].position ?? 0;
    }
    log(TASK, `GSC aggregate: ${clicks30d} clicks, ${impressions30d} impressions, pos ${avgPosition30d.toFixed(1)}`);
  } catch (err) {
    logError(TASK, "Failed to fetch GSC aggregate totals:", err);
  }

  // ── 2. Daily timeseries ──────────────────────────────────────────────────────
  let dailySeries: GscDailyRow[] = [];

  try {
    const dailyRes = await webmasters.searchanalytics.query({
      siteUrl: GSC_SITE,
      requestBody: {
        startDate,
        endDate,
        dimensions: ["date"],
        rowLimit: 31,
      },
    });
    dailySeries = (dailyRes.data.rows ?? []).map((r) => ({
      date: (r.keys?.[0] ?? "") as string,
      clicks: Math.round(r.clicks ?? 0),
      impressions: Math.round(r.impressions ?? 0),
      position: r.position ?? 0,
    }));
    log(TASK, `GSC daily series: ${dailySeries.length} rows`);
  } catch (err) {
    logError(TASK, "Failed to fetch GSC daily timeseries:", err);
  }

  // ── 3. Top pages ─────────────────────────────────────────────────────────────
  let topPages: GscPageRow[] = [];

  try {
    const pagesRes = await webmasters.searchanalytics.query({
      siteUrl: GSC_SITE,
      requestBody: {
        startDate,
        endDate,
        dimensions: ["page"],
        rowLimit: 20,
        orderBy: [{ fieldName: "impressions", sortOrder: "DESCENDING" }],
      },
    });
    topPages = (pagesRes.data.rows ?? []).map((r) => ({
      page: (r.keys?.[0] ?? "") as string,
      clicks: Math.round(r.clicks ?? 0),
      impressions: Math.round(r.impressions ?? 0),
      position: r.position ?? 0,
      ctr: r.ctr ?? 0,
    }));
    log(TASK, `GSC top pages: ${topPages.length}`);
  } catch (err) {
    logError(TASK, "Failed to fetch GSC top pages:", err);
  }

  // ── 4. Top queries ───────────────────────────────────────────────────────────
  let topQueries: GscQueryRow[] = [];

  try {
    const queriesRes = await webmasters.searchanalytics.query({
      siteUrl: GSC_SITE,
      requestBody: {
        startDate,
        endDate,
        dimensions: ["query"],
        rowLimit: 20,
        orderBy: [{ fieldName: "impressions", sortOrder: "DESCENDING" }],
      },
    });
    topQueries = (queriesRes.data.rows ?? []).map((r) => ({
      query: (r.keys?.[0] ?? "") as string,
      clicks: Math.round(r.clicks ?? 0),
      impressions: Math.round(r.impressions ?? 0),
      position: r.position ?? 0,
      ctr: r.ctr ?? 0,
    }));
    log(TASK, `GSC top queries: ${topQueries.length}`);
  } catch (err) {
    logError(TASK, "Failed to fetch GSC top queries:", err);
  }

  return {
    clicks30d,
    impressions30d,
    ctr30d,
    avgPosition30d,
    dailySeries,
    topPages,
    topQueries,
  };
}
