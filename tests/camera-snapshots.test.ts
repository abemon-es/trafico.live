/**
 * Camera snapshots that aren't images: checked once a day, «sin imagen» on the
 * pages from the first day, inactive after 3 in a row, never on the pilot
 * roads, and a DGT outage doesn't count.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:camera-snapshots
 */

import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { PrismaClient } from "@prisma/client";
import {
  CHECK_CONCURRENCY,
  DEACTIVATE_AFTER_DAYS,
  DEACTIVATION_EXEMPT_ROADS,
  applySnapshotChecks,
  checkSnapshots,
  planSnapshots,
  type SnapshotResult,
} from "../services/collector/tasks/camera/snapshots";
import { cameraImage } from "../src/lib/cameras/snapshot";

async function main() {
  // checkSnapshots: image vs not, errors apart, never more than CHECK_CONCURRENCY at once.
  let inFlight = 0;
  let maxInFlight = 0;
  const answers: Record<string, () => Response> = {
    ok: () => new Response(null, { status: 200, headers: { "content-type": "image/jpeg" } }),
    gone: () => new Response(null, { status: 404, headers: { "content-type": "text/html" } }),
    html200: () => new Response(null, { status: 200, headers: { "content-type": "text/html" } }),
  };
  const fakeFetch = (async (url: string, init?: RequestInit) => {
    assert.equal(init?.method, "HEAD");
    assert.match(String((init?.headers as Record<string, string>)["User-Agent"]), /trafico\.live/);
    inFlight++;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((r) => setTimeout(r, 5));
    inFlight--;
    const key = url.split("/").pop()!.split("-")[0];
    if (key === "down") throw new TypeError("fetch failed");
    return answers[key]();
  }) as typeof fetch;
  const cams = [
    ...Array.from({ length: 10 }, (_, i) => ({ id: `a${i}`, url: `https://x/ok-${i}` })),
    { id: "g", url: "https://x/gone-1" },
    { id: "h", url: "https://x/html200-1" },
    { id: "d", url: "https://x/down-1" },
  ];
  const results = await checkSnapshots(cams, { fetchImpl: fakeFetch });
  assert.equal(results.get("a0"), "image");
  assert.equal(results.get("g"), "notImage", "404 text/html");
  assert.equal(results.get("h"), "notImage", "200 but not an image");
  assert.equal(results.get("d"), "error", "a network error counts neither way");
  assert.ok(maxInFlight <= CHECK_CONCURRENCY, `at most ${CHECK_CONCURRENCY} at once (saw ${maxInFlight})`);

  // planSnapshots: an outage when more than half of the answers aren't images.
  const r = (pairs: Array<[string, SnapshotResult]>) => new Map(pairs);
  assert.equal(planSnapshots(r([["a", "image"], ["b", "notImage"], ["c", "error"]])).outage, false, "half is not more than half");
  assert.equal(planSnapshots(r([["a", "image"], ["b", "notImage"], ["c", "notImage"]])).outage, true);
  assert.equal(planSnapshots(r([["a", "error"], ["b", "error"]])).outage, false, "errors aren't answers");

  // applySnapshotChecks: counters, deactivation after the grace days except on the pilot roads.
  const calls: Array<{ where: Record<string, unknown>; data: Record<string, unknown> }> = [];
  const prisma = {
    camera: {
      updateMany: async (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => { calls.push(args); return { count: args.data.isActive === false ? 2 : 0 }; },
      groupBy: async () => [{ roadNumber: "A-5", _count: 74 }, { roadNumber: "A-6", _count: 120 }],
    },
  } as unknown as PrismaClient;
  const fixed = (m: Map<string, SnapshotResult>) => (async () => m) as unknown as typeof checkSnapshots;
  const day = await applySnapshotChecks(prisma, [], fixed(r([["a", "image"], ["b", "image"], ["c", "notImage"], ["d", "error"]])));
  assert.deepEqual(calls[0], { where: { id: { in: ["a", "b"] } }, data: { snapshotFailDays: 0 } });
  assert.deepEqual(calls[1], { where: { id: { in: ["c"] } }, data: { snapshotFailDays: { increment: 1 } } });
  assert.deepEqual(calls[2], {
    where: {
      isActive: true,
      snapshotFailDays: { gte: DEACTIVATE_AFTER_DAYS },
      OR: [{ roadNumber: null }, { roadNumber: { notIn: DEACTIVATION_EXEMPT_ROADS } }],
    },
    data: { isActive: false },
  });
  assert.equal(DEACTIVATE_AFTER_DAYS, 3);
  assert.deepEqual(DEACTIVATION_EXEMPT_ROADS, ["A-5", "A-6"]);
  assert.equal(day.deactivated, 2);
  assert.deepEqual(day.exemptRoads, { "A-5": 74, "A-6": 120 }, "the pilot roads' active cameras, logged daily");

  calls.length = 0;
  const outage = await applySnapshotChecks(prisma, [], fixed(r([["a", "image"], ["b", "notImage"], ["c", "notImage"]])));
  assert.equal(outage.outage, true);
  assert.equal(calls.length, 0, "a DGT outage changes no counter and deactivates nothing");

  // The pages: «sin imagen» from the first failed day.
  assert.equal(cameraImage({ thumbnailUrl: "https://e/1.jpg", snapshotFailDays: 0 }), "https://e/1.jpg");
  assert.equal(cameraImage({ thumbnailUrl: "https://e/1.jpg", snapshotFailDays: 1 }), null);
  assert.equal(cameraImage({ thumbnailUrl: null, snapshotFailDays: 0 }), null);

  // No page renders a thumbnailUrl directly: always through cameraImage().
  const direct: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name.endsWith(".tsx")) {
        readFileSync(path, "utf8").split("\n").forEach((line, i) => {
          if (/src=\{[\w.?]*thumbnailUrl\}/.test(line)) direct.push(`${path.slice(process.cwd().length + 1)}:${i + 1}`);
        });
      }
    }
  };
  walk(join(process.cwd(), "src"));
  assert.deepEqual(direct, [], `thumbnails rendered without cameraImage():\n${direct.join("\n")}`);

  console.log("camera snapshots: all checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
