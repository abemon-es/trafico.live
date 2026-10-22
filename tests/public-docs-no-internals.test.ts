/**
 * The repo is public: its documentation names no database host, database or
 * role. They're not credentials, but together they are a map (CSO,
 * 2026-10-22). The docs use placeholders (`<db-host>`, `<db-container>`,
 * `<db>`, `<admin-role>`, `<app-role>`, `<ro-role>`), and the real values
 * live in the server repo's docs, which are private.
 *
 * Scans every Markdown file under docs/ and monitoring/, plus the root
 * README and CLAUDE.md, for those names and for private (RFC 1918)
 * addresses. Also scans bin/, scripts/ and enricher/ for the names: their
 * database settings come from the environment, with no default (CSO).
 * Out of scope: applied migrations (editing them changes their checksum),
 * monitoring configs (container names), compose and nginx files (working
 * config with private addresses; moving it to env is another project).
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:public-docs
 */

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

/**
 * SHA-256 of the six forbidden names (host, container, database, three
 * roles), so this test doesn't spell out what it keeps out of the repo.
 */
const FORBIDDEN = new Set([
  "2f3a8a5fa0bc135b9d200ddcdae5eb480330d15a1a91d09e6b2e4fbc2f0239d9",
  "f3e69967112b095ea31a64b09081c7a4f47d79b1d08ac4bd9a756d3638cc64ca",
  "2363643207660fceae5dcf57ee2211fbd7aac8fb44f9d67d924fd004491b12b3",
  "fac08f6aa2703a7d11d191537217e858abcfc90ad844431394471fbc84ab1f89",
  "fc640159ee06dc368b0245592819e7ebc776138e6f10de1b8dfb18a4ab759716",
  "cb16ca7e8eaecc1a69250e5a0c983d0bcf49de9043590013e4404d4393e7366e",
]);
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
/** RFC 1918 addresses: 10/8, 172.16/12, 192.168/16. */
const PRIVATE_IP = /\b(10\.\d{1,3}|172\.(1[6-9]|2\d|3[01])|192\.168)\.\d{1,3}\.\d{1,3}\b(?!\/\d)/; // a CIDR range is generic
/** Whether a line has a forbidden name as a whole token. */
const leaks = (line: string) => (line.match(/[A-Za-z0-9_-]+/g) ?? []).some((t) => FORBIDDEN.has(sha(t.toLowerCase())));

function* markdown(dir: string): Generator<string> {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* markdown(p);
    else if (name.endsWith(".md")) yield p;
  }
}

function* code(dir: string, ext: RegExp): Generator<string> {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* code(p, ext);
    else if (ext.test(name)) yield p;
  }
}

const files = [...markdown(join(ROOT, "docs")), ...markdown(join(ROOT, "monitoring")), join(ROOT, "README.md"), join(ROOT, "CLAUDE.md")].filter((p) => existsSync(p));
const scripts = [...code(join(ROOT, "bin"), /\.(sh|mjs|py)$/), ...code(join(ROOT, "scripts"), /\.(sh|py|mjs|ts)$/), ...code(join(ROOT, "enricher"), /\.py$/)];
const offenders: string[] = [];
for (const p of [...files, ...scripts]) {
  const doc = p.endsWith(".md");
  readFileSync(p, "utf8")
    .split("\n")
    .forEach((line, i) => {
      if (leaks(line) || (doc && PRIVATE_IP.test(line))) offenders.push(`${relative(ROOT, p)}:${i + 1}: ${line.trim().slice(0, 120)}`);
    });
}
assert.deepEqual(offenders, [], `internal names in public docs:\n${offenders.join("\n")}`);
// The check itself works: a placeholder passes, and so does an ordinary word.
assert.equal(leaks("psql -U <admin-role> -d <db>"), false);
assert.ok(PRIVATE_IP.test("upstream 192.168.1.20:80") && PRIVATE_IP.test("10.1.2.3") && !PRIVATE_IP.test("127.0.0.1"), "private ranges, not loopback");
assert.ok(!PRIVATE_IP.test("allow 10.0.0.0/8;"), "a CIDR range names no host");
assert.ok(readFileSync(join(ROOT, "docs/cto-loop/PLAYBOOK.md"), "utf8").includes("are in the server repo's docs"), "the PLAYBOOK says where the real values are");

console.log(`public-docs: ok (${files.length} Markdown files without internal names or private addresses; ${scripts.length} scripts without database defaults)`);
