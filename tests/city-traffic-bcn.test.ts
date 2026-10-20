/**
 * city-traffic, Barcelona (services/collector/tasks/city-traffic/collector.ts).
 *
 * - estat 0 is «Sin datos»: it must be stored as no level, not as fluid
 *   (201 of 532 sections said 0 on 2026-10-20 at 16:05Z).
 * - The portal's TRAMS_TRAMS.dat is the same file as bcn.cat's dadestrams.dat,
 *   so it is only the fallback, never a second source (it stored every section
 *   twice as BCN-SEC-<id>, then 502'd and kept the task `partial`).
 *
 * - Valencia's estado follows the layer's own domain: 0 Fluido … 4 Sin datos
 *   (until 2026-10-20 0 was read as no data, and 4 as holdups).
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:city-traffic
 */

import assert from "node:assert/strict";
import type { PrismaClient } from "@prisma/client";
import { bcnEstatToLevel, run, vlcArcGisEstadoToLevel } from "../services/collector/tasks/city-traffic/collector";

const BCN = "https://www.bcn.cat/transit/dades/dadestrams.dat";
const MIRROR = "2d456eb5-4ea6-4f68-9794-2f3f1a58a933";
const GEO = "c97072a3-3619-4547-84dd-f1999d2a3fec";
const VLC = "geoportal.valencia.es";

// tram#timestamp#estatActual#estatPrevist, as bcn.cat serves it
const DAT = ["1#20261020180551#1#1", "2#20261020180551#0#0", "3#20261020180551#3#4", "4#20261020180551#5#6", "5#20261020180551#6#0"].join("\n");
const GEO_CSV = ["Tram,Tram_Components,Descripció,Longitud,Latitud", "1,1,Diagonal,2.15,41.39", "2,1,Gran Via,2.16,41.38", "3,1,Aragó,2.17,41.39", "4,1,Meridiana,2.18,41.41", "5,1,Ronda Litoral,2.19,41.38"].join("\n");
const VLC_JSON = JSON.stringify({
  features: [
    { attributes: { idtramo: 10, denominacion: "Blasco Ibáñez", estado: 0 }, geometry: { paths: [[[-0.36, 39.47], [-0.35, 39.47]]] } },
    { attributes: { idtramo: 11, denominacion: "Av. del Cid", estado: 4 }, geometry: { paths: [[[-0.40, 39.47], [-0.39, 39.47]]] } },
  ],
});

type Route = (url: string) => Response | Promise<Response>;
const socketClosed = () => new TypeError("fetch failed", { cause: new Error("other side closed") });

function fakePrisma() {
  const byKey = new Map<string, { id: string; sensorId: string }>();
  const byId = new Map<string, string>();
  const readings: { sensorId: string; serviceLevel: number | null; prediction: number | null }[] = [];
  const deleted: unknown[] = [];
  let heartbeat: { status: string; meta: Record<string, unknown> } | null = null;
  const prisma = {
    cityTrafficSensor: {
      findMany: async () => [],
      upsert: async ({ where, create }: { where: { city_sensorId: { city: string; sensorId: string } }; create: { sensorId: string } }) => {
        const key = `${where.city_sensorId.city}/${where.city_sensorId.sensorId}`;
        if (!byKey.has(key)) {
          const id = `id-${byKey.size}`;
          byKey.set(key, { id, sensorId: create.sensorId });
          byId.set(id, create.sensorId);
        }
        return byKey.get(key);
      },
      deleteMany: async ({ where }: { where: unknown }) => {
        deleted.push(where);
        return { count: 0 };
      },
    },
    cityTrafficReading: {
      create: async ({ data }: { data: { sensorId: string; serviceLevel: number | null; prediction: number | null } }) => {
        readings.push({ ...data, sensorId: byId.get(data.sensorId)! });
        return data;
      },
    },
    $executeRaw: async () => 0,
    collectorHeartbeat: {
      upsert: async ({ create }: { create: { status: string; meta: Record<string, unknown> } }) => {
        heartbeat = { status: create.status, meta: create.meta };
      },
    },
  };
  return {
    prisma: prisma as unknown as PrismaClient,
    readings,
    deleted,
    heartbeat: () => heartbeat!,
    level: (sensorId: string) => readings.find((r) => r.sensorId === sensorId),
  };
}

async function runWith(bcn: Route, mirror: Route) {
  const db = fakePrisma();
  const fetched: string[] = [];
  const real = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    fetched.push(url);
    if (url === BCN) return bcn(url);
    if (url.includes(MIRROR)) return mirror(url);
    if (url.includes(GEO)) return new Response(GEO_CSV);
    if (url.includes(VLC)) return new Response(VLC_JSON);
    return new Response("not found", { status: 404 });
  }) as typeof fetch;
  try {
    await run(db.prisma);
  } finally {
    globalThis.fetch = real;
  }
  return { ...db, mirrorCalls: fetched.filter((u) => u.includes(MIRROR)).length };
}

async function main() {
  // 1. estat → level: 0 and anything unknown are no level, not fluid.
  assert.equal(bcnEstatToLevel(0), null);
  assert.equal(bcnEstatToLevel(1), 0);
  assert.equal(bcnEstatToLevel(2), 0);
  assert.equal(bcnEstatToLevel(3), 1);
  assert.equal(bcnEstatToLevel(4), 2);
  assert.equal(bcnEstatToLevel(5), 3);
  assert.equal(bcnEstatToLevel(6), 3);
  assert.equal(bcnEstatToLevel(7), null);
  assert.equal(bcnEstatToLevel(NaN), null);

  // 1b. Valencia: the coded-value domain of MapServer/192 (5-9 are the same, underground).
  const vlc = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, -1].map((e) => vlcArcGisEstadoToLevel(e));
  assert.deepEqual(vlc, [0, 1, 3, 3, null, 0, 1, 3, 3, null, null, null]);
  assert.equal(vlcArcGisEstadoToLevel(null), null);

  // 2. bcn.cat answers: one Barcelona source, the mirror is never asked, the run is `ok`.
  const ok = await runWith(() => new Response(DAT), () => new Response("Bad Gateway", { status: 502 }));
  assert.equal(ok.mirrorCalls, 0);
  assert.equal(ok.heartbeat().status, "ok");
  assert.equal(ok.heartbeat().meta.failedCities, undefined);
  assert.equal(ok.heartbeat().meta.readings, 7, "5 Barcelona + 2 Valencia");
  assert.ok(!ok.readings.some((r) => r.sensorId.startsWith("BCN-SEC-")), "no second copy of Barcelona");
  assert.deepEqual(ok.level("BCN-1"), { sensorId: "BCN-1", serviceLevel: 0, prediction: 0, intensity: null, occupancy: null, speed: null });
  assert.equal(ok.level("BCN-2")!.serviceLevel, null, "estat 0 is no data");
  assert.equal(ok.level("BCN-2")!.prediction, null);
  assert.equal(ok.level("BCN-3")!.serviceLevel, 1);
  assert.equal(ok.level("BCN-3")!.prediction, 2);
  assert.equal(ok.level("BCN-4")!.serviceLevel, 3);
  assert.equal(ok.level("BCN-5")!.prediction, null);
  assert.equal(ok.level("VLC-ARC-10")!.serviceLevel, 0, "Valencia estado 0 is Fluido");
  assert.equal(ok.level("VLC-ARC-11")!.serviceLevel, null, "Valencia estado 4 is Sin datos");
  // The retired source's sensors are pruned, and only those.
  assert.deepEqual(ok.deleted, [{ city: "BARCELONA", sensorId: { startsWith: "BCN-SEC-" } }]);

  // 3. bcn.cat fails (HTTP or socket): the mirror serves the same file, still `ok`.
  for (const bcn of [() => new Response("", { status: 503 }), () => Promise.reject(socketClosed())]) {
    const fb = await runWith(bcn, () => new Response(DAT));
    assert.equal(fb.mirrorCalls, 1);
    assert.equal(fb.heartbeat().status, "ok");
    assert.equal(fb.readings.filter((r) => r.sensorId.startsWith("BCN-")).length, 5);
  }

  // 4. Both fail: Barcelona is the one failed source of two, and the run says so.
  const down = await runWith(() => Promise.reject(socketClosed()), () => new Response("Bad Gateway", { status: 502 }));
  assert.equal(down.heartbeat().status, "partial");
  assert.equal(down.heartbeat().meta.reason, "1/2 sources failed: Barcelona (trams)");
  const failed = down.heartbeat().meta.failedCities as { city: string; error: string }[];
  assert.equal(failed.length, 1);
  assert.match(failed[0].error, /Barcelona API error: 502/);
  assert.equal(down.readings.length, 2, "Valencia still stored");

  console.log("city-traffic Barcelona: all checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
