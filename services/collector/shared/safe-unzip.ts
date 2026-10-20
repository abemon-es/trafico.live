/**
 * Extracting a ZIP we did not produce.
 *
 * transit-gtfs downloads feeds from wherever the MobilityData catalog points,
 * including anonymous file hosts (files.catbox.moe serves two of them since
 * 2026-10-20). `unzip -d` on such a file would restore symlinks (a stops.txt
 * pointing at /proc/self/environ would be parsed into the DB), and nothing
 * capped how much a small archive could expand onto the host's disk.
 *
 * So: list the archive with Info-ZIP's zipinfo, reject it whole if any entry
 * is a symlink or a path that is absolute, has a backslash or a `..` segment,
 * and then stream only the root-level `*.txt` files out with `unzip -p` into
 * paths we choose, counting bytes as they come (headers can lie about sizes).
 */

import { execFileSync, spawn } from "child_process";
import { createWriteStream } from "fs";
import { join } from "path";

const MB = 1024 * 1024;
const GB = 1024 * MB;

export class UnsafeZipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeZipError";
  }
}

export interface ZipEntry {
  name: string;
  size: number;
  symlink: boolean;
}

export interface ExtractLimits {
  maxEntries: number;
  maxTotalBytes: number;
}

/**
 * Real GTFS feeds expand 2.7-11.9× (measured 2026-10-20; the largest, Lisboa
 * TML, 106 MB → 1.26 GB) and have at most 12 files. A bomb expands 1000×.
 */
export function extractionLimits(zipBytes: number): ExtractLimits {
  return {
    maxEntries: 100,
    maxTotalBytes: Math.min(4 * GB, Math.max(50 * MB, 50 * zipBytes)),
  };
}

// zipinfo -l -T: perms, version, os, size, flags, compressed size, method, yyyymmdd.hhmmss, name
const ZIPINFO_LINE = /^(\S+)\s+\S+\s+\S+\s+(\d+)\s+\S+\s+\d+\s+\S+\s+\d{8}\.\d{6}\s(.*)$/;
// zipinfo's own last line: "N file(s), X bytes uncompressed, Y bytes compressed: Z%"
const ZIPINFO_SUMMARY = /^(\d+) files?, \d+ bytes? uncompressed/m;

/** The archive's entries, as Info-ZIP's zipinfo reads its central directory. */
export function listZip(zipPath: string): ZipEntry[] {
  return parseZipinfo(execFileSync("unzip", ["-Z", "-l", "-T", zipPath], { timeout: 60_000, maxBuffer: 16 * MB }).toString());
}

/**
 * zipinfo's listing, entry by entry. An entry line we cannot parse would
 * never reach unsafeEntry(), so the count must match zipinfo's own total:
 * what is not understood is rejected, not skipped.
 */
export function parseZipinfo(out: string): ZipEntry[] {
  const entries: ZipEntry[] = [];
  for (const line of out.split("\n")) {
    const m = ZIPINFO_LINE.exec(line);
    if (m) entries.push({ name: m[3], size: Number(m[2]), symlink: m[1].startsWith("l") });
  }
  const summary = ZIPINFO_SUMMARY.exec(out);
  if (!summary) throw new UnsafeZipError("zipinfo printed no summary line");
  if (Number(summary[1]) !== entries.length) {
    throw new UnsafeZipError(`unparsed entries: zipinfo lists ${summary[1]}, ${entries.length} understood`);
  }
  return entries;
}

/** Why the entry makes the whole archive unsafe, or null. */
export function unsafeEntry(entry: ZipEntry): string | null {
  if (entry.symlink) return "symlink";
  if (entry.name.startsWith("/")) return "absolute path";
  if (entry.name.includes("\\")) return "backslash in path";
  if (entry.name.split("/").includes("..")) return "`..` in path";
  if (/[\u0000-\u001f]/.test(entry.name)) return "control character in name";
  return null;
}

/**
 * Root-level text files only: what a GTFS parser reads. No unzip wildcard
 * characters, and no leading `-`: `unzip -p zip -x.txt` would read the name
 * as an option.
 */
const WANTED = /^[A-Za-z0-9][A-Za-z0-9_-]*\.txt$/;

/**
 * Extracts the root-level `*.txt` files of `zipPath` into `destDir`.
 * Throws UnsafeZipError, before writing anything, if any entry is unsafe or
 * the archive is over the limits, and while writing if the real bytes are.
 */
export async function safeExtract(zipPath: string, destDir: string, limits: ExtractLimits): Promise<string[]> {
  const entries = listZip(zipPath);
  if (entries.length === 0) throw new UnsafeZipError("no entries");
  if (entries.length > limits.maxEntries) {
    throw new UnsafeZipError(`${entries.length} entries (limit ${limits.maxEntries})`);
  }
  for (const entry of entries) {
    const reason = unsafeEntry(entry);
    if (reason) throw new UnsafeZipError(`${reason}: ${JSON.stringify(entry.name.slice(0, 120))}`);
  }
  const declared = entries.reduce((sum, e) => sum + e.size, 0);
  if (declared > limits.maxTotalBytes) {
    throw new UnsafeZipError(`declares ${declared} bytes uncompressed (limit ${limits.maxTotalBytes})`);
  }

  const wanted = entries.filter((e) => WANTED.test(e.name));
  let written = 0;
  for (const entry of wanted) {
    written = await streamEntry(zipPath, entry.name, join(destDir, entry.name), written, limits.maxTotalBytes);
  }
  return wanted.map((e) => e.name);
}

/** `unzip -p` one entry into `outPath`, stopping it once the running total passes the limit. */
function streamEntry(zipPath: string, name: string, outPath: string, before: number, limit: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn("unzip", ["-p", zipPath, name], { stdio: ["ignore", "pipe", "pipe"] });
    const out = createWriteStream(outPath);
    let total = before;
    let failed = false;
    let stderr = "";
    let exitCode: number | null | undefined;
    let flushed = false;
    const fail = (err: Error) => {
      if (failed) return;
      failed = true;
      child.kill("SIGKILL");
      out.destroy();
      reject(err);
    };
    // Done when unzip has exited and the file is flushed, in either order.
    const settle = () => {
      if (failed || exitCode === undefined || !flushed) return;
      if (exitCode !== 0) fail(new Error(`unzip -p ${name} exited ${exitCode}: ${stderr.trim()}`));
      else resolve(total);
    };
    child.stdout.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > limit) fail(new UnsafeZipError(`expands past ${limit} bytes (at ${name})`));
    });
    child.stdout.pipe(out);
    child.stderr.on("data", (d: Buffer) => { stderr += d.toString().slice(0, 500); });
    child.on("error", fail);
    out.on("error", fail);
    out.on("finish", () => { flushed = true; settle(); });
    child.on("close", (code) => { exitCode = code; settle(); });
  });
}
