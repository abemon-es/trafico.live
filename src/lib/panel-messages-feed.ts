/**
 * Whether the DGT is publishing variable-message-panel (PMV) messages, read
 * from the panel heartbeat.
 *
 * The DGT NAP serves panel locations and panel messages as two feeds. The
 * messages feed can answer 200 with an old publicationTime and no messages
 * while the locations feed keeps moving; the collector then marks the run
 * `partial` («frozen upstream») and every panel ends up with hasMessage =
 * false. Without this check /paneles read that as «Sin mensaje activo» on
 * every panel, which says the DGT shows nothing when we simply don't know.
 *
 * Fail closed: messages are «live» only when the last run is fresh (within
 * the panel staleness threshold) and the messages feed it read had been
 * published at most PANEL_MESSAGES_MAX_AGE_MS before that run, the same rule
 * the collector applies. No heartbeat, no publication time or a stale run
 * means not live.
 */

import { STALE_THRESHOLDS } from "./collector-thresholds";

/** Same value as MESSAGES_MAX_AGE_MS in services/collector/tasks/panel/collector.ts. */
export const PANEL_MESSAGES_MAX_AGE_MS = 30 * 60 * 1000;

export interface PanelMessagesFeed {
  live: boolean;
  /** When the DGT last published the messages feed, if the heartbeat says. */
  publishedAt: Date | null;
}

const asDate = (v: unknown): Date | null => {
  if (typeof v !== "string") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

export function panelMessagesFeed(
  meta: unknown,
  lastSuccessAt: Date | null | undefined,
  now: number = Date.now()
): PanelMessagesFeed {
  const m = meta !== null && typeof meta === "object" && !Array.isArray(meta) ? (meta as Record<string, unknown>) : {};
  const publishedAt = asDate(m.messagesPublishedAt);
  const threshold = (STALE_THRESHOLDS["panel"] ?? STALE_THRESHOLDS["_default"]) * 1000;
  const fresh = lastSuccessAt != null && now - lastSuccessAt.getTime() <= threshold;
  const live =
    fresh &&
    publishedAt !== null &&
    lastSuccessAt.getTime() - publishedAt.getTime() <= PANEL_MESSAGES_MAX_AGE_MS;
  return { live, publishedAt };
}
