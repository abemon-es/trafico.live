#!/usr/bin/env node
/**
 * Lint ratchet: eslint errors may go down, never up.
 *
 * Runs eslint on src/ and compares the errors per rule and per file with
 * lint-baseline.json (committed). The deploy build runs it (Dockerfile) since
 * the repo has no PR CI:
 * - more errors than the baseline for any rule in any file → exit 1, naming
 *   the rule and the file;
 * - fewer → passes, and says so: lower the baseline in the same PR with
 *   `node bin/lint-ratchet.mjs --update`.
 *
 * Started on 2026-10-21 at main's count after #159 (182 errors), so it blocks
 * nothing that already exists.
 *
 *   node bin/lint-ratchet.mjs            check
 *   node bin/lint-ratchet.mjs --update   rewrite lint-baseline.json
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const BASELINE = join(ROOT, "lint-baseline.json");
const ESLINT = join(ROOT, "node_modules/eslint/bin/eslint.js");

function currentErrors() {
  let out;
  try {
    out = execFileSync(process.execPath, [ESLINT, "src", "-f", "json"], { cwd: ROOT, maxBuffer: 256 * 1024 * 1024, encoding: "utf8" });
  } catch (err) {
    // eslint exits 1 when it finds errors; its JSON is still on stdout.
    if (!err.stdout) throw err;
    out = err.stdout;
  }
  const byRule = {};
  for (const file of JSON.parse(out)) {
    const rel = relative(ROOT, file.filePath);
    for (const m of file.messages) {
      if (m.severity !== 2) continue;
      const rule = m.ruleId ?? "(parse error)";
      byRule[rule] ??= {};
      byRule[rule][rel] = (byRule[rule][rel] ?? 0) + 1;
    }
  }
  return byRule;
}

const sorted = (byRule) =>
  Object.fromEntries(
    Object.keys(byRule).sort().map((rule) => [rule, Object.fromEntries(Object.keys(byRule[rule]).sort().map((f) => [f, byRule[rule][f]]))]),
  );
const total = (byRule) => Object.values(byRule).reduce((n, files) => n + Object.values(files).reduce((a, b) => a + b, 0), 0);

const now = currentErrors();

if (process.argv.includes("--update")) {
  writeFileSync(BASELINE, JSON.stringify(sorted(now), null, 2) + "\n");
  console.log(`[lint-ratchet] baseline written: ${total(now)} errors`);
  process.exit(0);
}

if (!existsSync(BASELINE)) {
  console.error("[lint-ratchet] lint-baseline.json is missing: run `node bin/lint-ratchet.mjs --update`");
  process.exit(1);
}
const base = JSON.parse(readFileSync(BASELINE, "utf8"));

const worse = [];
const better = [];
for (const rule of new Set([...Object.keys(base), ...Object.keys(now)])) {
  for (const file of new Set([...Object.keys(base[rule] ?? {}), ...Object.keys(now[rule] ?? {})])) {
    const was = base[rule]?.[file] ?? 0;
    const is = now[rule]?.[file] ?? 0;
    if (is > was) worse.push(`  ${rule} in ${file}: ${was} → ${is}`);
    else if (is < was) better.push(`  ${rule} in ${file}: ${was} → ${is}`);
  }
}

console.log(`[lint-ratchet] ${total(now)} eslint errors (baseline ${total(base)})`);
if (worse.length) {
  console.error(`[lint-ratchet] FAIL: more eslint errors than the baseline:\n${worse.join("\n")}`);
  console.error("[lint-ratchet] Fix them. Emergency deploy only: LINT_RATCHET_SKIP=1 (logged).");
  process.exit(1);
}
if (better.length) {
  console.log(`[lint-ratchet] fewer errors than the baseline; lower it in this PR with \`node bin/lint-ratchet.mjs --update\`:\n${better.join("\n")}`);
}
process.exit(0);
