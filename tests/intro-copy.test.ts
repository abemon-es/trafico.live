/**
 * Intro text of the priority pages (src/lib/seo/intro-copy.ts): well-formed
 * keys and copy, and every key reaches a template that renders it.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:intro-copy
 */

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { INTRO_COPY, introCopy } from "../src/lib/seo/intro-copy";

const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, "..", "src", "app");

type Page = { file: string; segs: string[] };

// Every page.tsx with its URL segments; route groups "(x)" add no segment.
function pages(dir: string, segs: string[] = []): Page[] {
  const out: Page[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (e.name.startsWith("_") || (segs.length === 0 && e.name === "api")) continue;
      out.push(...pages(join(dir, e.name), /^\(.*\)$/.test(e.name) ? segs : [...segs, e.name]));
    } else if (e.name === "page.tsx") {
      out.push({ file: join(dir, e.name), segs });
    }
  }
  return out;
}

// The page that serves a path: the match with the most static segments wins.
function resolve(all: Page[], path: string): Page | undefined {
  const parts = path === "/" ? [] : path.slice(1).split("/");
  const statics = (p: Page) => p.segs.filter((s) => !s.startsWith("[")).length;
  return all
    .filter((p) => p.segs.length === parts.length && p.segs.every((s, i) => s.startsWith("[") || s === parts[i]))
    .sort((a, b) => statics(b) - statics(a))[0];
}

function main() {
  const entries = Object.entries(INTRO_COPY);
  assert.ok(entries.length > 0);

  for (const [path, text] of entries) {
    assert.ok(path.startsWith("/"), `${path} is a path`);
    assert.ok(path === "/" || !path.endsWith("/"), `${path} has no trailing slash`);
    assert.ok(!/[?#\s]/.test(path), `${path} has no query, hash or space`);
    assert.ok(text.length >= 80 && text.length <= 400, `${path}: intro is one short paragraph (${text.length} chars)`);
    assert.ok(!/[—–]/.test(text), `${path}: no dashes`);
    assert.ok(!/<[a-z]/i.test(text), `${path}: plain text, no markup`);
  }
  assert.equal(introCopy("/no-existe"), null);

  // A key whose template never renders <PageIntro> (or the home/location
  // equivalents) would be copy nobody sees.
  const all = pages(APP);
  const renders = /<PageIntro\b|introPath=|introCopy\(/;
  for (const path of Object.keys(INTRO_COPY)) {
    const page = resolve(all, path);
    assert.ok(page, `${path} resolves to a page`);
    assert.ok(renders.test(readFileSync(page.file, "utf8")), `${path}: ${page.file} renders the intro`);
  }

  console.log(`intro-copy: ${entries.length} pages OK`);
}

main();
