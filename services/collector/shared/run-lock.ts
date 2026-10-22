/**
 * One run of a task at a time, across every collector container: a Redis key
 * `collector-run:<task>` held while the run lives (CTO, 2026-10-22).
 *
 * The crontabs' `flock /tmp/<task>.lock` only sees its own container, and
 * health-check recovers tasks in-process from collector-realtime while their
 * schedule lives in another tier (charger: collector-daily). A Postgres
 * advisory lock isn't safe behind PgBouncer in transaction mode.
 *
 * - SET NX PX 180000 with a random token, renewed every 60 s: a run killed by
 *   OOM or a recreate leaves the key for 3 min at most.
 * - Release and renewal are compare-and-delete / compare-and-expire in Lua:
 *   a run whose lock expired (its renewal failed) can never touch the lock a
 *   later run took.
 * - Fail-open: if Redis doesn't answer, the run goes ahead without a lock, as
 *   before. Redis down must not stop the collectors.
 * The value is `<token>|<acquired ms>`, so a skip can say who holds it and
 * since when: a lock that is never released shows up in the logs.
 */
import { randomUUID } from "node:crypto";

/** The ioredis calls this module needs; a test passes a fake. */
export interface LockRedis {
  set(key: string, value: string, px: "PX", ms: number, nx: "NX"): Promise<string | null>;
  get(key: string): Promise<string | null>;
  eval(script: string, numKeys: number, ...args: (string | number)[]): Promise<unknown>;
  quit(): Promise<unknown>;
}

export const LOCK_TTL_MS = 180_000;
export const LOCK_RENEW_MS = 60_000;

export const RELEASE_SCRIPT = 'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end';
export const RENEW_SCRIPT = 'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("pexpire", KEYS[1], ARGV[2]) else return 0 end';

export const lockKey = (task: string) => `collector-run:${task}`;

export interface RunLock {
  token: string;
  /** Extend the TTL; false when the lock is no longer ours (it expired). */
  renew(): Promise<boolean>;
  /** Delete the key only if it still holds our value; then close the client. */
  release(): Promise<void>;
}

export type LockResult =
  | { acquired: true; lock: RunLock }
  | { acquired: false; holder: { token: string | null; ageSeconds: number | null } }
  | { acquired: null; reason: string };

async function defaultRedis(): Promise<LockRedis | null> {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  const { default: Redis } = await import("ioredis");
  // Fail fast: connect explicitly (without an offline queue a command sent
  // before "ready" is rejected), 2 s to connect, no retries, no reconnects
  // that would keep the process alive.
  const client = new Redis(url, {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
    retryStrategy: () => null,
  });
  // The failure reaches us through connect() and each command; without a
  // listener ioredis also prints «Unhandled error event» to stderr, which Loki
  // would count as errors while Redis is down.
  client.on("error", () => {});
  try {
    await client.connect();
  } catch (err) {
    client.disconnect();
    throw err;
  }
  return client as unknown as LockRedis;
}

export async function acquireRunLock(
  task: string,
  opts: { redis?: LockRedis | null; now?: () => number; renewMs?: number; ttlMs?: number; onLost?: () => void } = {}
): Promise<LockResult> {
  const now = opts.now ?? Date.now;
  const ttl = opts.ttlMs ?? LOCK_TTL_MS;
  const renewMs = opts.renewMs ?? LOCK_RENEW_MS;
  let redis: LockRedis | null;
  try {
    redis = opts.redis !== undefined ? opts.redis : await defaultRedis();
  } catch (err) {
    return { acquired: null, reason: err instanceof Error ? err.message : String(err) };
  }
  if (!redis) return { acquired: null, reason: "REDIS_URL not set" };
  const client = redis;
  const key = lockKey(task);
  const token = randomUUID();
  const value = `${token}|${now()}`;
  try {
    const ok = await client.set(key, value, "PX", ttl, "NX");
    if (ok !== "OK") {
      const held = await client.get(key).catch(() => null);
      await client.quit().catch(() => {});
      const [holderToken, at] = (held ?? "").split("|");
      const since = Number(at);
      return {
        acquired: false,
        holder: { token: holderToken || null, ageSeconds: Number.isFinite(since) && since > 0 ? Math.floor((now() - since) / 1000) : null },
      };
    }
  } catch (err) {
    await client.quit().catch(() => {});
    return { acquired: null, reason: err instanceof Error ? err.message : String(err) };
  }

  let timer: ReturnType<typeof setInterval> | null = null;
  const lock: RunLock = {
    token,
    async renew() {
      try {
        return (await client.eval(RENEW_SCRIPT, 1, key, value, ttl)) === 1;
      } catch {
        return false;
      }
    },
    async release() {
      if (timer) clearInterval(timer);
      timer = null;
      await client.eval(RELEASE_SCRIPT, 1, key, value).catch(() => {});
      await client.quit().catch(() => {});
    },
  };
  if (renewMs > 0) {
    timer = setInterval(() => {
      void lock.renew().then((ours) => {
        if (!ours) opts.onLost?.();
      });
    }, renewMs);
    timer.unref?.();
  }
  return { acquired: true, lock };
}
