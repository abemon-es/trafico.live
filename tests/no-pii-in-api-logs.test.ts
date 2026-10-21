/**
 * API routes never write personal data to the logs.
 *
 * Until 2026-10-22 the contact routes logged the whole submission (name,
 * email, message) when no sender was configured, the newsletter webhook logged
 * subscribers' addresses on every delivery, open, click and bounce, and the
 * billing webhook logged customers' addresses. Logs are kept for 30 days and
 * read by more people than the data's owner. Log identifiers (email_id, key
 * id, event id), never the person.
 *
 * In src/app/api/**: no console.* call whose arguments, string text aside,
 * name email, payload, body, nombre, mensaje, phone or the request body.
 * «Confirmation email failed» is text and passes; `${email}` does not.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:no-pii-logs
 */

import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

// Works whether tsx runs this file as CommonJS (root package) or as ESM.
const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

const CALL = /console\.(log|info|warn|error|debug)\(/g;
const PERSONAL = /\b(email|emails|payload|body|nombre|mensaje|telefono|phone)\b|\bto\[0\]|\bv\.data\b|\b(req|request)\.(body|json)\b/i;

/** A call's argument text with string contents removed, `${…}` kept. */
function codeOf(args: string): string {
  let out = "";
  for (let i = 0; i < args.length; i++) {
    const q = args[i];
    if (q !== '"' && q !== "'" && q !== "`") {
      out += q;
      continue;
    }
    for (i++; i < args.length && args[i] !== q; i++) {
      if (args[i] === "\\") i++;
      else if (q === "`" && args[i] === "$" && args[i + 1] === "{") {
        let depth = 0;
        for (; i < args.length; i++) {
          if (args[i] === "{") depth++;
          else if (args[i] === "}" && --depth === 0) break;
          out += args[i];
        }
        out += " ";
      }
    }
    out += '""';
  }
  return out;
}

/** console.* calls in a source text that log personal data, as line numbers. */
function leaks(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(CALL)) {
    const open = m.index! + m[0].length - 1;
    let depth = 0;
    let close = open;
    for (let j = open; j < text.length; j++) {
      if (text[j] === "(") depth++;
      else if (text[j] === ")" && --depth === 0) {
        close = j;
        break;
      }
    }
    if (PERSONAL.test(codeOf(text.slice(open + 1, close)))) out.push(text.slice(0, m.index).split("\n").length);
  }
  return out;
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return sourceFiles(p);
    return name.endsWith(".ts") ? [p] : [];
  });
}

// The matcher itself, on the lines that were there and on what must pass.
assert.deepEqual(leaks('console.log("[contact] SES not configured. Would send to:", payload.email, payload);'), [1]);
assert.deepEqual(leaks('console.log("[contacto-general]", v.data);'), [1]);
assert.deepEqual(leaks("console.log(`[newsletter:events] Delivered: ${event.data.to[0]} email_id=${event.data.email_id}`);"), [1]);
assert.deepEqual(leaks("console.log(`[webhook] Created ${tier} key for ${email}`, { eventId });"), [1]);
assert.deepEqual(leaks('console.warn("[Newsletter] Confirmation email failed:", sendError);'), [], "text about an email is fine");
assert.deepEqual(leaks("console.log(`[newsletter:events] Opened email_id=${event.data.email_id}`);"), [], "an email_id is an identifier");
assert.deepEqual(leaks('console.warn("[contacto-general] SES not configured. Logging payload only.");'), [], "the word in text is fine");

const found: string[] = [];
let calls = 0;
for (const file of sourceFiles(join(ROOT, "src/app/api"))) {
  const text = readFileSync(file, "utf8");
  calls += [...text.matchAll(CALL)].length;
  for (const line of leaks(text)) found.push(`${relative(ROOT, file)}:${line}`);
}
// Not vacuous: the API routes log (87 calls on 2026-10-22).
assert.ok(calls >= 50, `only ${calls} console calls found under src/app/api: is the matcher still matching?`);
assert.deepEqual(found, [], `API logs with personal data (log an id instead):\n  ${found.join("\n  ")}`);
console.log(`no-pii-in-api-logs: ok (${calls} console calls under src/app/api, none with personal data)`);
