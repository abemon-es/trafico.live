/**
 * Inline JSON in a <script> can't close the tag. JSON.stringify leaves «<» as
 * is, so a name from a feed or the database holding «</script>» ended the
 * JSON-LD block and the rest was read as HTML. Every inline JSON goes through
 * jsonLdHtml() (src/lib/json-ld.ts), which writes «<» as «\u003c».
 *
 *   1. jsonLdHtml escapes «<», and the JSON parses back to the same data;
 *   2. no file in src puts JSON.stringify straight into __html.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:json-ld
 */

import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { jsonLdHtml } from "../src/lib/json-ld";

const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..", "src");

// 1. Escaping.
const data = { "@type": "Organization", name: "Naviera </script><script>alert(1)</script>", n: 3, list: ["a<b"] };
const out = jsonLdHtml(data);
assert.ok(!out.includes("<"), "no «<» left in the output");
assert.ok(out.includes("\\u003c/script>"), "«<» written as \\u003c");
assert.deepEqual(JSON.parse(out), data, "the JSON parses back to the same data");
assert.equal(jsonLdHtml(undefined), "", "undefined gives an empty script, as before");

// 2. No raw JSON.stringify into __html anywhere in src.
const offenders: string[] = [];
const walk = (dir: string) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|jsx?)$/.test(name) && /__html:\s*JSON\.stringify\(/.test(readFileSync(p, "utf8"))) offenders.push(p);
  }
};
walk(SRC);
assert.deepEqual(offenders, [], "use jsonLdHtml() instead of JSON.stringify in __html");
assert.match(readFileSync(join(SRC, "components/seo/StructuredData.tsx"), "utf8"), /const payload = jsonLdHtml\(data\);/);

console.log("json-ld-escape: ok");
