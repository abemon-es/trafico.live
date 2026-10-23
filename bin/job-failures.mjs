/**
 * Collector jobs that failed without reaching GlitchTip (decision, BACKLOG
 * cycle 125). Since #198 supercronic has no DSN: a task that throws or records
 * status «error» is reported by the dispatcher, but a process that dies
 * outright (OOM kill, a recreate's SIGKILL, node failing to start) is not.
 * supercronic still logs every failed job, «error running command: exit status
 * N» with job.command «TASK=<task> …», so the probe counts those per task over
 * the last hour and flags any task with a failure and no GlitchTip event in
 * that hour. An upstream outage is reported once, when it starts, and each
 * later run logs «upstream still failing … reported when it started»: those
 * failures are listed, not flagged. They are matched by that line, one per
 * failure, not by /api/health's current cause, which clears as soon as the
 * task recovers (2026-10-23: detector's last six 502 runs before the NAP fix
 * read as flagged for the hour after it came back).
 *
 *   node bin/job-failures.mjs < input.json   # {lokiOk, lines, gtTasks, upstreamTasks}
 *
 * A dead Loki query comes out as ok:false, never as «no failures» (CTO).
 */

const FAILED = /error running command: exit status \d+/;
const UPSTREAM = /upstream still failing/;
const TASK = /TASK=([A-Za-z0-9_-]+)/;

function byTask(lines, re) {
  const counts = {};
  for (const line of lines) {
    if (!re.test(line)) continue;
    const m = line.match(TASK);
    if (!m) continue;
    counts[m[1]] = (counts[m[1]] ?? 0) + 1;
  }
  return counts;
}

/** Failed-job lines per task. */
export const failuresByTask = (lines) => byTask(lines, FAILED);
/** Runs per task that failed on a known upstream outage, already reported. */
export const upstreamRunsByTask = (lines) => byTask(lines, UPSTREAM);

export function classify({ lokiOk, lines, gtTasks, upstreamTasks }) {
  if (!lokiOk || !Array.isArray(lines)) return { ok: false, error: "loki query failed" };
  const counts = failuresByTask(lines);
  const upstreamRuns = upstreamRunsByTask(lines);
  const reported = new Set(gtTasks ?? []);
  const upstreamNow = new Set(upstreamTasks ?? []);
  const tasks = Object.keys(counts).sort();
  // Failures not explained by an «upstream still failing» line of their own.
  const unexplained = (t) => counts[t] - (upstreamRuns[t] ?? 0);
  const upstream = new Set(tasks.filter((t) => upstreamNow.has(t) || unexplained(t) <= 0));
  return {
    ok: true,
    total: tasks.reduce((s, t) => s + counts[t], 0),
    tasks: counts,
    flagged: tasks.filter((t) => !reported.has(t) && !upstream.has(t)).map((t) => ({ task: t, failures: unexplained(t) })),
    upstream: tasks.filter((t) => upstream.has(t)).map((t) => ({ task: t, failures: counts[t] })),
    reported: tasks.filter((t) => reported.has(t) && !upstream.has(t)),
  };
}

// CLI: JSON in, JSON out.
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  let raw = "";
  process.stdin.on("data", (d) => (raw += d));
  process.stdin.on("end", () => {
    let input;
    try {
      input = JSON.parse(raw);
    } catch {
      input = { lokiOk: false };
    }
    process.stdout.write(JSON.stringify(classify(input)) + "\n");
  });
}
