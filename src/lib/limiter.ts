import { RateLimiterMemory, RateLimiterRedis } from "rate-limiter-flexible";
import type Redis from "ioredis";
import { redis } from "./redis";

/**
 * Every rate limiter in the app: Redis-backed, with an in-memory insurance
 * limiter of the same points and duration.
 *
 * The Redis client fails at once while it is disconnected (enableOfflineQueue
 * false, src/lib/redis.ts). Without insurance, every limiter then failed open
 * for the whole outage: unlimited chat, which costs model calls, and an
 * unlimited contact form. With it, rate-limiter-flexible counts in this
 * instance's memory until Redis is back, which is what its docs recommend for
 * that client option.
 */
export type Limiter = RateLimiterRedis | RateLimiterMemory;
export type LimiterOptions = NonNullable<ConstructorParameters<typeof RateLimiterMemory>[0]>;

export function createLimiter(opts: LimiterOptions, client: Redis | null = redis): Limiter {
  const memory = new RateLimiterMemory(opts);
  if (!client) {
    console.warn(`[RateLimit] Redis unavailable — in-memory limiter for ${opts.keyPrefix}`);
    return memory;
  }
  return new RateLimiterRedis({ ...opts, storeClient: client, insuranceLimiter: memory });
}
