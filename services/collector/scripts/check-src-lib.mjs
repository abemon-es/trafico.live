#!/usr/bin/env node
/**
 * Build-time gate (Dockerfile.cron): every repo `src/lib` file the collectors
 * import must be in the image.
 *
 * Dockerfile.cron copies only the src/lib files the collectors use, so a change
 * elsewhere in src/lib leaves the image (and the running containers) untouched.
 * The catch: a collector that starts importing another src/lib file would build
 * fine and then crash at runtime. This script fails the build instead.
 *
 * It walks every import specifier in the collector sources that points into
 * src/lib (`from "…"`, side-effect `import "…"`, dynamic `import("…")`,
 * `require("…")`), resolves it on disk
 * the same way the runtime will, then follows the relative imports inside those
 * src/lib files. Anything that doesn't resolve is printed and exits 1.
 *
 * Usage: node scripts/check-src-lib.mjs [collectorRoot]   (default: cwd)
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const root = resolve(process.argv[2] || process.cwd());
// `… from "x"`, side-effect `import "x"`, dynamic `import("x")`, `require("x")`.
const SPEC = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)["']([^"']+)["']/g;

function* sourceFiles(dir) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* sourceFiles(p);
    else if (/\.(ts|mts|js|mjs)$/.test(name)) yield p;
  }
}

/** The file the runtime would load for this specifier, or null. */
function resolveOnDisk(fromFile, spec) {
  const base = resolve(dirname(fromFile), spec);
  const stem = base.replace(/\.(js|mjs|ts)$/, "");
  for (const candidate of [base, `${stem}.js`, `${stem}.ts`, join(stem, "index.js"), join(stem, "index.ts")]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

const missing = [];
const seen = new Set();
const queue = [];

for (const file of sourceFiles(root)) {
  const text = readFileSync(file, "utf8");
  for (const [, spec] of text.matchAll(SPEC)) {
    if (!spec.startsWith(".") || !spec.includes("src/lib/")) continue;
    const target = resolveOnDisk(file, spec);
    if (target) queue.push(target);
    else missing.push(`${file.replace(root + "/", "")} → ${spec}`);
  }
}

// Follow relative imports inside the shared src/lib files themselves.
while (queue.length) {
  const file = queue.pop();
  if (seen.has(file)) continue;
  seen.add(file);
  const text = readFileSync(file, "utf8");
  for (const [, spec] of text.matchAll(SPEC)) {
    if (!spec.startsWith(".")) continue;
    const target = resolveOnDisk(file, spec);
    if (target) queue.push(target);
    else missing.push(`${file} → ${spec}`);
  }
}

if (missing.length) {
  console.error("check-src-lib: collector imports src/lib files that are not in the image.");
  console.error("Add them to the src/lib COPY lines in services/collector/Dockerfile.cron:");
  for (const m of missing) console.error(`  ${m}`);
  process.exit(1);
}
console.log(`check-src-lib: ok (${seen.size} src/lib files resolved)`);
