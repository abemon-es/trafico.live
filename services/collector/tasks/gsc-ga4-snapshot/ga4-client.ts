/**
 * Google Analytics 4 Data API client
 *
 * Uses the service account claude-agent@claude-automation-484615.iam.gserviceaccount.com
 * which has Viewer access to GA4 property properties/521333149.
 *
 * Fetches last-30d sessions, users, pageviews, events, and dimensional
 * breakdowns by country, device, traffic source, and top pages.
 * Also returns a daily timeseries of sessions/users/pageviews.
 */

import { google } from "googleapis";
import { log, logError } from "../../shared/utils.js";

const TASK = "gsc-ga4-snapshot";
const GA4_PROPERTY = "properties/521333149";

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  });
  return auth.getClient();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Ga4DailyRow {
  date: string;        // "YYYY-MM-DD"
  sessions: number;
  users: number;
  pageviews: number;
}

export interface Ga4CountryRow {
  country: string;
  sessions: number;
}

export interface Ga4DeviceRow {
  device: string;     // "desktop" | "mobile" | "tablet"
  sessions: number;
}

export interface Ga4SourceRow {
  source: string;
  medium: string;
  sessions: number;
}

export interface Ga4PageRow {
  page: string;
  pageviews: number;
}

export interface Ga4Breakdowns {
  byCountry: Ga4CountryRow[];
  byDevice: Ga4DeviceRow[];
  bySource: Ga4SourceRow[];
  byPage: Ga4PageRow[];
}

export interface Ga4Data {
  sessions30d: number;
  users30d: number;
  pageviews30d: number;
  events30d: number;
  dailySeries: Ga4DailyRow[];
  breakdowns: Ga4Breakdowns;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function ga4Date(d: Date): string {
  // GA4 uses YYYYMMDD format
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function isoDate(ga4: string): string {
  // Convert YYYYMMDD → YYYY-MM-DD
  return `${ga4.slice(0, 4)}-${ga4.slice(4, 6)}-${ga4.slice(6, 8)}`;
}

function getDateRange30d(): { startDate: string; endDate: string } {
  const end = new Date();
  end.setDate(end.getDate() - 1); // yesterday
  const start = new Date(end);
  start.setDate(start.getDate() - 29);
  return { startDate: ga4Date(start), endDate: ga4Date(end) };
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function fetchGa4Data(): Promise<Ga4Data> {
  log(TASK, `Fetching GA4 data for ${GA4_PROPERTY}`);

  const authClient = await getAuthClient();
  const analyticsdata = google.analyticsdata({ version: "v1beta", auth: authClient as never });

  const { startDate, endDate } = getDateRange30d();
  log(TASK, `GA4 date range: ${isoDate(startDate)} → ${isoDate(endDate)}`);

  let sessions30d = 0;
  let users30d = 0;
  let pageviews30d = 0;
  let events30d = 0;
  let dailySeries: Ga4DailyRow[] = [];
  const breakdowns: Ga4Breakdowns = {
    byCountry: [],
    byDevice: [],
    bySource: [],
    byPage: [],
  };

  // ── 1. Aggregate totals + daily timeseries ────────────────────────────────
  try {
    const res = await analyticsdata.properties.runReport({
      property: GA4_PROPERTY,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "date" }],
        metrics: [
          { name: "sessions" },
          { name: "activeUsers" },
          { name: "screenPageViews" },
          { name: "eventCount" },
        ],
        orderBys: [{ dimension: { dimensionName: "date" }, desc: false }],
        limit: 31,
      },
    });

    const rows = res.data.rows ?? [];
    dailySeries = rows.map((r) => ({
      date: isoDate(r.dimensionValues?.[0]?.value ?? ""),
      sessions: parseInt(r.metricValues?.[0]?.value ?? "0", 10),
      users: parseInt(r.metricValues?.[1]?.value ?? "0", 10),
      pageviews: parseInt(r.metricValues?.[2]?.value ?? "0", 10),
    }));

    // Sum across all days
    for (const row of dailySeries) {
      sessions30d += row.sessions;
      users30d += row.users;
      pageviews30d += row.pageviews;
    }
    // Events from totals row
    const totalsRow = res.data.totals?.[0];
    events30d = parseInt(totalsRow?.metricValues?.[3]?.value ?? "0", 10);

    log(TASK, `GA4 totals: ${sessions30d} sessions, ${users30d} users, ${pageviews30d} pageviews, ${events30d} events`);
  } catch (err) {
    logError(TASK, "Failed to fetch GA4 aggregate + daily:", err);
  }

  // ── 2. By country (top 20) ────────────────────────────────────────────────
  try {
    const res = await analyticsdata.properties.runReport({
      property: GA4_PROPERTY,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "country" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 20,
      },
    });
    breakdowns.byCountry = (res.data.rows ?? []).map((r) => ({
      country: r.dimensionValues?.[0]?.value ?? "",
      sessions: parseInt(r.metricValues?.[0]?.value ?? "0", 10),
    }));
    log(TASK, `GA4 by country: ${breakdowns.byCountry.length} countries`);
  } catch (err) {
    logError(TASK, "Failed to fetch GA4 by country:", err);
  }

  // ── 3. By device category ─────────────────────────────────────────────────
  try {
    const res = await analyticsdata.properties.runReport({
      property: GA4_PROPERTY,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "deviceCategory" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 10,
      },
    });
    breakdowns.byDevice = (res.data.rows ?? []).map((r) => ({
      device: r.dimensionValues?.[0]?.value ?? "",
      sessions: parseInt(r.metricValues?.[0]?.value ?? "0", 10),
    }));
    log(TASK, `GA4 by device: ${breakdowns.byDevice.length} categories`);
  } catch (err) {
    logError(TASK, "Failed to fetch GA4 by device:", err);
  }

  // ── 4. By traffic source/medium ───────────────────────────────────────────
  try {
    const res = await analyticsdata.properties.runReport({
      property: GA4_PROPERTY,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 15,
      },
    });
    breakdowns.bySource = (res.data.rows ?? []).map((r) => ({
      source: r.dimensionValues?.[0]?.value ?? "",
      medium: r.dimensionValues?.[1]?.value ?? "",
      sessions: parseInt(r.metricValues?.[0]?.value ?? "0", 10),
    }));
    log(TASK, `GA4 by source: ${breakdowns.bySource.length} sources`);
  } catch (err) {
    logError(TASK, "Failed to fetch GA4 by source:", err);
  }

  // ── 5. Top pages by pageviews ─────────────────────────────────────────────
  try {
    const res = await analyticsdata.properties.runReport({
      property: GA4_PROPERTY,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 20,
      },
    });
    breakdowns.byPage = (res.data.rows ?? []).map((r) => ({
      page: r.dimensionValues?.[0]?.value ?? "",
      pageviews: parseInt(r.metricValues?.[0]?.value ?? "0", 10),
    }));
    log(TASK, `GA4 top pages: ${breakdowns.byPage.length}`);
  } catch (err) {
    logError(TASK, "Failed to fetch GA4 top pages:", err);
  }

  return {
    sessions30d,
    users30d,
    pageviews30d,
    events30d,
    dailySeries,
    breakdowns,
  };
}
