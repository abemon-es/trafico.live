/**
 * Every link to /estadisticas/accidentes/[provincia] reaches a page, judged by
 * the slug set the route resolves: provinceSlug() of each PROVINCES name.
 *
 * On 2026-10-21 seven of the hub's links 404'd. Its grid slugged the short
 * names («Valencia», «Alicante», «Baleares», «Castellón», «Álava») and its
 * top-20 table slugged the accident data's own names («S.C. Tenerife»,
 * «Guipúzcoa»), while the route only knows «valenciavalencia» and the rest.
 * Links are now built from the INE code (provinceSlugByCode).
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:accident-links
 */

import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { PROVINCES, PROVINCE_NAMES } from "../src/lib/geo/ine-codes";
import { provinceSlug, provinceSlugByCode } from "../src/lib/geo/slugify";

// Works whether tsx runs this file as CommonJS (root package) or as ESM.
const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

const routeSlugs = new Set(PROVINCES.map((p) => provinceSlug(p.name)));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return sourceFiles(p);
    return /\.tsx?$/.test(name) ? [p] : [];
  });
}

// 1. By code: all 52 provinces resolve, each to its own page; "8" is "08".
{
  assert.equal(PROVINCES.length, 52);
  const slugs = PROVINCES.map((p) => provinceSlugByCode(p.code));
  for (const [i, s] of slugs.entries()) assert.ok(s && routeSlugs.has(s), `${PROVINCES[i].code} → ${s}`);
  assert.equal(new Set(slugs).size, 52);
  assert.equal(provinceSlugByCode("8"), provinceSlugByCode("08"));
  assert.equal(provinceSlugByCode("99"), null);
}

// 2. The accident data's names (province code + provinceName, 2023): the code
// resolves, the name does not. These seven were the 404s.
{
  const rows: Array<[string, string]> = [
    ["01", "Álava"],
    ["03", "Alicante"],
    ["07", "Baleares"],
    ["12", "Castellón"],
    ["20", "Guipúzcoa"],
    ["38", "S.C. Tenerife"],
    ["46", "Valencia"],
  ];
  for (const [code, name] of rows) {
    assert.ok(!routeSlugs.has(provinceSlug(name)), `control: «${name}» should not resolve by name`);
    assert.ok(routeSlugs.has(provinceSlugByCode(code)!), `${code} «${name}» resolves by code`);
  }
}

// 3. The hub shows a short name for every province it links.
for (const p of PROVINCES) assert.ok(PROVINCE_NAMES[p.code], `no short name for ${p.code} ${p.name}`);

// 4. The sitemap's hand-written list: 52 slugs, each a page.
{
  const src = readFileSync(join(ROOT, "src/lib/sitemap-generator.ts"), "utf8");
  const block = src.match(/const ACCIDENTES_PROVINCE_SLUGS = \[([\s\S]*?)\];/);
  assert.ok(block, "ACCIDENTES_PROVINCE_SLUGS not found in the sitemap generator");
  const listed = [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(listed).size, 52, `sitemap lists ${listed.length} slugs`);
  const missing = listed.filter((s) => !routeSlugs.has(s));
  assert.deepEqual(missing, [], `sitemap URLs that 404: ${missing.join(", ")}`);
}

// 5. In the source: every hard-coded link resolves, and no link slugs a
// province's display or data name.
{
  const literal = /["'`]\/estadisticas\/accidentes\/([a-z0-9-]+)["'`?#]/g;
  const broken: string[] = [];
  const byName: string[] = [];
  let literals = 0;
  for (const file of sourceFiles(join(ROOT, "src"))) {
    const rel = relative(ROOT, file);
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(literal)) {
      literals++;
      if (!routeSlugs.has(m[1])) broken.push(`${rel}: ${m[1]}`);
    }
    text.split("\n").forEach((line, i) => {
      if (/estadisticas\/accidentes\/\$\{provinceSlug\([^)]*provinceName/.test(line)) byName.push(`${rel}:${i + 1}`);
    });
  }
  // Not vacuous: /estadisticas links three provinces by hand (2026-10-21).
  assert.ok(literals >= 3, `only ${literals} hard-coded province links found: is the pattern still matching?`);
  assert.deepEqual(broken, [], `hard-coded links that 404:\n  ${broken.join("\n  ")}`);
  assert.deepEqual(byName, [], `links slugged from a province name, use provinceSlugByCode:\n  ${byName.join("\n  ")}`);
}

console.log("accident-province-links: ok (52 provinces by code, sitemap list and hard-coded links resolve)");
