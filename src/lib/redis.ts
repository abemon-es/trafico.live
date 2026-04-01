import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedisClient(): Redis | null {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.warn("[Redis] REDIS_URL not set - caching and rate limiting disabled");
    return null;
  }

  try {
    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) {
          console.error("[Redis] Max retries reached, giving up");
          return null;
        }
        const delay = Math.min(times * 200, 2000);
        return delay;
      },
      reconnectOnError(err) {
        const targetError = "READONLY";
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
    });

    client.on("error", (err) => {
      console.error("[Redis] Connection error:", err.message);
    });

    client.on("connect", () => {
      console.log("[Redis] Connected successfully");
    });

    return client;
  } catch (error) {
    console.error("[Redis] Failed to create client:", error);
    return null;
  }
}

// Singleton pattern - reuse connection across hot reloads in development
export const redis = globalForRedis.redis ?? createRedisClient();

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

  // 2. Try to acquire a short-lived lock
  const lockKey = `lock:${key}`;
  const acquired = redis
    ? await redis.set(lockKey, "1", "EX", 10, "NX")
    : null;

  if (!acquired) {
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
    if (acquired && redis) await redis.del(lockKey);
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
