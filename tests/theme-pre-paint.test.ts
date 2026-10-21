/**
 * THEME_PRE_PAINT_SCRIPT puts `dark` on <html> before the first paint, by the
 * same rule ThemeToggle uses; and the CSP hashes written next to the inline
 * scripts in src/app/layout.tsx match them.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:theme-pre-paint
 */

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { THEME_PRE_PAINT_SCRIPT } from "../src/components/layout/theme-pre-paint";
import { CONSENT_PRE_PAINT_SCRIPT } from "../src/components/cookie-consent/types";

function run(stored: string | null | Error, prefersDark: boolean): boolean {
  const classes = new Set<string>();
  const context = {
    localStorage: {
      getItem: (key: string) => {
        assert.equal(key, "theme");
        if (stored instanceof Error) throw stored;
        return stored;
      },
    },
    window: { matchMedia: (q: string) => ({ matches: q === "(prefers-color-scheme: dark)" && prefersDark }) },
    document: { documentElement: { classList: { add: (c: string) => classes.add(c) } } },
  };
  vm.runInNewContext(THEME_PRE_PAINT_SCRIPT, context);
  return classes.has("dark");
}

// The five cases: a stored choice wins; with none, the system preference.
assert.equal(run("dark", false), true, "stored dark");
assert.equal(run("light", true), false, "stored light beats a dark system");
assert.equal(run(null, true), true, "no choice, dark system");
assert.equal(run(null, false), false, "no choice, light system");
assert.equal(run(new Error("SecurityError: storage disabled"), true), false, "storage throwing: no error, no class");

// Static: nothing interpolated into the inline script.
const source = readFileSync(join(process.cwd(), "src/components/layout/theme-pre-paint.ts"), "utf8");
assert.ok(!source.includes("${"), "no template interpolation in the pre-paint script");

// The CSP hashes in layout.tsx are the scripts' own.
const layout = readFileSync(join(process.cwd(), "src/app/layout.tsx"), "utf8");
for (const [name, script] of [["consent", CONSENT_PRE_PAINT_SCRIPT], ["theme", THEME_PRE_PAINT_SCRIPT]] as const) {
  const hash = `'sha256-${createHash("sha256").update(script).digest("base64")}'`;
  assert.ok(layout.includes(hash), `${name} script: layout.tsx should say CSP hash ${hash}`);
}

console.log("theme pre-paint: all checks passed");
