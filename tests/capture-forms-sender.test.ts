/**
 * Email capture only where a sender keeps the promise: no page renders the
 * price-alert or old newsletter forms, the footer CTA stays out until the
 * digest sends, and the closed sign-up routes store nothing.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:capture-forms
 */

import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(name) ? [p] : [];
  });
}

function main() {
  const sources = files(join(ROOT, "src")).map((f) => ({ f: relative(ROOT, f), s: readFileSync(f, "utf8") }));

  for (const form of ["PriceAlertForm", "NewsletterHero", "NewsletterSignup"]) {
    const users = sources.filter(({ s }) => new RegExp(`<${form}\\b`).test(s)).map(({ f }) => f);
    const own = users.filter((f) => !f.startsWith("src/components/newsletter/") && !f.startsWith("src/components/fuel/"));
    assert.deepEqual(own, [], `${form} is rendered with no sender behind it`);
  }

  assert.ok(!/<NewsletterCTA\b/.test(read("src/components/layout/Footer.tsx")), "footer CTA waits for the digest sender");
  assert.match(read("src/components/layout/footer/NewsletterCTA.tsx"), /fetch\("\/api\/digest\/subscribe"/);

  for (const route of ["src/app/api/newsletter/route.ts", "src/app/api/newsletter/subscribe/route.ts", "src/app/api/price-alerts/route.ts"]) {
    const s = read(route);
    assert.match(s, /status: 503/, route);
    assert.ok(!/prisma|@\/lib\/db/.test(s), `${route} stores nothing`);
  }

  console.log("capture-forms: OK");
}

main();
