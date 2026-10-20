import Redis, { type RedisOptions } from "ioredis";
import * as Sentry from "@sentry/nextjs";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

/**
 * Reconnect timing. The client never gives up: on 2026-10-20 trafico-live
 * started during a 2-minute mesh outage, its old strategy returned null after
 * 3 attempts (~1.2 s of retries), and the app ran without Redis for 1.5 h,
 * until a manual restart. There have been 4 such blips in 14 h.
 */
export interface RedisTiming {
  /** Each attempt waits this much longer than the previous one. */
  stepMs: number;
  /** ...up to this. */
  capMs: number;
}

export const REDIS_TIMING: RedisTiming = { stepMs: 500, capMs: 30_000 };

/** Delay before reconnect attempt `times` (1-based). Never null: never give up. */
export function redisRetryDelay(times: number, timing: RedisTiming = REDIS_TIMING): number {
  return Math.min(times * timing.stepMs, timing.capMs);
}

export function redisOptions(timing: RedisTiming = REDIS_TIMING): RedisOptions {
  return {
    // While disconnected, a command fails at once instead of queueing for the
    // whole outage: every caller treats Redis as optional (cache miss → DB,
    // rate limiter → its fallback), and rate-limiter-flexible recommends it.
    enableOfflineQueue: false,
    // A command already sent when the connection drops is retried on one
    // reconnect, then fails. Bounded per request, not per connection.
    maxRetriesPerRequest: 1,
    // A connection that is up but stuck cannot hold a request for long.
    commandTimeout: 2000,
    retryStrategy(times) {
      const delay = redisRetryDelay(times, timing);
      // Every attempt for the first few, then every 10th: a long outage would
      // otherwise write a line every 30 s for hours.
      if (times <= 3 || times % 10 === 0) {
        console.warn(`[Redis] Reconnect attempt ${times} in ${delay} ms`);
      }
      return delay;
    },
    reconnectOnError(err) {
      return err.message.includes("READONLY");
    },
  };
}

export function createRedisClient(redisUrl: string, timing: RedisTiming = REDIS_TIMING): Redis {
  const client = new Redis(redisUrl, redisOptions(timing));
  // One Sentry event per outage, not one per failed attempt.
  let outageSince: number | null = null;

  client.on("error", (err) => {
    if (outageSince === null) {
      outageSince = Date.now();
      console.error("[Redis] Connection error:", err.message);
      Sentry.captureException(err, { tags: { layer: "redis" } });
    }
  });

  client.on("ready", () => {
    if (outageSince !== null) {
      console.log(`[Redis] Reconnected after ${Math.round((Date.now() - outageSince) / 1000)} s`);
      outageSince = null;
    } else {
      console.log("[Redis] Connected successfully");
    }
  });

  return client;
}

function createDefaultClient(): Redis | null {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.warn("[Redis] REDIS_URL not set - caching and rate limiting disabled");
    return null;
  }

  try {
    return createRedisClient(redisUrl);
  } catch (error) {
    console.error("[Redis] Failed to create client:", error);
    return null;
  }
}

// Singleton pattern - reuse connection across hot reloads in development
export const redis = globalForRedis.redis ?? createDefaultClient();

if (process.env.NODE_ENV !== "production" && redis) {
  globalForRedis.redis = redis;
}

// Helper to check if Redis is available
export function isRedisAvailable(): boolean {
  return redis !== null && redis.status === "ready";
}

// Cache helper with automatic serialization
export async function getFromCache<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
    return null;
  } catch {
    return null;
  }
}

export async function setInCache<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // Silently fail - caching is optional
  }
}

// getOrCompute — cache-aside with lock-based stampede protection.
//
// When the cache is empty, a distributed lock (10s TTL) ensures only one
// caller computes the value. Other concurrent callers wait 200ms then retry
// the cache. If the cache is still empty after the retry (e.g. lock holder
// crashed), they fall through and compute themselves to avoid a hard stall.
export async function getOrCompute<T>(
  key: string,
  ttl: number,
  compute: () => Promise<T>
): Promise<T> {
  // 1. Try cache first
  const cached = await getFromCache<T>(key);
  if (cached !== null) return cached;

  // 2. Try to acquire a short-lived lock. With Redis down the command fails at
  // once (no offline queue): compute directly instead of throwing.
  const lockKey = `lock:${key}`;
  let acquired: string | null = null;
  let redisDown = !redis;
  if (redis) {
    try {
      acquired = await redis.set(lockKey, "1", "EX", 10, "NX");
    } catch {
      redisDown = true;
    }
  }

  if (!acquired && !redisDown) {
    // Another request is computing — wait briefly and retry cache
    await new Promise<void>((r) => setTimeout(r, 200));
    const retried = await getFromCache<T>(key);
    if (retried !== null) return retried;
    // Cache still empty (lock holder may have crashed) — compute ourselves
  }

  try {
    const result = await compute();
    await setInCache(key, result, ttl);
    return result;
  } finally {
    if (acquired && redis) await redis.del(lockKey).catch(() => undefined);
  }
}

export async function invalidateCache(pattern: string): Promise<void> {
  if (!redis) return;
  try {
    // Use SCAN instead of KEYS to avoid blocking Redis on large keyspaces
    let cursor = "0";
    do {
      const [nextCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== "0");
  } catch {
    // Silently fail
  }
}

export default redis;
