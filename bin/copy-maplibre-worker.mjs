#!/usr/bin/env node
// Copies MapLibre's worker into public/vendor so the site can serve it.
// See src/lib/maplibre-worker.ts for why.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const pkgDir = dirname(require.resolve("maplibre-gl/package.json"));
const src = join(pkgDir, "dist", "maplibre-gl-worker.mjs");
const destDir = join(process.cwd(), "public", "vendor");
mkdirSync(destDir, { recursive: true });
copyFileSync(src, join(destDir, "maplibre-gl-worker.mjs"));
console.log("[copy-maplibre-worker] public/vendor/maplibre-gl-worker.mjs");
