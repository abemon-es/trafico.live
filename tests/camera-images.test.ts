/**
 * Camera thumbnails are never sent through Next's image optimizer.
 *
 * They are live DGT snapshots on etraffic.dgt.es (all 1,972 active cameras on
 * 2026-10-21). That host isn't in next.config.ts images.remotePatterns, so the
 * optimizer answered 400 for every thumbnail of /camaras/<city> (54 on
 * /camaras/madrid) until 2026-10-21; and if it were allowed, it would cache a
 * snapshot that changes every few minutes. Every <Image> with a thumbnailUrl
 * src must be `unoptimized` (a plain <img> is fine too).
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:camera-images
 */

import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const IMAGE = /<Image\b[^>]*?\/>/g; // [^>] spans lines already
const optimised = (tag: string) => /src=\{[\w.?]*thumbnailUrl/.test(tag) && !/\bunoptimized\b/.test(tag);

assert.equal(optimised('<Image src={cam.thumbnailUrl} alt="x" width={640} height={480} />'), true);
assert.equal(optimised('<Image src={cam.thumbnailUrl} alt="x" fill unoptimized />'), false);
assert.equal(optimised('<Image src={logo} alt="x" width={10} height={10} />'), false, "other images are not this rule's");

const offenders: string[] = [];
const walk = (dir: string) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (name.endsWith(".tsx")) {
      const text = readFileSync(path, "utf8");
      for (const m of text.matchAll(IMAGE)) {
        if (optimised(m[0])) offenders.push(`${path.slice(process.cwd().length + 1)}:${text.slice(0, m.index).split("\n").length}`);
      }
    }
  }
};
walk(join(process.cwd(), "src"));
assert.deepEqual(offenders, [], `camera thumbnails through the image optimizer:\n${offenders.join("\n")}`);

console.log("camera images: all checks passed");
