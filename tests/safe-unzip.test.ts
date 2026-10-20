/**
 * services/collector/shared/safe-unzip.ts against archives built to attack it:
 * `..` and absolute paths (zip-slip), a symlink named stops.txt, too many
 * entries, a declared bomb, a bomb whose headers lie about its size, names
 * that unzip would read as options, and zipinfo lines we cannot parse.
 * Runs the real Info-ZIP unzip, so it needs the collector image.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:safe-unzip
 */

import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateRawSync } from "node:zlib";
import { UnsafeZipError, extractionLimits, parseZipinfo, safeExtract } from "../services/collector/shared/safe-unzip";

// ── A minimal ZIP writer (stored or deflated entries, unix attributes) ───────

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf: Buffer) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

interface Entry { name: string; data: Buffer; symlink?: boolean; deflate?: boolean; declaredSize?: number }

function zip(entries: Entry[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const e of entries) {
    const name = Buffer.from(e.name, "utf8");
    const body = e.deflate ? deflateRawSync(e.data) : e.data;
    const size = e.declaredSize ?? e.data.length;
    const crc = crc32(e.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(e.deflate ? 8 : 0, 8);
    local.writeUInt16LE(0x21, 12); // 1980-01-01
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(size, 22);
    local.writeUInt16LE(name.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE((3 << 8) | 20, 4); // made by unix
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(e.deflate ? 8 : 0, 10);
    central.writeUInt16LE(0x21, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(size, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(((e.symlink ? 0o120777 : 0o100644) << 16) >>> 0, 38);
    central.writeUInt32LE(offset, 42);
    locals.push(local, name, body);
    centrals.push(central, name);
    offset += 30 + name.length + body.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

const work = mkdtempSync(join(tmpdir(), "safe-unzip-test-"));
let n = 0;
async function extract(entries: Entry[], limits = { maxEntries: 100, maxTotalBytes: 50 * 1024 * 1024 }) {
  const dir = join(work, `case-${++n}`, "out");
  const zipPath = join(work, `case-${n}`, "f.zip");
  mkdirSync(dir, { recursive: true });
  writeFileSync(zipPath, zip(entries));
  return { dir, run: () => safeExtract(zipPath, dir, limits) };
}

const stops = Buffer.from("stop_id,stop_name,stop_lat,stop_lon\n1,Plaza,41.6,-4.7\n");
const routes = Buffer.from("route_id,route_short_name,route_type\nR1,1,3\n");

async function main() {
  // 1. A normal feed: only the root-level .txt files come out, intact.
  const ok = await extract([
    { name: "stops.txt", data: stops, deflate: true },
    { name: "routes.txt", data: routes },
    { name: "extra/notes.txt", data: Buffer.from("x") },
    { name: "README.md", data: Buffer.from("x") },
  ]);
  assert.deepEqual(await ok.run(), ["stops.txt", "routes.txt"]);
  assert.deepEqual(readdirSync(ok.dir).sort(), ["routes.txt", "stops.txt"]);
  assert.deepEqual(readFileSync(join(ok.dir, "stops.txt")), stops);

  // 2-4. zip-slip: `..`, absolute and backslash paths reject the whole archive, nothing written.
  for (const [name, why] of [["../evil.txt", /`\.\.` in path/], ["/tmp/abs-evil.txt", /absolute path/], ["..\\evil.txt", /backslash/]] as const) {
    const c = await extract([{ name: "stops.txt", data: stops }, { name, data: Buffer.from("pwned") }]);
    await assert.rejects(c.run(), (e: Error) => e instanceof UnsafeZipError && why.test(e.message), name);
    assert.deepEqual(readdirSync(c.dir), [], `${name}: nothing extracted`);
    assert.equal(existsSync(join(c.dir, "..", "evil.txt")), false);
  }
  assert.equal(existsSync("/tmp/abs-evil.txt"), false);

  // 5. A symlink named stops.txt (→ /proc/self/environ) rejects the archive.
  const link = await extract([{ name: "stops.txt", data: Buffer.from("/proc/self/environ"), symlink: true }, { name: "routes.txt", data: routes }]);
  await assert.rejects(link.run(), (e: Error) => e instanceof UnsafeZipError && /symlink/.test(e.message));
  assert.deepEqual(readdirSync(link.dir), []);

  // 6. Too many entries.
  const many = await extract(Array.from({ length: 6 }, (_, i) => ({ name: `f${i}.txt`, data: Buffer.from("x") })), { maxEntries: 5, maxTotalBytes: 1e9 });
  await assert.rejects(many.run(), (e: Error) => e instanceof UnsafeZipError && /6 entries \(limit 5\)/.test(e.message));

  // 7. A bomb that declares its size is refused before anything is written.
  const declared = await extract([{ name: "stop_times.txt", data: Buffer.alloc(2 * 1024 * 1024), deflate: true }], { maxEntries: 100, maxTotalBytes: 1024 * 1024 });
  await assert.rejects(declared.run(), (e: Error) => e instanceof UnsafeZipError && /declares 2097152 bytes/.test(e.message));
  assert.deepEqual(readdirSync(declared.dir), []);

  // 8. A bomb whose headers say 100 bytes: stopped by the real byte count.
  const liar = await extract([{ name: "stop_times.txt", data: Buffer.alloc(5 * 1024 * 1024), deflate: true, declaredSize: 100 }], { maxEntries: 100, maxTotalBytes: 1024 * 1024 });
  await assert.rejects(liar.run(), (e: Error) => e instanceof Error && /expands past 1048576|exited/.test(e.message));
  const written = existsSync(join(liar.dir, "stop_times.txt")) ? readFileSync(join(liar.dir, "stop_times.txt")).length : 0;
  assert.ok(written <= 2 * 1024 * 1024, `stopped near the limit (${written} bytes written)`);

  // 9. Names unzip would read as options (`unzip -p zip -x.txt`) are never passed to it.
  const opt = await extract([
    { name: "stops.txt", data: stops },
    { name: "-x.txt", data: Buffer.from("x") },
    { name: "-d.txt", data: Buffer.from("x") },
  ]);
  assert.deepEqual(await opt.run(), ["stops.txt"]);
  assert.deepEqual(readdirSync(opt.dir), ["stops.txt"]);

  // 10. A zipinfo entry line we cannot parse rejects the archive instead of being skipped.
  const line = (perm: string, size: number, name: string) => `${perm}  3.0 unx ${String(size).padStart(8)} tx ${String(size).padStart(8)} stor 19800101.000000 ${name}`;
  const header = "Archive:  f.zip\nZip file size: 999 bytes, number of entries: 3";
  const listing = (lines: string[], total: number) => [header, ...lines, `${total} files, 30 bytes uncompressed, 30 bytes compressed:  0.0%`].join("\n");
  assert.equal(parseZipinfo(listing([line("-rw-r--r--", 10, "stops.txt"), line("lrwxrwxrwx", 18, "routes.txt")], 2)).length, 2);
  assert.equal(parseZipinfo(listing([line("lrwxrwxrwx", 18, "routes.txt")], 1))[0].symlink, true);
  assert.throws(
    () => parseZipinfo(listing([line("-rw-r--r--", 10, "stops.txt"), "?rw-r--r--  3.0 unx  mangled entry line", line("-rw-r--r--", 10, "trips.txt")], 3)),
    (e: Error) => e instanceof UnsafeZipError && /unparsed entries: zipinfo lists 3, 2 understood/.test(e.message),
  );
  assert.throws(() => parseZipinfo([header, line("-rw-r--r--", 10, "stops.txt")].join("\n")), /no summary line/);
  assert.equal(parseZipinfo([header, line("-rw-r--r--", 10, "stops.txt"), "1 file, 10 bytes uncompressed, 10 bytes compressed:  0.0%"].join("\n")).length, 1);

  // 11. The limits: a 50 MB floor, 50× the archive, never past 4 GB.
  const MB = 1024 * 1024;
  assert.equal(extractionLimits(10 * 1024).maxTotalBytes, 50 * MB);
  assert.equal(extractionLimits(2 * MB).maxTotalBytes, 100 * MB);
  assert.equal(extractionLimits(106 * MB).maxTotalBytes, 4 * 1024 * MB, "Lisboa TML expands to 1.26 GB, under the cap");
  assert.equal(extractionLimits(1).maxEntries, 100);

  console.log("safe-unzip: all checks passed");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => rmSync(work, { recursive: true, force: true }));
