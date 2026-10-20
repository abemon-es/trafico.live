/**
 * Every link an alert sends a user resolves to a page that exists.
 *
 * Road alerts linked /incidencias/<situationId> until 2026-10-20, a route that
 * never existed: every road alert would have landed on a 404. This runs each
 * matcher on a matching event and checks each URL against src/app's pages, and
 * checks every `${BASE_URL}/…` path written in the alert-matcher sources.
 *
 * Alert links must reach a static page: a dynamic one can still 404 for the
 * value (/carreteras/M-30 does: regional and city roads have no road page).
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:alert-urls
 */

import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { PrismaClient } from "@prisma/client";
import type { AlertTarget, MatchContext, MatchResult } from "../src/lib/alert-matcher";
import { incidentAlertUrl } from "../src/lib/alert-matcher";
import { matchRoadAlerts } from "../services/collector/tasks/alert-matcher/match-road";
import { matchTrainAlerts } from "../services/collector/tasks/alert-matcher/match-train";
import { matchFlightAlerts } from "../services/collector/tasks/alert-matcher/match-flight";

const APP = join(process.cwd(), "src/app");
const MATCHER_DIR = join(process.cwd(), "services/collector/tasks/alert-matcher");

const hasPage = (dir: string) => existsSync(join(dir, "page.tsx")) || existsSync(join(dir, "page.ts"));

/**
 * True if a page in src/app serves this path (route groups are transparent).
 * With `dynamic`, a [param] segment matches any value. Catch-alls never count:
 * the only one, src/app/[...catchAll], is the redirect-or-404 fallback.
 */
function routeExists(pathname: string, { dynamic = false } = {}): boolean {
  return resolveIn(APP, pathname.split("/").filter(Boolean).map(decodeURIComponent), dynamic);
}

function resolveIn(dir: string, segs: string[], dynamic: boolean): boolean {
  const dirs = readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("_") && e.name !== "api")
    .map((e) => e.name);
  for (const group of dirs.filter((d) => /^\(.+\)$/.test(d))) {
    if (resolveIn(join(dir, group), segs, dynamic)) return true;
  }
  if (segs.length === 0) return hasPage(dir);
  const [head, ...rest] = segs;
  for (const d of dirs) {
    if (d === head && resolveIn(join(dir, d), rest, dynamic)) return true;
    if (dynamic && /^\[[^.[\]]+\]$/.test(d) && resolveIn(join(dir, d), rest, dynamic)) return true;
  }
  return false;
}

const now = new Date("2026-10-20T21:30:00Z");
const ctx: MatchContext = { since: new Date(now.getTime() - 3_600_000), now };
const alert = (type: AlertTarget["type"], targetKey: string): AlertTarget => ({
  id: `alert-${targetKey}`, userId: "u1", type, targetKey, frequency: "REAL_TIME", status: "ACTIVE",
  channels: ["EMAIL"], lastTriggeredAt: null, createdAt: now,
});

const prisma = {
  trafficIncident: {
    findMany: async () => [{
      id: "row1", situationId: "EUSKADI-1694", roadNumber: "BI-30", kmPoint: null, isActive: true,
      firstSeenAt: now, description: "Obras", province: "48", type: "ROADWORK",
    }],
  },
  railwayAlert: {
    findMany: async () => [{
      id: "ra1", alertId: "a1", routeIds: ["cercanias-madrid-c1"], headerText: "Incidencia", description: "Retrasos en C1",
      isActive: true, firstSeenAt: now, serviceType: "cercanias",
    }],
  },
  renfeFleetPosition: {
    findMany: async () => [{ id: "fp1", trainNumber: "03063", brand: "AVE", delay: 30, originStation: "Madrid", destStation: "Sevilla", fetchedAt: now }],
  },
  aircraftPosition: {
    findMany: async () => [{ id: "ap1", icao24: "345123", callsign: "IB6250 ", altitude: 10000, onGround: false, createdAt: now }],
  },
} as unknown as PrismaClient;

async function main() {
  // The resolver itself: the old road link is a 404, the pages alerts use exist.
  assert.equal(routeExists("/incidencias/EUSKADI-1694", { dynamic: true }), false, "the old road-alert link is not a page");
  for (const p of ["/incidencias", "/trenes", "/aviacion", "/alertas", "/alertas/nueva"]) {
    assert.ok(routeExists(p), `${p} is a page`);
  }
  assert.equal(routeExists("/carreteras/A-6"), false, "a dynamic page is not a static one");
  assert.ok(routeExists("/carreteras/A-6", { dynamic: true }));
  assert.equal(routeExists("/no-existe", { dynamic: true }), false);

  // Each matcher, on an event it matches: every URL resolves to a page.
  const results: MatchResult[] = [
    ...(await matchRoadAlerts(prisma, [alert("ROAD", "road:BI-30")], ctx)),
    ...(await matchTrainAlerts(prisma, [alert("TRAIN", "train:cercanias"), alert("TRAIN", "train:ave")], ctx)),
    ...(await matchFlightAlerts(prisma, [alert("FLIGHT", "flight:IB6250")], ctx)),
  ];
  for (const type of ["ROAD", "TRAIN", "FLIGHT"]) {
    assert.ok(results.some((r) => r.type === type), `a ${type} alert matched (the check is not vacuous)`);
  }
  for (const r of results) {
    const url = new URL(r.url);
    assert.ok(routeExists(url.pathname), `${r.type} alert links ${url.pathname}, which is not a page`);
  }

  // The road alert opens its incident.
  const road = results.find((r) => r.type === "ROAD")!;
  assert.equal(new URL(road.url).pathname, "/incidencias");
  assert.equal(new URL(road.url).searchParams.get("id"), "EUSKADI-1694");
  assert.equal(new URL(incidentAlertUrl("https://trafico.live", "DGT-a/b c")).searchParams.get("id"), "DGT-a/b c");

  // Every `${BASE_URL}/…` path written in the matcher and email code is a page too.
  const literalPaths = new Set<string>();
  for (const file of readdirSync(MATCHER_DIR).filter((f) => f.endsWith(".ts"))) {
    for (const m of readFileSync(join(MATCHER_DIR, file), "utf8").matchAll(/\$\{BASE_URL\}(\/[A-Za-z0-9/_-]*)/g)) {
      literalPaths.add(m[1]);
    }
  }
  assert.ok(literalPaths.has("/alertas"), "the unsubscribe link is checked");
  for (const p of literalPaths) assert.ok(routeExists(p), `${p} (in alert-matcher) is not a page`);

  console.log(`alert urls: all checks passed (${results.length} matches, ${literalPaths.size} literal paths)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
