/**
 * No route-level loading.tsx under src/app.
 *
 * A loading.tsx wraps the whole page in a Suspense boundary. On these ISR
 * pages React then sends the skeleton inside <main> and moves the finished
 * page into a hidden block at the end of the HTML, swapped in by a script.
 * Crawlers that do not run JavaScript saw an empty <main> on every hub that
 * had one (/trenes, /camaras, /maritimo, /aviacion, /calidad-aire, ...).
 * A skeleton for one widget goes in a <Suspense> around that widget instead.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:no-route-loading
 */

import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));

function findLoadingFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...findLoadingFiles(path));
    else if (/^loading\.(tsx|ts|jsx|js)$/.test(entry.name)) found.push(path);
  }
  return found;
}

function main() {
  const found = findLoadingFiles(join(HERE, "..", "src", "app"));
  assert.deepEqual(found, [], `route-level loading files hide the page from crawlers: ${found.join(", ")}`);
  console.log("no-route-loading: OK");
}

main();
