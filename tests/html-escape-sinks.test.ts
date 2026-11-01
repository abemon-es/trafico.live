/**
 * Text from feeds can't become markup. Measured on 2026-11-01:
 *   - Typesense 27.1 returns the indexed value unescaped around <mark>: the
 *     document «Puerto <img src=x onerror=alert(1)> Algeciras» came back as
 *     snippet «Puerto <img src=x onerror=alert(1)> <mark>Algeciras</mark>»,
 *     and the search box put it into __html;
 *   - renderMarkdown interpolated article bodies (which carry DGT panel
 *     messages and AEMET warning texts) without escaping, and any link href,
 *     javascript: included.
 *
 *   1. safeHighlight keeps only <mark>; highlightParts gives text + marks;
 *   2. the three search components render <Highlighted>, not __html;
 *   3. renderMarkdown escapes text and refuses non-http(s)/path/anchor hrefs,
 *      adds rel on external links;
 *   4. on six real articles (one per category, /api/noticias 01-11 20:51) the
 *      output is what main rendered: a byte-for-byte visual control.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:html-escape
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { escapeHtml, highlightParts, safeHighlight, safeHref } from "../src/lib/html-escape";
import { renderMarkdown } from "../src/lib/insights/render-markdown";

const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

// 1. Search highlight.
const typesenseSnippet = "Puerto <img src=x onerror=alert(1)> <mark>Algeciras</mark>";
assert.equal(escapeHtml(`&<>"'`), "&amp;&lt;&gt;&quot;&#39;");
const safe = safeHighlight(typesenseSnippet);
assert.equal(safe, "Puerto &lt;img src=x onerror=alert(1)&gt; <mark>Algeciras</mark>");
assert.ok(!/<img/.test(safe));
assert.deepEqual(highlightParts(safe), [
  { text: "Puerto <img src=x onerror=alert(1)> ", mark: false },
  { text: "Algeciras", mark: true },
]);
// Even an unescaped snippet (an old cached response) only yields text + marks.
assert.deepEqual(highlightParts(typesenseSnippet).map((p) => p.mark), [false, true]);

// 2. Components.
for (const f of ["src/app/explorar/content.tsx", "src/components/layout/nav/MegaMenuPanel.tsx", "src/components/layout/nav/MobileMenu.tsx"]) {
  const src = read(f);
  assert.ok(!/__html:\s*result\.highlightedTitle/.test(src), `${f} still puts the highlight in __html`);
  assert.match(src, /<Highlighted snippet=\{result\.highlightedTitle\} \/>/, `${f} renders <Highlighted>`);
}
assert.match(read("src/app/api/search/route.ts"), /highlightedTitle = safeHighlight\(titleHighlight\.snippet\)/);

// 3. renderMarkdown.
const panel = renderMarkdown("- **A-7 Panel:** <script>alert(1)</script> & <b>x</b>");
assert.ok(!/<script|<b>/.test(panel), panel);
assert.match(panel, /&lt;script&gt;alert\(1\)&lt;\/script&gt; &amp; &lt;b&gt;x&lt;\/b&gt;/);
// The lazy (.+?) stops at the first «)», so the leftover «)» stays as text: no link either way.
assert.equal(renderMarkdown("[clic](javascript:alert(1))"), '<p class="text-gray-700 dark:text-gray-300">clic)</p>');
assert.ok(!/href/.test(renderMarkdown('[x](" onmouseover="alert(1))')));
assert.match(renderMarkdown("[DGT](https://www.dgt.es/)"), /<a href="https:\/\/www\.dgt\.es\/" rel="noopener noreferrer" /);
assert.match(renderMarkdown("[Madrid](/trafico/madrid)"), /<a href="\/trafico\/madrid" class=/);
assert.equal(safeHref("//evil.example/x"), null, "protocol-relative is not a site path");
assert.equal(safeHref("#tabla"), "#tabla");
assert.equal(safeHref("data:text/html,x"), null);
assert.match(renderMarkdown("| a | b |\n|---|---|\n| <i>1</i> | 2 |"), /&lt;i&gt;1&lt;\/i&gt;/);

// 4. Real articles render exactly as before.
const articles = JSON.parse(read("tests/fixtures/render-markdown-articles.json")) as { slug: string; body: string; html: string }[];
assert.equal(articles.length, 6);
for (const a of articles) assert.equal(renderMarkdown(a.body), a.html, `${a.slug} renders differently`);

console.log("html-escape-sinks: ok");
