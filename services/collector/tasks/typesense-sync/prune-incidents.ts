/**
 * Ended incidents out of the Typesense «incidents» collection (CTO,
 * 2026-10-22). Every sync upserted the active incidents and none ever removed
 * an ended one, so on 2026-10-22 the collection held 1,196,717 documents
 * against 4,035 active, and ended incidents were half or more of the top
 * search hits for A-7, A-2, N-340 or «accidente Madrid», shown as current.
 *
 * - After each incidents upsert, the incidents that ended recently
 *   (isActive=false, lastSeenAt inside the window) are deleted by id.
 * - Every document also carries `isActive: true`, and /api/search filters on
 *   it, so a document without it (ended before this change) never shows.
 * - The one-off cleanup of the history is scripts/prune-incidents-typesense.ts.
 */
import type { PrismaClient } from "@prisma/client";
import type TypesenseClient from "typesense/lib/Typesense/Client";

/**
 * Typesense 27 caps a query string at 4,000 characters, filter_by included;
 * 200 ids of 25 characters came to 5.7 KB. 120 leaves room for the rest.
 */
export const ID_CHUNK = 120;

/** Incident ids are cuids. Anything else would need escaping in filter_by, so it is skipped. */
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

export function idChunks(ids: string[], size = ID_CHUNK): string[][] {
  const safe = ids.filter((id) => SAFE_ID.test(id));
  const out: string[][] = [];
  for (let i = 0; i < safe.length; i += size) out.push(safe.slice(i, i + size));
  return out;
}

export const idFilter = (ids: string[]) => `id:[${ids.join(",")}]`;

/** Delete these ids from «incidents»; returns how many documents Typesense removed. */
export async function deleteIncidentIds(client: TypesenseClient, ids: string[], pauseMs = 0): Promise<number> {
  let deleted = 0;
  for (const chunk of idChunks(ids)) {
    const r = (await client
      .collections("incidents")
      .documents()
      .delete({ filter_by: idFilter(chunk), batch_size: ID_CHUNK })) as { num_deleted?: number };
    deleted += r.num_deleted ?? 0;
    if (pauseMs > 0) await new Promise((res) => setTimeout(res, pauseMs));
  }
  return deleted;
}

/** The incidents that ended in the last `windowHours`, out of Typesense. */
export async function pruneRecentlyEnded(
  prisma: PrismaClient,
  client: TypesenseClient,
  windowHours: number
): Promise<{ ended: number; deleted: number }> {
  const since = new Date(Date.now() - windowHours * 3600_000);
  const rows = await prisma.trafficIncident.findMany({
    where: { isActive: false, lastSeenAt: { gte: since } },
    select: { id: true },
  });
  if (rows.length === 0) return { ended: 0, deleted: 0 };
  return { ended: rows.length, deleted: await deleteIncidentIds(client, rows.map((r) => r.id)) };
}

/**
 * The live collection predates `isActive`. Typesense alters a schema by
 * re-indexing every document, so the field is added only once the history is
 * gone (the prune script, or a collection this small).
 */
export const ALTER_MAX_DOCS = 50_000;

export async function ensureIsActiveField(client: TypesenseClient): Promise<"present" | "added" | "deferred"> {
  const col = (await client.collections("incidents").retrieve()) as { fields: { name: string }[]; num_documents: number };
  if (col.fields.some((f) => f.name === "isActive")) return "present";
  if (col.num_documents > ALTER_MAX_DOCS) return "deferred";
  await client.collections("incidents").update({ fields: [{ name: "isActive", type: "bool", optional: true }] } as never);
  return "added";
}
