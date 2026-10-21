/**
 * Client components format dates in Madrid time, never in the browser's zone.
 *
 * The server renders in Europe/Madrid. A client component that formats a date
 * with no timeZone renders it again in the browser's zone at hydration, so any
 * visitor outside peninsular time (the Canary Islands, abroad, a crawler in
 * UTC) got a different day or hour for anything near midnight. React threw
 * #418 (text mismatch) and re-rendered the page from scratch: on 2026-10-21 a
 * vessel page's «Puertos visitados» read «08 oct 2026» from the server and the
 * previous day in a UTC browser. The data is Spanish, so its dates are Madrid's.
 *
 * In every "use client" file:
 *   1. toLocaleDateString, toLocaleTimeString, Intl.DateTimeFormat, and
 *      toLocaleString on a date, name a timeZone;
 *   2. no calendar date is built at the browser's local midnight or noon
 *      (`x + "T00:00:00"`): `new Date("2026-10-21")` is UTC midnight, the same
 *      day in Madrid.
 * Not covered: getHours()/getDay()/getMonth() on a date. Some are calendar
 * arithmetic on "now" rather than display, and need reading one by one.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:client-timezone
 */

import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

// Works whether tsx runs this file as CommonJS (root package) or as ESM.
const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

const CALL = /(\.(toLocaleDateString|toLocaleTimeString|toLocaleString)|new Intl\.DateTimeFormat)\(/g;
// Options that only a date takes: tells a date's toLocaleString from a number's.
const DATE_FIELDS = /\b(day|month|year|hour|minute|second|weekday|dateStyle|timeStyle)\s*:/;
const LOCAL_MIDNIGHT = /new Date\([^)]*\+\s*["'`]T\d\d:\d\d(:\d\d)?["'`]\s*\)/;

interface DateCall {
  line: number;
  kind: string;
  args: string;
}

/** Date-formatting calls in a source text, with their argument text. */
function dateCalls(text: string): DateCall[] {
  const out: DateCall[] = [];
  for (const m of text.matchAll(CALL)) {
    const open = m.index! + m[0].length - 1;
    let depth = 0;
    let close = -1;
    for (let j = open; j < text.length; j++) {
      if (text[j] === "(") depth++;
      else if (text[j] === ")" && --depth === 0) {
        close = j;
        break;
      }
    }
    const args = text.slice(open + 1, close);
    const kind = m[2] ?? "Intl.DateTimeFormat";
    const receiver = text.slice(Math.max(0, m.index! - 60), m.index!).split("\n").pop() ?? "";
    if (kind === "toLocaleString" && !DATE_FIELDS.test(args) && !receiver.includes("Date(")) continue;
    out.push({ line: text.slice(0, m.index!).split("\n").length, kind, args });
  }
  return out;
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return sourceFiles(p);
    return /\.tsx?$/.test(name) ? [p] : [];
  });
}

// The parser itself: a multi-line call, a number's toLocaleString, a nested call.
{
  const sample = [
    'a = new Date(x).toLocaleDateString("es-ES", {',
    '  day: "2-digit",',
    "});",
    'b = price.toLocaleString("es-ES", { minimumFractionDigits: 3 });',
    'c = new Date(f(y)).toLocaleString("es-ES");',
    'd = new Intl.DateTimeFormat("es-ES", { weekday: "short", timeZone: "Europe/Madrid" }).format(z);',
  ].join("\n");
  const found = dateCalls(sample);
  assert.deepEqual(
    found.map((c) => [c.line, c.kind]),
    [
      [1, "toLocaleDateString"],
      [5, "toLocaleString"],
      [6, "Intl.DateTimeFormat"],
    ]
  );
  assert.ok(!found[0].args.includes("timeZone") && found[2].args.includes("timeZone"));
}

const missing: string[] = [];
const localMidnight: string[] = [];
let checked = 0;
for (const file of sourceFiles(join(ROOT, "src"))) {
  const text = readFileSync(file, "utf8");
  if (!/^\s*["']use client["']/.test(text)) continue;
  const rel = relative(ROOT, file);
  for (const c of dateCalls(text)) {
    checked++;
    if (!c.args.includes("timeZone")) missing.push(`${rel}:${c.line} ${c.kind}`);
  }
  text.split("\n").forEach((line, i) => {
    if (LOCAL_MIDNIGHT.test(line)) localMidnight.push(`${rel}:${i + 1}`);
  });
}

// Not vacuous: the client components do format dates (60 calls on 2026-10-21).
assert.ok(checked >= 50, `only ${checked} date calls found in client files: is the parser still matching?`);
assert.deepEqual(missing, [], `client date formatting without a timeZone:\n  ${missing.join("\n  ")}`);
assert.deepEqual(localMidnight, [], `calendar dates built at the browser's local time:\n  ${localMidnight.join("\n  ")}`);
console.log(`client-timezone: ok (${checked} date calls in client files, all with a timeZone)`);
