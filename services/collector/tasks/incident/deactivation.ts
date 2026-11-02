/**
 * Per-source deactivation of traffic incidents.
 *
 * Until 2026-11-02 an incident stayed active until an hour after its last
 * sighting, whatever the source. The DGT turns over more than 1,000 incidents
 * an hour, so at 16:4x «active DGT» counted 1,726 rows while the feed carried
 * about 731. Now, when a source's fetch is valid, its rows that did not come in
 * this pass are deactivated at once. A fetch is valid only if it parsed and
 * brought at least MIN_RATIO of the rows of that source's last valid pass (CTO):
 * a 200 with an empty or truncated feed must not wipe the data. Failed, short
 * and first passes keep the one-hour window, which still runs for every source.
 *
 * The reference count lives in the incident heartbeat's meta
 * (`deactivation.<SOURCE>.reference`, with its time) and expires after
 * REFERENCE_TTL_MS: a level that really dropped (night, a feed that changed)
 * becomes the new reference after an hour of 1-hour-window passes, instead of
 * keeping the source «short» forever.
 */

export const MIN_RATIO = 0.5;
export const REFERENCE_TTL_MS = 60 * 60 * 1000;

/** «valid»: deactivate what did not come; anything else: the 1-hour window only. */
export type FetchVerdict = "valid" | "failed" | "short" | "first";

export interface SourceReference {
  reference: number;
  referenceAt: string; // ISO time of the valid pass that set it
}

export interface SourcePass {
  /** The fetch resolved and parsed, and no row of the source failed to store. */
  fetched: boolean;
  /** Rows this pass brought for the source. */
  rows: number;
}

export function judgeFetch(pass: SourcePass, previous: SourceReference | undefined, now: Date): FetchVerdict {
  if (!pass.fetched) return "failed";
  const fresh =
    previous &&
    previous.reference > 0 &&
    now.getTime() - new Date(previous.referenceAt).getTime() <= REFERENCE_TTL_MS;
  if (!fresh) return "first";
  if (pass.rows < MIN_RATIO * previous.reference) return "short";
  return "valid";
}

/**
 * The reference to keep after this pass: a valid pass or a first one with rows
 * sets it; a short or failed pass keeps the previous one (which expires on its own).
 */
export function nextReference(
  verdict: FetchVerdict,
  pass: SourcePass,
  previous: SourceReference | undefined,
  now: Date,
): SourceReference | undefined {
  if ((verdict === "valid" || verdict === "first") && pass.rows > 0) {
    return { reference: pass.rows, referenceAt: now.toISOString() };
  }
  return previous;
}

/** Previous references from the incident heartbeat meta (anything malformed is ignored). */
export function referencesFromMeta(meta: unknown): Record<string, SourceReference> {
  const out: Record<string, SourceReference> = {};
  const d = (meta as { deactivation?: unknown } | null)?.deactivation;
  if (!d || typeof d !== "object") return out;
  for (const [source, v] of Object.entries(d as Record<string, unknown>)) {
    const r = v as { reference?: unknown; referenceAt?: unknown };
    if (typeof r?.reference === "number" && typeof r?.referenceAt === "string") {
      out[source] = { reference: r.reference, referenceAt: r.referenceAt };
    }
  }
  return out;
}
