/**
 * Which parts of a collector's heartbeat meta /api/health may show.
 *
 * /api/health is public, and the house rule is generic errors outside with the
 * detail kept on the server. These keys say why a credential is failing (e.g.
 * aemet-forecast's «API key past its renewal deadline»), so they stay in
 * CollectorHeartbeat and the container logs and never leave in the response.
 */
export const PRIVATE_META_KEYS: ReadonlySet<string> = new Set([
  "keyRenewalRequired",
  "quotaHitsByStatus",
  "lastQuotaDescripcion",
  "abortDetail",
]);

/** The meta object without its private keys; anything else passes unchanged. */
export function publicMeta(meta: unknown): unknown {
  if (meta === null || typeof meta !== "object" || Array.isArray(meta)) return meta;
  return Object.fromEntries(Object.entries(meta).filter(([key]) => !PRIVATE_META_KEYS.has(key)));
}
