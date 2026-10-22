/**
 * One-off: the ended incidents out of the Typesense «incidents» collection
 * (CTO, 2026-10-22). Every sync had only upserted, so it held 1,196,717
 * documents against 4,035 active incidents, and ended ones filled the top
 * search hits as if current.
 *
 *   npx tsx scripts/prune-incidents-typesense.ts           # dry run: counts only
 *   npx tsx scripts/prune-incidents-typesense.ts --apply   # delete, add isActive, mark the rest
 *
 * It exports the ids Typesense holds and deletes, 120 per request with a short
 * pause, every one not active in the database. Nothing is re-created, so
 * search is never empty and nothing is re-embedded. A second run repeats the
 * export, so it resumes after a cut and does nothing once done. Then it adds
 * the isActive field (now that a re-index is cheap) and marks the active
 * documents, so /api/search can filter isActive:true.
 *
 * Reads the database only: DATABASE_URL can be the read-only URL.
 */
import pg from "pg";
import { getTypesenseClient } from "../shared/typesense.js";
import { deleteIncidentIds, ensureIsActiveField, idChunks, idFilter } from "../tasks/typesense-sync/prune-incidents.js";

const PAUSE_MS = 20;
/** Every this many delete requests (~12,000 documents), check the active ones are all still there. */
const GUARD_EVERY = 100;
/** Stop if the active documents present fall by more than this (CTO). */
const GUARD_MAX_DROP = 0.01;

type Client = ReturnType<typeof getTypesenseClient>;

/** How many of these ids Typesense holds (search by id, nothing fetched). */
async function countPresent(client: Client, ids: string[]): Promise<number> {
  let n = 0;
  for (const chunk of idChunks(ids)) {
    const r = (await client.collections("incidents").documents().search({ q: "*", filter_by: idFilter(chunk), per_page: 0 })) as { found: number };
    n += r.found;
  }
  return n;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const client = getTypesenseClient();
  try {
    const active = new Set(
      (await pool.query<{ id: string }>(`SELECT id FROM "TrafficIncident" WHERE "isActive"`)).rows.map((r) => r.id)
    );
    const exported = (await client.collections("incidents").documents().export({ include_fields: "id" })) as string;
    const ids = exported
      .split("\n")
      .filter(Boolean)
      .map((l) => (JSON.parse(l) as { id: string }).id);
    const toDelete = ids.filter((id) => !active.has(id));
    const keep = ids.filter((id) => active.has(id));
    console.log(
      `typesense ${ids.length} documents · active in the DB ${active.size} · present and active ${keep.length} · to delete ${toDelete.length} (${idChunks(toDelete).length} requests)`
    );
    if (!apply) {
      console.log("dry run: nothing deleted");
      return;
    }

    // Guard (CTO): the active documents must not drop while deleting. The
    // script never sends an active id, but an incident can turn active
    // between the export and its delete.
    const presentAtStart = await countPresent(client, keep);
    console.log(`guard: ${presentAtStart} active documents present at the start`);
    const t0 = Date.now();
    const chunks = idChunks(toDelete);
    let deleted = 0;
    for (let i = 0; i < chunks.length; i++) {
      deleted += await deleteIncidentIds(client, chunks[i], PAUSE_MS);
      if ((i + 1) % GUARD_EVERY === 0 || i === chunks.length - 1) {
        const present = await countPresent(client, keep);
        console.log(`  ${i + 1}/${chunks.length} requests · deleted ${deleted} · active present ${present}/${presentAtStart} (${Math.round((Date.now() - t0) / 1000)} s)`);
        if (present < presentAtStart * (1 - GUARD_MAX_DROP)) {
          throw new Error(`STOP: active documents present fell from ${presentAtStart} to ${present}; nothing more deleted`);
        }
      }
    }
    const after = (await client.collections("incidents").retrieve()) as { num_documents: number };
    console.log(`after: ${after.num_documents} documents (active in the DB at the start: ${active.size})`);

    console.log(`isActive field: ${await ensureIsActiveField(client)}`);
    let marked = 0;
    for (let i = 0; i < keep.length; i += 1000) {
      const batch = keep.slice(i, i + 1000).map((id) => ({ id, isActive: true }));
      try {
        const res = await client.collections("incidents").documents().import(batch, { action: "update" });
        marked += res.filter((r: { success: boolean }) => r.success).length;
      } catch (err) {
        // A partial import throws with one result per document.
        const res = (err as { importResults?: { success: boolean }[] }).importResults;
        marked += res ? res.filter((r) => r.success).length : 0;
      }
    }
    console.log(`marked ${marked} of ${keep.length} active documents isActive:true`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
