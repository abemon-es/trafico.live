/**
 * One page per port: /maritimo/puertos/<slug>. The SpanishPort route
 * /maritimo/puerto/<slug> redirects there, the sitemaps list the plural URL
 * only, and the sitemap slugs a station's port name the way the page does.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:puertos
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { portSlug } from "../src/lib/maritimo/port-slug";

// The page and the sitemap turn a port name into the same slug.
assert.equal(portSlug("L'Escala"), "l-escala");
assert.equal(portSlug("L'Hospitalet de l'Infant"), "l-hospitalet-de-l-infant");
assert.equal(portSlug("Marina Vela "), "marina-vela");
assert.equal(portSlug("Pto.Deport.Las Fuentes de Alcocebre (Muelle Escollera)"), "pto-deport-las-fuentes-de-alcocebre-muelle-escollera");
assert.equal(portSlug("A Coruña"), "a-coruna");
assert.equal(portSlug("Sant Carles de la Ràpita"), "sant-carles-de-la-rapita");

const page = readFileSync("src/app/maritimo/puertos/[slug]/page.tsx", "utf8");
assert.match(page, /import \{ portSlug \} from "@\/lib\/maritimo\/port-slug"/);
assert.match(page, /portSlug\(p\.port\) === slug/);
assert.ok(!/function slugify\(/.test(page), "the page has no slugging of its own");
assert.match(page, /canonical: `\$\{BASE_URL\}\/maritimo\/puertos\/\$\{slug\}`/);

const gen = readFileSync("src/lib/sitemap-generator.ts", "utf8");
assert.match(gen, /import \{ portSlug \} from "@\/lib\/maritimo\/port-slug"/);
assert.match(gen, /const slug = p\.port \? portSlug\(p\.port\) : ""/);
assert.match(gen, /if \(!slug \|\| listed\.has\(slug\)\) return \[\]/, "a port with a SpanishPort entry is listed once, in its shard");
assert.match(gen, /url: `\$\{BASE_URL\}\/maritimo\/puertos\/\$\{p\.slug\}`/, "the spanish-port shard lists the plural URL");
assert.ok(!gen.includes("/maritimo/puerto/"), "no sitemap lists the singular route");
assert.ok(!gen.includes("encodeURIComponent(\n          p"), "the old slugging is gone");

// The singular route is gone, and redirects for good to the plural one.
assert.equal(existsSync("src/app/maritimo/puerto"), false);
const config = readFileSync("next.config.ts", "utf8");
assert.match(config, /source: "\/maritimo\/puerto",\s*destination: "\/maritimo\/puertos",\s*permanent: true/);
assert.match(config, /source: "\/maritimo\/puerto\/:slug",\s*destination: "\/maritimo\/puertos\/:slug",\s*permanent: true/);

console.log("puertos-ficha-unica: ok");
