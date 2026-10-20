/**
 * src/lib/transit/feed-link.ts: an operator page links the GTFS ZIP only on
 * MobilityData's own file server; anything else (files.catbox.moe, the legacy
 * mdb-latest bucket, a producer host) links the feed's catalog page instead.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:feed-link
 */

import assert from "node:assert/strict";
import { feedLink } from "../src/lib/transit/feed-link";

const catalog = (id: string) => `https://mobilitydatabase.org/feeds/gtfs/${id}`;

// MobilityData's file server: the ZIP itself.
assert.deepEqual(feedLink("mdb-791", "https://files.mobilitydatabase.org/mdb-791/latest.zip"), {
  href: "https://files.mobilitydatabase.org/mdb-791/latest.zip",
  label: "https://files.mobilitydatabase.org/mdb-791/latest.zip",
  direct: true,
});

// An anonymous file host (Zaratán, RíoBUS): the catalog page, never the host.
for (const [id, url] of [["mdb-3454", "https://files.catbox.moe/giiq3a.zip"], ["mdb-3455", "https://files.catbox.moe/mk9df1.zip"]]) {
  const link = feedLink(id, url)!;
  assert.equal(link.href, catalog(id));
  assert.equal(link.direct, false);
  assert.equal(link.label, `catálogo MobilityData (${id})`);
  assert.ok(!link.href.includes("catbox"));
}

// The legacy bucket (166 operators today, often 404), look-alike hosts, plain http, junk: the catalog page.
for (const url of [
  "https://storage.googleapis.com/storage/v1/b/mdb-latest/o/es-x-gtfs-1.zip?alt=media",
  "https://files.mobilitydatabase.org.evil.example/mdb-1/latest.zip",
  "https://evil.example/files.mobilitydatabase.org/latest.zip",
  "http://files.mobilitydatabase.org/mdb-1/latest.zip",
  "not a url",
  null,
]) {
  assert.deepEqual(feedLink("mdb-1", url), { href: catalog("mdb-1"), label: "catálogo MobilityData (mdb-1)", direct: false }, String(url));
}

// No catalog id to fall back on: no link at all.
assert.equal(feedLink("feed-1", "https://files.catbox.moe/x.zip"), null);

console.log("feed-link: all checks passed");
