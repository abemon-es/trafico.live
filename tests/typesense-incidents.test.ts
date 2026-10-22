/**
 * Ended incidents out of search (CTO, 2026-10-22): the Typesense «incidents»
 * collection held 1,196,717 documents against 4,035 active, and ended
 * incidents were half or more of the top hits for A-7, A-2, N-340 or
 * «accidente Madrid», shown as current.
 *   1. deletes go by id, 120 per request: the filter fits Typesense 27's
 *      4,000-character query string; ids that would need escaping are skipped;
 *   2. after each incidents sync, those that ended in the window are deleted
 *      (2 h post-ingestion, 48 h on the daily run);
 *   3. the isActive field is added only once the history is gone (an alter
 *      re-indexes every document);
 *   4. documents carry isActive:true and /api/search filters on it, also in
 *      proximity mode and in the sparse-result fallback;
 *   5. the one-off cleanup is a dry run unless --apply.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:typesense-incidents
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { PrismaClient } from "@prisma/client";
import type TypesenseClient from "typesense/lib/Typesense/Client";
import {
  ALTER_MAX_DOCS,
  ID_CHUNK,
  deleteIncidentIds,
  ensureIsActiveField,
  idChunks,
  idFilter,
  pruneRecentlyEnded,
} from "../services/collector/tasks/typesense-sync/prune-incidents";

const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

/** A Typesense client that records what it was asked. */
function fakeClient(state: { fields: string[]; docs: number }) {
  const calls = { deletes: [] as string[], updates: [] as unknown[] };
  const client = {
    collections: () => ({
      documents: () => ({
        delete: async ({ filter_by }: { filter_by: string }) => {
          calls.deletes.push(filter_by);
          return { num_deleted: (filter_by.match(/,/g)?.length ?? 0) + 1 };
        },
      }),
      retrieve: async () => ({ fields: state.fields.map((name) => ({ name })), num_documents: state.docs }),
      update: async (schema: unknown) => {
        calls.updates.push(schema);
        return {};
      },
    }),
  } as unknown as TypesenseClient;
  return { client, calls };
}

async function main() {
  // 1. Chunks and the filter's length.
  const cuid = (i: number) => `cmg${String(i).padStart(22, "0")}`; // 25 characters, the longest in the table
  const many = Array.from({ length: 301 }, (_, i) => cuid(i));
  const chunks = idChunks(many);
  assert.deepEqual(chunks.map((c) => c.length), [ID_CHUNK, ID_CHUNK, 61]);
  const query = `q=*&filter_by=${encodeURIComponent(idFilter(chunks[0]))}&batch_size=${ID_CHUNK}`;
  assert.ok(query.length < 4000, `a full chunk fits Typesense's 4,000-character query string (${query.length})`);
  assert.deepEqual(idChunks(["ok1", "bad,id", "with space", "x`y", "ok2"]), [["ok1", "ok2"]], "ids that would need escaping are skipped");

  // deleteIncidentIds: one request per chunk, the counts added up.
  {
    const { client, calls } = fakeClient({ fields: [], docs: 0 });
    assert.equal(await deleteIncidentIds(client, many), 301);
    assert.equal(calls.deletes.length, 3);
    assert.ok(calls.deletes[0].startsWith("id:[") && calls.deletes[0].endsWith("]"));
  }

  // 2. The window, against a fake Prisma.
  {
    let where: { isActive?: boolean; lastSeenAt?: { gte: Date } } = {};
    const prisma = {
      trafficIncident: {
        findMany: async (args: { where: typeof where }) => {
          where = args.where;
          return [{ id: "a1" }, { id: "b2" }];
        },
      },
    } as unknown as PrismaClient;
    const { client, calls } = fakeClient({ fields: [], docs: 0 });
    const before = Date.now();
    const r = await pruneRecentlyEnded(prisma, client, 2);
    assert.deepEqual(r, { ended: 2, deleted: 2 });
    assert.equal(where.isActive, false, "only ended incidents");
    const ago = before - (where.lastSeenAt?.gte.getTime() ?? 0);
    assert.ok(ago >= 2 * 3600_000 - 1000 && ago <= 2 * 3600_000 + 1000, "seen within the last 2 h");
    assert.deepEqual(calls.deletes, ["id:[a1,b2]"]);
  }

  // 3. The field: never altered on the big collection.
  {
    const present = fakeClient({ fields: ["id", "isActive"], docs: 1_196_717 });
    assert.equal(await ensureIsActiveField(present.client), "present");
    const big = fakeClient({ fields: ["id", "type"], docs: 1_196_717 });
    assert.equal(await ensureIsActiveField(big.client), "deferred");
    assert.equal(big.calls.updates.length, 0, "no alter while the history is there");
    const small = fakeClient({ fields: ["id", "type"], docs: 4_035 });
    assert.ok(4_035 <= ALTER_MAX_DOCS);
    assert.equal(await ensureIsActiveField(small.client), "added");
    assert.deepEqual(small.calls.updates, [{ fields: [{ name: "isActive", type: "bool", optional: true }] }]);
  }

  // 4. The documents and the search.
  const sync = read("services/collector/tasks/typesense-sync/collector.ts");
  const load = sync.slice(sync.indexOf("async function loadIncidents"), sync.indexOf("async function loadWeatherAlerts"));
  assert.ok(/where: \{ isActive: true \}/.test(load) && /isActive: true,\n/.test(load), "the loader takes active incidents and marks them");
  for (const rel of ["services/collector/tasks/typesense-sync/collector.ts", "src/lib/typesense.ts"]) {
    const s = read(rel);
    const schema = s.slice(s.indexOf("incidents: {"), s.indexOf("default_sorting_field", s.indexOf("incidents: {")));
    assert.ok(schema.includes('{ name: "isActive", type: "bool", optional: true }'), `${rel}: isActive in the incidents schema`);
  }
  assert.ok(sync.includes("const windowHours = target ? 2 : 48;"), "2 h after a post-ingestion sync, 48 h on the daily run");
  assert.ok(sync.includes("await pruneRecentlyEnded(prisma, client, windowHours)"));
  const route = read("src/app/api/search/route.ts");
  const incidents = route.slice(route.indexOf('collection: "incidents",'), route.indexOf("mapHit", route.indexOf('collection: "incidents",')));
  assert.ok(incidents.includes('filterBy: "isActive:true",'), "search shows current incidents only");
  assert.ok(route.includes("...(config.filterBy && { filter_by: config.filterBy }),"), "the collection's filter goes in every request");
  assert.ok(route.includes("req.filter_by = config.filterBy ? `${config.filterBy} && ${geoClause}` : geoClause;"), "proximity keeps it");
  assert.equal((route.match(/\.\.\.\(config\.filterBy && \{ filter_by: config\.filterBy \}\),/g) ?? []).length, 2, "and so does the fallback");

  // 5. The one-off.
  const script = read("services/collector/scripts/prune-incidents-typesense.ts");
  assert.ok(script.includes('const apply = process.argv.includes("--apply");') && script.includes('console.log("dry run: nothing deleted");'), "a dry run unless --apply");
  assert.ok(!/replaceCollection|collections\(\)\.create|\.delete\(\)\s*;/.test(script.split("\n").filter((l) => !/^\s*(\*|\/\/)/.test(l)).join("\n")), "it never drops or re-creates the collection");
  assert.ok(script.includes("const GUARD_MAX_DROP = 0.01;") && script.includes("throw new Error(`STOP: active documents present fell"), "it stops if the active documents drop by more than 1 %");

  console.log("typesense-incidents: ok (deletes by id in 120s, a 2/48 h window after each sync, isActive added after the cleanup, search filters current incidents only)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
