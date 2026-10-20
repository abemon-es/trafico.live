/**
 * transit-gtfs (services/collector/tasks/transit-gtfs/collector.ts): where a
 * feed's ZIP comes from.
 *
 * On 2026-10-18 three feeds failed, as every week: MobilityData holds no copy
 * of them (files.mobilitydatabase.org 403, legacy mdb-latest 404). Zaratán and
 * RíoBUS answer 200 at the producer's own URL (urls.direct_download), which was
 * never tried. Albarracín is only on the NAP, which needs an API key (401).
 * The catalog rows and URLs below are the real ones.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:transit-gtfs
 */

import assert from "node:assert/strict";
import { discoverFeeds, fetchFeedZip } from "../services/collector/tasks/transit-gtfs/collector";

const ZIP = Buffer.from("PK\u0003\u0004 fake zip body");
const canonical = (id: string) => `https://files.mobilitydatabase.org/mdb-${id}/latest.zip`;
const ZARATAN = {
  mdbId: "3454",
  name: "Zaratán",
  downloadUrl: "https://storage.googleapis.com/storage/v1/b/mdb-latest/o/es-castilla-y-leon-zaratan-zaratan-gtfs-3454.zip?alt=media",
  directUrl: "https://files.catbox.moe/giiq3a.zip",
};

async function withFetch<T>(routes: Record<string, () => Response | Promise<Response>>, body: () => Promise<T>) {
  const real = globalThis.fetch;
  const requested: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    requested.push(url);
    const route = routes[url];
    return route ? route() : new Response("not found", { status: 404 });
  }) as typeof fetch;
  try {
    return { result: await body(), requested };
  } finally {
    globalThis.fetch = real;
  }
}

async function main() {
  // 1. No MobilityData copy: the producer URL serves it.
  const direct = await withFetch(
    {
      [canonical("3454")]: () => new Response("Forbidden", { status: 403 }),
      [ZARATAN.downloadUrl]: () => new Response("No such object", { status: 404 }),
      [ZARATAN.directUrl]: () => new Response(ZIP),
    },
    () => fetchFeedZip(ZARATAN),
  );
  assert.equal(direct.result.url, ZARATAN.directUrl);
  assert.equal(direct.result.buffer.subarray(0, 2).toString(), "PK");
  assert.deepEqual(direct.requested, [canonical("3454"), ZARATAN.downloadUrl, ZARATAN.directUrl]);

  // 2. The canonical copy answers: nothing else is asked.
  const first = await withFetch({ [canonical("3454")]: () => new Response(ZIP) }, () => fetchFeedZip(ZARATAN));
  assert.equal(first.result.url, canonical("3454"));
  assert.deepEqual(first.requested, [canonical("3454")]);

  // 3. A dropped connection on one URL moves on to the next.
  const dropped = await withFetch(
    {
      [canonical("3454")]: () => Promise.reject(new TypeError("fetch failed")),
      [ZARATAN.downloadUrl]: () => new Response(ZIP),
    },
    () => fetchFeedZip(ZARATAN),
  );
  assert.equal(dropped.result.url, ZARATAN.downloadUrl);

  // 4. Everything fails: the error names every attempt, not just the last.
  const nap = { mdbId: "2807", name: "Albarracín", downloadUrl: "https://storage.googleapis.com/x-2807.zip", directUrl: "https://nap.transportes.gob.es/api/Fichero/download/2807" };
  await assert.rejects(
    withFetch(
      {
        [canonical("2807")]: () => new Response("", { status: 403 }),
        [nap.directUrl]: () => new Response("", { status: 401 }),
      },
      () => fetchFeedZip(nap),
    ),
    (err: Error) => /HTTP 403 for https:\/\/files\.mobilitydatabase\.org.*HTTP 404 for https:\/\/storage.*HTTP 401 for https:\/\/nap\./.test(err.message),
  );

  // 5. The same URL twice is asked once.
  const same = await withFetch(
    { [canonical("9")]: () => new Response(ZIP) },
    () => fetchFeedZip({ mdbId: "9", name: "x", downloadUrl: canonical("9"), directUrl: null }),
  );
  assert.deepEqual(same.requested, [canonical("9")]);

  // 6. The catalog: directUrl is carried when it differs, and Albarracín (2807) is skipped.
  const header = "mdb_source_id,data_type,location.country_code,location.subdivision_name,location.municipality,provider,name,status,urls.latest,urls.direct_download";
  const rows = [
    `3454,gtfs,ES,Castilla y León,Zaratán,Zaratán,,,${ZARATAN.downloadUrl},${ZARATAN.directUrl}`,
    `2807,gtfs,ES,Aragón,Albarracín,Albarracín Movilidad,,,https://storage.googleapis.com/x-2807.zip,${nap.directUrl}`,
    `100,gtfs,ES,Madrid,Madrid,Metro,Metro de Madrid,,${canonical("100")},${canonical("100")}`,
    `101,gtfs,ES,Madrid,Madrid,Old,Old feed,deprecated,${canonical("101")},`,
  ];
  const catalog = await withFetch({ "https://bit.ly/catalogs-csv": () => new Response([header, ...rows].join("\n")) }, () => discoverFeeds());
  const ids = catalog.result.map((f) => f.mdbId);
  assert.deepEqual(ids, ["3454", "100"], "2807 skipped, deprecated skipped");
  assert.equal(catalog.result[0].directUrl, ZARATAN.directUrl);
  assert.equal(catalog.result[1].directUrl, null, "same as urls.latest → not repeated");

  console.log("transit-gtfs fetch: all checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
