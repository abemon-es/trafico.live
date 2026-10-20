/**
 * A task that crashes under its flock guard exits with its own code, and only
 * a held lock prints "skipped". `flock -n` returns 1 both when the lock is
 * taken and when the task fails, so the old `|| echo "skipped"` turned every
 * crash (an oom-kill, the dispatcher's exit 1) into "skipped — previous run
 * still in progress" plus "job succeeded", with no GlitchTip event.
 *
 * Runs every flock line of services/collector/crontabs/* through /bin/sh with
 * a stub `npx` on PATH. Needs util-linux flock (the collector image has it).
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:cron
 */

import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const CRONTABS = join(HERE, "../services/collector/crontabs");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Every active crontab line that runs under flock, without its 5 schedule fields. */
function flockLines(): { file: string; cmd: string }[] {
  const out: { file: string; cmd: string }[] = [];
  for (const file of readdirSync(CRONTABS)) {
    for (const line of readFileSync(join(CRONTABS, file), "utf-8").split("\n")) {
      if (line.trimStart().startsWith("#") || !line.includes("flock")) continue;
      const cmd = line.match(/^\s*(?:\S+\s+){5}(.*)$/)?.[1];
      if (cmd) out.push({ file, cmd });
    }
  }
  return out;
}

async function main() {
  const work = mkdtempSync(join(tmpdir(), "cron-flock-"));
  const bin = join(work, "bin");
  mkdirSync(bin);
  // Stands in for `npx tsx index.ts`: exits STUB_RC, or dies by SIGKILL like an oom-kill.
  writeFileSync(
    join(bin, "npx"),
    '#!/bin/sh\necho "stub ran $TASK"\n[ -n "$STUB_KILL" ] && kill -9 $$\nexit ${STUB_RC:-0}\n'
  );
  chmodSync(join(bin, "npx"), 0o755);

  const run = (cmd: string, env: Record<string, string> = {}) => {
    const r = spawnSync("/bin/sh", ["-c", cmd], {
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, ...env },
      encoding: "utf-8",
    });
    return { rc: r.status, out: r.stdout };
  };

  const lines = flockLines();
  assert.ok(lines.length >= 3, `only ${lines.length} flock lines found`);

  for (const { file, cmd: original } of lines) {
    // The lock goes to the scratch dir, not the real /tmp/<task>.lock.
    const cmd = original.replace(/\/tmp\/([\w.-]+\.lock)/g, `${work}/$1`);
    const lock = cmd.match(new RegExp(`(${work}/[\\w.-]+\\.lock)`))?.[1];
    const where = `${file}: ${original.slice(0, 80)}`;
    assert.ok(lock, `${where}: no lock path`);

    const ok = run(cmd);
    assert.equal(ok.rc, 0, `${where}: success → ${ok.rc}`);
    assert.ok(!ok.out.includes("skipped"), `${where}: success printed "skipped"`);

    const failed = run(cmd, { STUB_RC: "1" });
    assert.equal(failed.rc, 1, `${where}: exit 1 → ${failed.rc}`);
    assert.ok(!failed.out.includes("skipped"), `${where}: a crash printed "skipped"`);

    const killed = run(cmd, { STUB_KILL: "1" });
    assert.equal(killed.rc, 137, `${where}: SIGKILL → ${killed.rc}`);
    assert.ok(!killed.out.includes("skipped"), `${where}: a kill printed "skipped"`);

    // A previous run still holds the lock: skipped, exit 0, the task never starts.
    const holder = spawn("flock", [lock!, "-c", "sleep 5"]);
    for (let i = 0; i < 40 && spawnSync("flock", ["-n", "-E", "75", lock!, "true"]).status !== 75; i++) {
      await sleep(50);
    }
    const busy = run(cmd);
    holder.kill();
    assert.equal(busy.rc, 0, `${where}: lock held → ${busy.rc}`);
    assert.ok(busy.out.includes("skipped"), `${where}: lock held but not "skipped"`);
    assert.ok(!busy.out.includes("stub ran"), `${where}: lock held but the task ran`);
  }

  // Regression: the old form reports a crash as a skip, with exit 0.
  const legacy = run(
    `flock -n ${work}/legacy.lock -c 'TASK=voyage-detector npx tsx index.ts 2>&1' || echo "[voyage-detector] skipped — previous run still in progress"`,
    { STUB_RC: "1" }
  );
  assert.equal(legacy.rc, 0);
  assert.ok(legacy.out.includes("skipped"));

  console.log(`  ${lines.length} flock lines: crash → its own code, SIGKILL → 137, lock held → skipped`);
  console.log(`  legacy form, task exit 1 → rc ${legacy.rc} + "skipped"`);
  console.log("cron-flock-exit: ok");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
