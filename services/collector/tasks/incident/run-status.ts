/**
 * What makes an incident run `partial`, and says why.
 *
 * Until 2026-10-20 a source that failed was only logged and the heartbeat
 * said `ok`: Euskadi's fetch threw on every run after #121 and /api/health
 * never showed it. Now any source that fails, an Euskadi day read only in
 * part, or a source that skips more than a fifth of its items (a format
 * change, not one odd item) is named in the heartbeat's reason.
 */

export const MAX_SKIPPED_SHARE = 0.2;

export interface SkipCounts {
  items: number;
  skipped: number;
  cappedDays?: string[];
}

export function sourceProblems(
  results: Array<[source: string, result: PromiseSettledResult<unknown>]>,
  counts: Record<string, SkipCounts | null | undefined> = {},
): string[] {
  const problems: string[] = [];
  for (const [source, result] of results) {
    if (result.status === "rejected") {
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
      problems.push(`${source}: ${reason.slice(0, 120)}`);
    }
  }
  for (const [source, c] of Object.entries(counts)) {
    if (!c) continue;
    if (c.cappedDays && c.cappedDays.length > 0) problems.push(`${source}: ${c.cappedDays.join(", ")} read only in part (page cap)`);
    if (c.items > 0 && c.skipped / c.items > MAX_SKIPPED_SHARE) problems.push(`${source}: ${c.skipped}/${c.items} items skipped`);
  }
  return problems;
}
