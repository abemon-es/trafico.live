/**
 * The web's Redis client never gives up: Redis absent at startup, then back,
 * then a blip mid-life. Runs the real ioredis client (with the options from
 * src/lib/redis.ts) against a minimal in-process Redis server, with reconnect
 * timing scaled down 60× so "3 min without Redis" takes 3 s.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:redis
 */

import assert from "node:assert/strict";
import net from "node:net";
import Redis from "ioredis";
import {
  REDIS_TIMING,
  createRedisClient,
  getOrCompute,
  redisRetryDelay,
} from "../src/lib/redis";

const SCALED = { stepMs: REDIS_TIMING.stepMs / 60, capMs: REDIS_TIMING.capMs / 60 }; // ~8 ms, 500 ms
const OUTAGE_MS = 3000; // 3 min at 1/60

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Just enough RESP for ioredis: PING, INFO (ready check), GET, SET [NX], DEL. */
function startFakeRedis(port: number): Promise<{ stop: () => Promise<void> }> {
  const store = new Map<string, string>();
  const sockets = new Set<net.Socket>();
  const bulk = (s: string | undefined) => (s === undefined ? "$-1\r\n" : `$${Buffer.byteLength(s)}\r\n${s}\r\n`);

  function reply(args: string[]): string {
    const [cmd, ...rest] = args;
    switch (cmd.toUpperCase()) {
      case "PING":
        return "+PONG\r\n";
      case "INFO":
        return bulk("# Server\r\nloading:0\r\n");
      case "GET":
        return bulk(store.get(rest[0]));
      case "SET": {
        if (rest.some((a) => a.toUpperCase() === "NX") && store.has(rest[0])) return "$-1\r\n";
        store.set(rest[0], rest[1]);
        return "+OK\r\n";
      }
      case "DEL":
        return `:${store.delete(rest[0]) ? 1 : 0}\r\n`;
      default:
        return "+OK\r\n";
    }
  }

  /** One RESP array command from the front of `buf`, or null if incomplete. */
  function parse(buf: Buffer): { args: string[]; used: number } | null {
    const text = buf.toString("latin1");
    if (!text.startsWith("*")) return null;
    let pos = text.indexOf("\r\n");
    if (pos < 0) return null;
    const n = Number(text.slice(1, pos));
    pos += 2;
    const args: string[] = [];
    for (let i = 0; i < n; i++) {
      const end = text.indexOf("\r\n", pos);
      if (end < 0) return null;
      const len = Number(text.slice(pos + 1, end));
      const start = end + 2;
      if (text.length < start + len + 2) return null;
      args.push(buf.subarray(start, start + len).toString("utf8"));
      pos = start + len + 2;
    }
    return { args, used: pos };
  }

  const server = net.createServer((sock) => {
    sockets.add(sock);
    sock.on("close", () => sockets.delete(sock));
    sock.on("error", () => undefined);
    let buf = Buffer.alloc(0);
    sock.on("data", (d) => {
      buf = Buffer.concat([buf, d]);
      for (let cmd = parse(buf); cmd; cmd = parse(buf)) {
        buf = buf.subarray(cmd.used);
        sock.write(reply(cmd.args));
      }
    });
  });

  return new Promise((resolve) =>
    server.listen(port, "127.0.0.1", () =>
      resolve({
        stop: () =>
          new Promise<void>((done) => {
            for (const s of sockets) s.destroy();
            server.close(() => done());
          }),
      })
    )
  );
}

async function freePort(): Promise<number> {
  const probe = net.createServer();
  await new Promise<void>((r) => probe.listen(0, "127.0.0.1", () => r()));
  const { port } = probe.address() as net.AddressInfo;
  await new Promise<void>((r) => probe.close(() => r()));
  return port;
}

function waitFor(client: Redis, event: string, timeoutMs: number): Promise<number> {
  const t0 = Date.now();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no "${event}" within ${timeoutMs} ms`)), timeoutMs);
    client.once(event, () => {
      clearTimeout(timer);
      resolve(Date.now() - t0);
    });
  });
}

async function main() {
  // Quiet the client's own logging; keep it to check the throttle.
  const warnings: string[] = [];
  const realWarn = console.warn;
  const realLog = console.log;
  const realError = console.error;
  console.warn = (...a: unknown[]) => void warnings.push(a.join(" "));
  console.log = () => undefined;
  console.error = () => undefined;

  try {
    // 1. Production schedule: never null, 500 ms steps up to 30 s, so after
    // 3 min of outage it is still trying and the next try is ≤ 30 s away.
    let elapsed = 0;
    let attempts = 0;
    for (let times = 1; elapsed < 180_000; times++) {
      const d = redisRetryDelay(times);
      assert.ok(d >= REDIS_TIMING.stepMs && d <= REDIS_TIMING.capMs, `attempt ${times}: ${d} ms`);
      elapsed += d;
      attempts = times;
    }
    assert.ok(attempts >= 20, `${attempts} attempts in 3 min`);
    assert.ok(redisRetryDelay(attempts + 1) <= 30_000);
    assert.equal(redisRetryDelay(10_000), REDIS_TIMING.capMs);

    const port = await freePort();
    const url = `redis://127.0.0.1:${port}`;

    // 2. Redis absent at startup for "3 min".
    const client = createRedisClient(url, SCALED);
    client.on("error", () => undefined);
    let reconnects = 0;
    client.on("reconnecting", () => reconnects++);

    await sleep(300);
    // While disconnected a command fails at once instead of hanging.
    const t0 = Date.now();
    await assert.rejects(client.get("k"));
    assert.ok(Date.now() - t0 < 100, `command took ${Date.now() - t0} ms to fail`);

    await sleep(OUTAGE_MS - 300);
    assert.ok(reconnects > 3, `only ${reconnects} reconnects: it gave up`);
    assert.notEqual(client.status, "end");

    // 3. Redis comes back: ready within one capped delay, commands work.
    const fake = await startFakeRedis(port);
    const readyIn = await waitFor(client, "ready", SCALED.capMs + 1000);
    assert.equal(await client.set("k", "v"), "OK");
    assert.equal(await client.get("k"), "v");

    // 4. A blip mid-life: the server drops, comes back 1 s later, and the
    // same client reconnects by itself.
    await fake.stop();
    await sleep(1000);
    assert.notEqual(client.status, "end");
    const fake2 = await startFakeRedis(port);
    await waitFor(client, "ready", SCALED.capMs + 1000);
    assert.equal(await client.set("k2", "v2"), "OK");
    assert.equal(await client.get("k2"), "v2");

    // The log is throttled: attempts 1-3, then every 10th.
    const attemptsLogged = warnings
      .map((w) => w.match(/Reconnect attempt (\d+)/)?.[1])
      .filter(Boolean)
      .map(Number);
    assert.ok(attemptsLogged.every((n) => n <= 3 || n % 10 === 0), `logged ${attemptsLogged.join(",")}`);

    client.disconnect();
    await fake2.stop();

    // 5. Regression: the old strategy (null after 3 attempts) ends the client
    // for good, and it never reconnects once Redis is back.
    const legacyPort = await freePort();
    const legacy = new Redis(`redis://127.0.0.1:${legacyPort}`, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 2000)),
    });
    legacy.on("error", () => undefined);
    await sleep(1500);
    assert.equal(legacy.status, "end");
    const legacyServer = await startFakeRedis(legacyPort);
    await sleep(500);
    assert.equal(legacy.status, "end");
    await legacyServer.stop();

    // 6. getOrCompute without Redis computes instead of throwing.
    assert.equal(await getOrCompute("k", 10, async () => 42), 42);

    realLog(
      `  startup outage: ${reconnects} reconnects in ${OUTAGE_MS} ms, ready ${readyIn} ms after Redis came back; ` +
        `legacy client: ${legacy.status}`
    );
    realLog("redis-reconnect: ok");
  } finally {
    console.warn = realWarn;
    console.log = realLog;
    console.error = realError;
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
