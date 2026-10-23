/**
 * The two collector paths that take hostile input from third parties, after
 * ws ^8.21.0 and protobufjs ≥7.6.5 (CSO, 2026-10-22; the other 16 high
 * advisories are not reachable, BACKLOG cycle 121).
 *   1. a recorded GTFS-RT frame (Metro Bilbao vehicle positions, 22-10-2026)
 *      still decodes into vehicle rows;
 *   2. a frame of 200,000 nested groups and a frame that declares a field
 *      longer than itself are rejected, quickly, without taking the process
 *      down: decodeVehiclePositions returns no rows;
 *   3. the AIS client (shared/ws-client.ts) against a local ws server:
 *      subscribes, receives whole and fragmented messages, and stops;
 *   4. the image's versions are the patched ones.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure. Run it
 * in a collector image built from this tree (its node_modules carry the
 * versions under test).
 *   npm run test:collector-hostile-input
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { createReconnectingWS } from "../services/collector/shared/ws-client";

const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const require = createRequire(join(ROOT, "services/collector/package.json"));

const asArrayBuffer = (b: Uint8Array) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;

// Loaded at run time: its gtfs-realtime-bindings lives only in the collector's
// node_modules, so the web tsc (which type-checks tests/) must not follow it.
const PARSER = "../services/collector/tasks/transit-rt-shared/parser";
type Decode = (b: ArrayBuffer, op: string, at: Date) => { latitude: number; longitude: number }[];

async function main() {
  const { decodeVehiclePositions } = (await import(PARSER)) as { decodeVehiclePositions: Decode };
  // 4. The versions under test.
  const semverAtLeast = (v: string, min: [number, number, number]) => {
    const p = v.split(".").map(Number);
    for (let i = 0; i < 3; i++) if (p[i] !== min[i]) return p[i] > min[i];
    return true;
  };
  const wsVersion = (require("ws/package.json") as { version: string }).version;
  const pbVersion = (require("protobufjs/package.json") as { version: string }).version;
  assert.ok(semverAtLeast(wsVersion, [8, 21, 0]), `ws ${wsVersion} ≥ 8.21.0`);
  assert.ok(semverAtLeast(pbVersion, [7, 6, 5]), `protobufjs ${pbVersion} ≥ 7.6.5`);

  // 1. A recorded frame.
  const frame = readFileSync(join(ROOT, "tests/fixtures/gtfs-rt/metro-bilbao-vehicle-positions.pb"));
  const rows = decodeVehiclePositions(asArrayBuffer(frame), "op-test", new Date("2026-10-22T17:35:00Z"));
  assert.ok(rows.length > 0, "the recorded frame decodes into vehicle rows");
  for (const r of rows) {
    const lat = Number(r.latitude);
    const lon = Number(r.longitude);
    assert.ok(lat > 43 && lat < 43.5 && lon > -3.2 && lon < -2.7, "Metro Bilbao positions are in Bizkaia");
  }

  // 2. Hostile frames: rejected, fast, the process still standing.
  {
    const startGroup = [0x9b, 0x06]; // field 99, wire type 3 (start group)
    const nested = new Uint8Array(200_000 * startGroup.length);
    for (let i = 0; i < nested.length; i += 2) nested.set(startGroup, i);
    const t0 = Date.now();
    assert.deepEqual(decodeVehiclePositions(asArrayBuffer(nested), "op-test", new Date()), [], "deep nesting: no rows");
    assert.ok(Date.now() - t0 < 2000, `deep nesting rejected in ${Date.now() - t0} ms`);

    // field 1 (header), wire type 2, declared length 2^31 − 1, then 3 bytes.
    const oversized = Uint8Array.from([0x0a, 0xff, 0xff, 0xff, 0xff, 0x07, 0x01, 0x02, 0x03]);
    const t1 = Date.now();
    assert.deepEqual(decodeVehiclePositions(asArrayBuffer(oversized), "op-test", new Date()), [], "oversized length: no rows");
    assert.ok(Date.now() - t1 < 500, "oversized length rejected at once");
  }

  // 3. The AIS client against a local server.
  {
    const server = new WebSocketServer({ host: "127.0.0.1", port: 0 });
    await new Promise<void>((res) => server.once("listening", () => res()));
    const port = (server.address() as { port: number }).port;
    const subscriptions: unknown[] = [];
    server.on("connection", (sock) => {
      sock.on("message", (m) => {
        subscriptions.push(JSON.parse(m.toString()));
        sock.send(JSON.stringify({ n: 1 }));
        // One message in tiny fragments: the client must get it whole.
        const whole = JSON.stringify({ n: 2, pad: "x".repeat(200) });
        for (let i = 0; i < whole.length; i += 4) sock.send(whole.slice(i, i + 4), { fin: i + 4 >= whole.length });
      });
    });
    const got: unknown[] = [];
    const done = new Promise<void>((res) => {
      const client = createReconnectingWS({
        url: `ws://127.0.0.1:${port}`,
        subscriptionMessage: { APIKey: "test", BoundingBoxes: [] },
        task: "ais-stream-test",
        onMessage: (d) => {
          got.push(d);
          if (got.length === 2) {
            client.stop();
            res();
          }
        },
      });
    });
    await Promise.race([done, new Promise((_, rej) => setTimeout(() => rej(new Error("ws client: no messages in 5 s")), 5000))]);
    assert.deepEqual(subscriptions, [{ APIKey: "test", BoundingBoxes: [] }], "it subscribed once");
    assert.equal((got[0] as { n: number }).n, 1);
    assert.equal((got[1] as { n: number; pad: string }).pad.length, 200, "the fragmented message arrived whole");
    await new Promise<void>((res) => server.close(() => res()));
  }

  console.log(`collector-hostile-input: ok (ws ${wsVersion}, protobufjs ${pbVersion}; recorded frame ${rows.length} vehicles; nested and oversized frames rejected; AIS client whole and fragmented)`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
