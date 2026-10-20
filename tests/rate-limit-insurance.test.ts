/**
 * Rate limiters keep limiting while Redis is down. The Redis client fails at
 * once when disconnected (src/lib/redis.ts), so a limiter without insurance
 * rejects every request with a plain Error and every caller fails open; with
 * createLimiter's in-memory insurance the 6th request of a 5-point limit is
 * refused with RateLimiterRes, which is what callers turn into a 429.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:rate-limit
 */

import assert from "node:assert/strict";
import net from "node:net";
import { RateLimiterRedis, RateLimiterRes } from "rate-limiter-flexible";
import { createLimiter } from "../src/lib/limiter";
import { createRedisClient } from "../src/lib/redis";

async function closedPort(): Promise<number> {
  const probe = net.createServer();
  await new Promise<void>((r) => probe.listen(0, "127.0.0.1", () => r()));
  const { port } = probe.address() as net.AddressInfo;
  await new Promise<void>((r) => probe.close(() => r()));
  return port;
}

/** Outcome of `n` consumes in a row: "ok", "limited" (RateLimiterRes) or "error". */
async function consumeRow(limiter: { consume(key: string): Promise<unknown> }, n: number): Promise<string[]> {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    try {
      await limiter.consume("203.0.113.7");
      out.push("ok");
    } catch (err) {
      out.push(err instanceof RateLimiterRes ? "limited" : "error");
    }
  }
  return out;
}

async function main() {
  const realLog = console.log;
  const realWarn = console.warn;
  const realError = console.error;
  console.log = () => undefined;
  console.warn = () => undefined;
  console.error = () => undefined;

  try {
    // A client to a port nobody listens on: Redis down for the whole test.
    const down = createRedisClient(`redis://127.0.0.1:${await closedPort()}`, { stepMs: 50, capMs: 200 });
    down.on("error", () => undefined);
    const opts = { keyPrefix: "test:contact", points: 5, duration: 3600, blockDuration: 3600 };

    // 1. With insurance: 5 pass, the 6th is limited, and so is the 7th.
    const insured = await consumeRow(createLimiter(opts, down), 7);
    assert.deepEqual(insured, ["ok", "ok", "ok", "ok", "ok", "limited", "limited"]);

    // 2. Regression: the same limiter without insurance errors on every
    // request, which every caller treats as "allow" (fail open).
    const bare = await consumeRow(new RateLimiterRedis({ ...opts, storeClient: down }), 7);
    assert.deepEqual(bare, Array(7).fill("error"));

    // 3. Chat's shape (no block, daily window): the same.
    const chat = await consumeRow(
      createLimiter({ keyPrefix: "test:chat", points: 5, duration: 86_400, blockDuration: 0 }, down),
      6
    );
    assert.equal(chat[5], "limited");

    // 4. No Redis configured at all: plain memory limiter, same result.
    const memoryOnly = await consumeRow(createLimiter({ ...opts, keyPrefix: "test:nores" }, null), 6);
    assert.deepEqual(memoryOnly, ["ok", "ok", "ok", "ok", "ok", "limited"]);

    down.disconnect();
    realLog(`  redis down → insured: ${insured.join(",")}; bare: ${bare.join(",")}`);
    realLog("rate-limit-insurance: ok");
  } finally {
    console.log = realLog;
    console.warn = realWarn;
    console.error = realError;
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
