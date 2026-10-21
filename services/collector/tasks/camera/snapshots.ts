/**
 * Camera snapshots that aren't images.
 *
 * DGT keeps some cameras in its feed whose snapshot URL answers 404 text/html
 * (34 of 1,972 on 2026-10-21): on the camera pages they were broken images.
 * Once a day, after the upsert, the camera run checks every snapshot with a
 * HEAD, a few at a time (DGT shouldn't take us for a scraper), and:
 * - an image (2xx image/*) puts the camera's failed days back to 0;
 * - anything else adds a day, and the page shows «sin imagen» from the first
 *   (src/lib/cameras/snapshot.ts);
 * - after 3 consecutive days the camera goes inactive, and so stops counting
 *   for cameraCityIndexable; the first good answer brings it back;
 * - a network error or timeout counts neither way;
 * - if more than half the answers aren't images, DGT is down, not the
 *   cameras: no counter moves that day. The cameras already past their grace
 *   days still go back to inactive, since the upsert has just reactivated them
 *   and leaving them active for 24 h would flap cameraCityIndexable;
 * - the whole sweep has a budget (5 min): what's left unchecked when it runs
 *   out counts as an error, neither way, so a hung DGT can't hold the run for
 *   hours (15 s × 1,972 / 4).
 * The pilot roads (CMO: A-5 pilot and A-6 control, until the pilot's +28
 * reading) never go inactive, so their camera lists stay as they are.
 */

import type { PrismaClient } from "@prisma/client";

export const CHECK_CONCURRENCY = 4;
export const CHECK_TIMEOUT_MS = 15_000;
export const SWEEP_BUDGET_MS = 5 * 60_000;
export const DEACTIVATE_AFTER_DAYS = 3;
export const OUTAGE_SHARE = 0.5;
export const DEACTIVATION_EXEMPT_ROADS = ["A-5", "A-6"];
const USER_AGENT = "trafico.live camera check (+https://trafico.live)";

export type SnapshotResult = "image" | "notImage" | "error";

/** HEAD every snapshot, `concurrency` at a time. */
export async function checkSnapshots(
  cameras: Array<{ id: string; url: string }>,
  { concurrency = CHECK_CONCURRENCY, timeoutMs = CHECK_TIMEOUT_MS, budgetMs = SWEEP_BUDGET_MS, fetchImpl = fetch } = {},
): Promise<Map<string, SnapshotResult>> {
  const results = new Map<string, SnapshotResult>();
  const deadline = Date.now() + budgetMs;
  let next = 0;
  const worker = async () => {
    while (next < cameras.length) {
      const cam = cameras[next++];
      if (Date.now() > deadline) {
        results.set(cam.id, "error");
        continue;
      }
      try {
        const res = await fetchImpl(cam.url, {
          method: "HEAD",
          headers: { "User-Agent": USER_AGENT },
          signal: AbortSignal.timeout(timeoutMs),
        });
        const type = res.headers.get("content-type") ?? "";
        results.set(cam.id, res.ok && type.startsWith("image/") ? "image" : "notImage");
      } catch {
        results.set(cam.id, "error");
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, cameras.length) }, worker));
  return results;
}

export interface SnapshotPlan {
  /** More than OUTAGE_SHARE of the answers weren't images: the day doesn't count. */
  outage: boolean;
  image: string[];
  notImage: string[];
  errors: number;
}

export function planSnapshots(results: Map<string, SnapshotResult>): SnapshotPlan {
  const image: string[] = [];
  const notImage: string[] = [];
  let errors = 0;
  for (const [id, r] of results) {
    if (r === "image") image.push(id);
    else if (r === "notImage") notImage.push(id);
    else errors++;
  }
  const answered = image.length + notImage.length;
  return { outage: answered > 0 && notImage.length / answered > OUTAGE_SHARE, image, notImage, errors };
}

export interface SnapshotOutcome extends Omit<SnapshotPlan, "image" | "notImage"> {
  checked: number;
  images: number;
  notImages: number;
  deactivated: number;
  /** Active cameras on the exempt roads after the run (the CMO logs them daily). */
  exemptRoads: Record<string, number>;
}

/** Checks the snapshots and applies the counters; the caller's upsert has already run. */
export async function applySnapshotChecks(
  prisma: PrismaClient,
  cameras: Array<{ id: string; url: string }>,
  check: typeof checkSnapshots = checkSnapshots,
): Promise<SnapshotOutcome> {
  const plan = planSnapshots(await check(cameras));
  if (!plan.outage) {
    if (plan.image.length > 0) {
      await prisma.camera.updateMany({ where: { id: { in: plan.image } }, data: { snapshotFailDays: 0 } });
    }
    if (plan.notImage.length > 0) {
      await prisma.camera.updateMany({ where: { id: { in: plan.notImage } }, data: { snapshotFailDays: { increment: 1 } } });
    }
  }
  // Always, outage or not: the upsert has just reactivated every camera in the
  // feed, and the ones already past their grace days go back to inactive.
  // This moves no counter, so a DGT outage can't change who is past them.
  const { count: deactivated } = await prisma.camera.updateMany({
    where: {
      isActive: true,
      snapshotFailDays: { gte: DEACTIVATE_AFTER_DAYS },
      OR: [{ roadNumber: null }, { roadNumber: { notIn: DEACTIVATION_EXEMPT_ROADS } }],
    },
    data: { isActive: false },
  });
  const exempt = await prisma.camera.groupBy({
    by: ["roadNumber"],
    where: { isActive: true, roadNumber: { in: DEACTIVATION_EXEMPT_ROADS } },
    _count: true,
  });
  const exemptRoads = Object.fromEntries(
    DEACTIVATION_EXEMPT_ROADS.map((road) => [road, exempt.find((g) => g.roadNumber === road)?._count ?? 0]),
  );
  return {
    outage: plan.outage,
    errors: plan.errors,
    checked: cameras.length,
    images: plan.image.length,
    notImages: plan.notImage.length,
    deactivated,
    exemptRoads,
  };
}
