/**
 * Social Broadcast Orchestrator
 *
 * Dispatches composed messages to Bluesky, X (Twitter), and Telegram in parallel.
 * Deduplication via Redis SET NX with 24h TTL — each event is posted at most once.
 *
 * Usage:
 *   const result = await broadcast({
 *     eventId: alert.alertId,
 *     messageBluesky: "...",
 *     messageX: "...",
 *     messageTelegram: "...",
 *   });
 *   // result = { bluesky: 'ok', x: 'skip', telegram: 'ok' }
 */

import { postSkeet } from "./bluesky.js";
import { postTweet } from "./x-api.js";
import { broadcast as telegramBroadcast } from "./telegram.js";

/** Redis client — imported lazily so this module works without Redis in local dev */
async function getRedis() {
  try {
    const mod = await import("./redis.js");
    return mod.redis;
  } catch {
    return null;
  }
}

const DEDUP_TTL_SECS = 24 * 60 * 60; // 24 hours
const DEDUP_KEY_PREFIX = "social:bc:";

export type ChannelResult = "ok" | "skip" | "error";

export interface BroadcastOptions {
  /**
   * Unique event identifier used for deduplication (e.g. WeatherAlert.alertId).
   * If omitted, deduplication is skipped (message always sent).
   */
  eventId?: string;
  /** Message for Bluesky (max 300 chars). Omit to skip Bluesky. */
  messageBluesky?: string;
  /** External link card for Bluesky (optional). */
  blueskyLink?: {
    uri: string;
    title: string;
    description?: string;
  };
  /** Message for X / Twitter (max 280 chars, auto-truncated). Omit to skip X. */
  messageX?: string;
  /** Message for Telegram channel (Markdown format). Omit to skip Telegram. */
  messageTelegram?: string;
}

export interface BroadcastResult {
  bluesky: ChannelResult;
  x: ChannelResult;
  telegram: ChannelResult;
  /** true if this event was already broadcast (dedup hit) */
  duplicate: boolean;
}

/**
 * Check and set the dedup key for an event.
 * Returns true if the key was freshly set (new event).
 * Returns false if key already existed (duplicate).
 */
async function acquireDedup(eventId: string): Promise<boolean> {
  const redis = await getRedis();
  if (!redis) {
    // No Redis — cannot dedup, allow through
    console.warn("[social-broadcast] Redis unavailable — dedup disabled, allowing broadcast");
    return true;
  }

  const key = `${DEDUP_KEY_PREFIX}${eventId}`;
  // SET NX (only set if not exists) + EX (TTL)
  const result = await redis.set(key, "1", "EX", DEDUP_TTL_SECS, "NX");
  return result === "OK";
}

/**
 * Broadcast a message to configured social channels.
 * Each channel is dispatched in parallel; individual failures do not block others.
 */
export async function broadcast(opts: BroadcastOptions): Promise<BroadcastResult> {
  const result: BroadcastResult = {
    bluesky: "skip",
    x: "skip",
    telegram: "skip",
    duplicate: false,
  };

  // Deduplication check
  if (opts.eventId) {
    const isNew = await acquireDedup(opts.eventId);
    if (!isNew) {
      console.log(`[social-broadcast] Duplicate — event ${opts.eventId} already broadcast, skipping`);
      result.duplicate = true;
      return result;
    }
  }

  // Build dispatch tasks
  const tasks: Array<Promise<void>> = [];

  if (opts.messageBluesky) {
    tasks.push(
      postSkeet({
        text: opts.messageBluesky,
        link: opts.blueskyLink,
      })
        .then((r) => {
          result.bluesky = r;
          if (r !== "ok") console.warn(`[social-broadcast] Bluesky: ${r}`);
        })
        .catch((err) => {
          result.bluesky = "error";
          console.error("[social-broadcast] Bluesky exception:", err);
        })
    );
  }

  if (opts.messageX) {
    tasks.push(
      postTweet({ text: opts.messageX })
        .then((r) => {
          result.x = r;
          if (r !== "ok") console.warn(`[social-broadcast] X: ${r}`);
        })
        .catch((err) => {
          result.x = "error";
          console.error("[social-broadcast] X exception:", err);
        })
    );
  }

  if (opts.messageTelegram) {
    tasks.push(
      telegramBroadcast(opts.messageTelegram, {
        parseMode: "Markdown",
        disableWebPagePreview: false,
      })
        .then((r) => {
          result.telegram = r.success ? "ok" : "error";
          if (!r.success) {
            console.error(`[social-broadcast] Telegram error: ${r.error}`);
          }
        })
        .catch((err) => {
          result.telegram = "error";
          console.error("[social-broadcast] Telegram exception:", err);
        })
    );
  }

  if (tasks.length === 0) {
    console.warn("[social-broadcast] No messages provided — nothing to dispatch");
    return result;
  }

  await Promise.allSettled(tasks);

  const summary = [
    opts.messageBluesky ? `bluesky=${result.bluesky}` : null,
    opts.messageX ? `x=${result.x}` : null,
    opts.messageTelegram ? `telegram=${result.telegram}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  console.log(`[social-broadcast] Done — ${summary}`);

  return result;
}
