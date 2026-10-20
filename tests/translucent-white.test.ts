/**
 * No solid white where translucent white was meant.
 *
 * The dark-mode sweep (dc3f166c) rewrote `bg-white/10` and `bg-white/20` (a
 * translucent box on a coloured background with white text) as
 * `bg-white dark:bg-gray-900/10|20`: solid white in light mode. The incident
 * modal's icon, the active filter chips' counts, the price heroes' badges and
 * two icons drew white on white until 2026-10-21. `/40` and `/50` are real
 * light-mode cards and stay.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:translucent-white
 */

import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const BROKEN = /bg-white dark:bg-gray-\d+\/(10|20)\b/;

function* sources(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* sources(path);
    else if (/\.(tsx|ts)$/.test(name)) yield path;
  }
}

assert.ok(BROKEN.test('className="p-2 bg-white dark:bg-gray-900/20 rounded-lg"'));
assert.ok(!BROKEN.test('className="bg-white dark:bg-gray-900/50 rounded-2xl"'), "a light card is fine");
assert.ok(!BROKEN.test('className="p-2 bg-white/20 rounded-lg"'));

const hits: string[] = [];
for (const file of sources(join(process.cwd(), "src"))) {
  readFileSync(file, "utf8").split("\n").forEach((line, i) => {
    if (BROKEN.test(line)) hits.push(`${file.slice(process.cwd().length + 1)}:${i + 1}`);
  });
}
assert.deepEqual(hits, [], `solid white where translucent was meant:\n${hits.join("\n")}`);

console.log("translucent white: all checks passed");
