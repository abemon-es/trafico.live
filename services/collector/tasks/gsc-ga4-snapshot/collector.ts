/**
 * GSC + GA4 Snapshot Collector
 *
 * Runs daily at 06:00 UTC. Fetches 30-day Search Console and GA4 data for
 * trafico.live and persists a single SeoSnapshot row. Running on the same
 * calendar day overwrites the existing day's snapshot (idempotent by date).
 *
 * Service account: claude-agent@claude-automation-484615.iam.gserviceaccount.com
 * GSC site: sc-domain:trafico.live (siteFullUser)
 * GA4 property: properties/521333149
 *
 * The web page at /sobre/posicionamiento reads from the latest SeoSnapshot row
 * for a ~50 ms DB read instead of a 2-4 s live API call.
 */

import { PrismaClient } from "@prisma/client";
import { log, logError } from "../../shared/utils.js";
import { heartbeat } from "../../shared/heartbeat.js";
import { fetchGscData } from "./gsc-client.js";
import { fetchGa4Data } from "./ga4-client.js";

const TASK = "gsc-ga4-snapshot";

export async function run(prisma: PrismaClient): Promise<void> {
  log(TASK, "Starting GSC + GA4 snapshot collection");

  // ── Fetch both APIs in parallel ──────────────────────────────────────────
  let gscData;
  let ga4Data;

  try {
    [gscData, ga4Data] = await Promise.all([
      fetchGscData(),
      fetchGa4Data(),
    ]);
  } catch (err) {
    logError(TASK, "Fatal error fetching API data:", err);
    await heartbeat(prisma, TASK, "error", { error: String(err) });
    return;
  }

  // ── Idempotency: check if a snapshot already exists for today ────────────
  // "Today" is the capture date — we compare by calendar date (UTC).
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setUTCHours(23, 59, 59, 999);

  try {
    const existing = await prisma.seoSnapshot.findFirst({
      where: { capturedAt: { gte: todayStart, lte: todayEnd } },
      select: { id: true },
    });

    if (existing) {
      log(TASK, `Updating existing snapshot ${existing.id} for today`);
      await prisma.seoSnapshot.update({
        where: { id: existing.id },
        data: {
          capturedAt: new Date(),
          gscClicks30d: gscData.clicks30d,
          gscImpressions30d: gscData.impressions30d,
          gscCtr30d: gscData.ctr30d,
          gscAvgPosition30d: gscData.avgPosition30d,
          gscDailySeries: gscData.dailySeries,
          gscTopPages: gscData.topPages,
          gscTopQueries: gscData.topQueries,
          ga4Sessions30d: ga4Data.sessions30d,
          ga4Users30d: ga4Data.users30d,
          ga4Pageviews30d: ga4Data.pageviews30d,
          ga4Events30d: ga4Data.events30d,
          ga4Breakdowns: ga4Data.breakdowns,
          ga4DailySeries: ga4Data.dailySeries,
        },
      });
      log(TASK, "Snapshot updated");
    } else {
      const snapshot = await prisma.seoSnapshot.create({
        data: {
          gscClicks30d: gscData.clicks30d,
          gscImpressions30d: gscData.impressions30d,
          gscCtr30d: gscData.ctr30d,
          gscAvgPosition30d: gscData.avgPosition30d,
          gscDailySeries: gscData.dailySeries,
          gscTopPages: gscData.topPages,
          gscTopQueries: gscData.topQueries,
          ga4Sessions30d: ga4Data.sessions30d,
          ga4Users30d: ga4Data.users30d,
          ga4Pageviews30d: ga4Data.pageviews30d,
          ga4Events30d: ga4Data.events30d,
          ga4Breakdowns: ga4Data.breakdowns,
          ga4DailySeries: ga4Data.dailySeries,
        },
      });
      log(TASK, `New snapshot created: ${snapshot.id}`);
    }
  } catch (err) {
    logError(TASK, "Failed to persist snapshot:", err);
    await heartbeat(prisma, TASK, "error", { error: String(err) });
    return;
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  log(TASK, "─── Summary ────────────────────────────────────────");
  log(TASK, `  GSC: ${gscData.clicks30d} clicks, ${gscData.impressions30d} impressions (30d)`);
  log(TASK, `  GSC avg position: ${gscData.avgPosition30d.toFixed(1)}, CTR: ${(gscData.ctr30d * 100).toFixed(2)}%`);
  log(TASK, `  GA4: ${ga4Data.sessions30d} sessions, ${ga4Data.users30d} users, ${ga4Data.pageviews30d} pageviews (30d)`);
  log(TASK, "────────────────────────────────────────────────────");

  await heartbeat(prisma, TASK, "ok", {
    gscClicks30d: gscData.clicks30d,
    gscImpressions30d: gscData.impressions30d,
    ga4Sessions30d: ga4Data.sessions30d,
    ga4Users30d: ga4Data.users30d,
  });
}
