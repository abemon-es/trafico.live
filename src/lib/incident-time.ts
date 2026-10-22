/**
 * When an incident actually ended, as observed (2026-10-22).
 *
 * `TrafficIncident.endedAt` is the end the source *declared* (DATEX endTime): NULL
 * for 99 % of ended incidents (4,034,834 of 4,071,621 DGT ones), and sometimes
 * in the future (roadworks scheduled to 2029) for an incident that went away
 * long before. What the feeds tell us is when an incident stopped appearing:
 * `lastSeenAt`, which the collector stops moving when it deactivates it.
 * Readers that need a duration or «was it active at T» use this, not endedAt.
 */
export function observedEnd(
  inc: { isActive: boolean; lastSeenAt: Date | null; endedAt?: Date | null },
  now: Date
): Date {
  if (inc.isActive) return now;
  return inc.lastSeenAt ?? inc.endedAt ?? now;
}
