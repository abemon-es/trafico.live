/**
 * GET /api/sobre/citaciones-ia
 *
 * Public, no auth required — returns aggregated AI bot visit stats.
 * No PII exposed (IP stored as 2-octet prefix; not returned here).
 *
 * Response shape:
 * {
 *   updatedAt: string,        // ISO timestamp
 *   totals: {
 *     last24h: number,
 *     last7d: number,
 *     last30d: number,
 *   },
 *   bots: Array<{
 *     bot: string,
 *     last24h: number,
 *     last7d: number,
 *     last30d: number,
 *   }>,
 *   timeseries: Array<{       // daily counts per bot, last 30d
 *     date: string,           // "YYYY-MM-DD"
 *     bot: string,
 *     count: number,
 *   }>,
 *   topPaths: Array<{         // top 20 paths per bot, last 30d
 *     bot: string,
 *     path: string,
 *     count: number,
 *   }>,
 * }
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { reportApiError } from "@/lib/api-error";
import { getFromCache, setInCache } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 300; // 5 min

const CACHE_KEY = "api:citaciones-ia:v1";
const CACHE_TTL = 300; // 5 minutes

export async function GET() {
  // Try Redis cache first
  try {
    const cached = await getFromCache<object>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=60" },
      });
    }
  } catch {
    // Redis unavailable — continue to DB
  }

  try {
    const now = new Date();
    const ago24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const ago7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const ago30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Parallel queries
    const [counts24h, counts7d, counts30d, rawTimeseries, rawTopPaths] =
      await Promise.all([
        // Per-bot counts for each window
        prisma.botVisit.groupBy({
          by: ["bot"],
          where: { visitedAt: { gte: ago24h } },
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
        }),
        prisma.botVisit.groupBy({
          by: ["bot"],
          where: { visitedAt: { gte: ago7d } },
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
        }),
        prisma.botVisit.groupBy({
          by: ["bot"],
          where: { visitedAt: { gte: ago30d } },
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
        }),

        // Daily timeseries — raw rows, group in JS to avoid raw SQL
        prisma.botVisit.findMany({
          where: { visitedAt: { gte: ago30d } },
          select: { bot: true, visitedAt: true },
          orderBy: { visitedAt: "asc" },
        }),

        // Top paths per bot (last 30d, up to top 20 per bot)
        prisma.botVisit.groupBy({
          by: ["bot", "path"],
          where: { visitedAt: { gte: ago30d } },
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
          take: 500, // cap to avoid huge payloads; we filter per-bot later
        }),
      ]);

    // Merge per-bot counts across windows
    const botMap = new Map<
      string,
      { bot: string; last24h: number; last7d: number; last30d: number }
    >();

    for (const row of counts30d) {
      botMap.set(row.bot, {
        bot: row.bot,
        last24h: 0,
        last7d: 0,
        last30d: row._count.id,
      });
    }
    for (const row of counts7d) {
      const entry = botMap.get(row.bot);
      if (entry) entry.last7d = row._count.id;
      else botMap.set(row.bot, { bot: row.bot, last24h: 0, last7d: row._count.id, last30d: row._count.id });
    }
    for (const row of counts24h) {
      const entry = botMap.get(row.bot);
      if (entry) entry.last24h = row._count.id;
      else botMap.set(row.bot, { bot: row.bot, last24h: row._count.id, last7d: row._count.id, last30d: row._count.id });
    }

    const bots = Array.from(botMap.values()).sort((a, b) => b.last30d - a.last30d);

    const totals = {
      last24h: bots.reduce((s, b) => s + b.last24h, 0),
      last7d: bots.reduce((s, b) => s + b.last7d, 0),
      last30d: bots.reduce((s, b) => s + b.last30d, 0),
    };

    // Build daily timeseries: { date, bot, count }
    const tsMap = new Map<string, number>();
    for (const row of rawTimeseries) {
      const date = row.visitedAt.toISOString().slice(0, 10);
      const key = `${date}|${row.bot}`;
      tsMap.set(key, (tsMap.get(key) ?? 0) + 1);
    }
    const timeseries = Array.from(tsMap.entries()).map(([key, count]) => {
      const [date, bot] = key.split("|");
      return { date, bot, count };
    });

    // Top paths per bot — keep top 20 per bot
    const pathsByBot = new Map<string, Array<{ path: string; count: number }>>();
    for (const row of rawTopPaths) {
      const existing = pathsByBot.get(row.bot) ?? [];
      if (existing.length < 20) {
        existing.push({ path: row.path, count: row._count.id });
        pathsByBot.set(row.bot, existing);
      }
    }
    const topPaths: Array<{ bot: string; path: string; count: number }> = [];
    for (const [bot, paths] of pathsByBot.entries()) {
      for (const { path, count } of paths) {
        topPaths.push({ bot, path, count });
      }
    }

    const payload = {
      updatedAt: now.toISOString(),
      totals,
      bots,
      timeseries,
      topPaths,
    };

    // Cache in Redis
    try {
      await setInCache(CACHE_KEY, payload, CACHE_TTL);
    } catch {
      // Redis unavailable — no-op
    }

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=60" },
    });
  } catch (err) {
    reportApiError(err, "citaciones-ia-api");

    // If BotVisit table doesn't exist yet (pre-migration), return empty stats
    const empty = {
      updatedAt: new Date().toISOString(),
      totals: { last24h: 0, last7d: 0, last30d: 0 },
      bots: [],
      timeseries: [],
      topPaths: [],
    };
    return NextResponse.json(empty, {
      headers: { "Cache-Control": "public, max-age=60" },
    });
  }
}
