#!/usr/bin/env node
/**
 * The crontab entries that were due while a collector was down, so they can
 * be re-run (bin/deploy-collectors.sh, 2026-10-22). Run inside the collector
 * container, which has node and the crontab, and the TZ supercronic uses:
 *
 *   docker exec -i <container> node --input-type=module - <crontab> <fromSec> <toSec> < bin/cron-window.mjs
 *
 * Prints one line per due run, «HH:MM TASK=<name>» in the container's zone,
 * for every minute in (from, to]. Standard 5-field cron: *, lists, ranges and
 * steps; day-of-month and day-of-week OR together when both are restricted.
 */

import { readFileSync } from "node:fs";

/** The values a cron field allows, within [min, max]. */
export function fieldValues(field, min, max) {
  const out = new Set();
  for (const part of field.split(",")) {
    const [range, stepStr] = part.split("/");
    const step = stepStr ? Number(stepStr) : 1;
    let lo = min;
    let hi = max;
    if (range !== "*") {
      const [a, b] = range.split("-").map(Number);
      lo = a;
      hi = b ?? (stepStr ? max : a);
    }
    for (let v = lo; v <= hi; v += step) out.add(v);
  }
  return out;
}

/** Parsed crontab entries with a TASK=, skipping comments and env lines. */
export function parseCrontab(text) {
  const entries = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 6 || /^[A-Za-z_][A-Za-z0-9_]*=/.test(parts[0])) continue;
    const [m, h, dom, mon, dow] = parts;
    const task = line.match(/TASK=([A-Za-z0-9_-]+)/)?.[1];
    if (!task) continue;
    entries.push({
      task,
      minute: fieldValues(m, 0, 59),
      hour: fieldValues(h, 0, 23),
      dom: fieldValues(dom, 1, 31),
      domStar: dom === "*",
      month: fieldValues(mon, 1, 12),
      dow: new Set([...fieldValues(dow, 0, 7)].map((d) => d % 7)),
      dowStar: dow === "*",
    });
  }
  return entries;
}

function wallClock(date, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", weekday: "short" })
      .formatToParts(date)
      .map((p) => [p.type, p.value])
  );
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
  return { minute: Number(parts.minute), hour: Number(parts.hour), dom: Number(parts.day), month: Number(parts.month), dow };
}

function due(e, t) {
  if (!e.minute.has(t.minute) || !e.hour.has(t.hour) || !e.month.has(t.month)) return false;
  if (e.domStar && e.dowStar) return true;
  if (e.domStar) return e.dow.has(t.dow);
  if (e.dowStar) return e.dom.has(t.dom);
  return e.dom.has(t.dom) || e.dow.has(t.dow);
}

/** «HH:MM TASK=name» for each entry due at a minute in (fromMs, toMs]. */
export function missedRuns(crontabText, fromMs, toMs, timeZone) {
  const entries = parseCrontab(crontabText);
  const out = [];
  const first = Math.floor(fromMs / 60_000) * 60_000 + 60_000;
  for (let m = first; m <= toMs; m += 60_000) {
    const t = wallClock(new Date(m), timeZone);
    for (const e of entries) {
      if (due(e, t)) out.push(`${String(t.hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")} TASK=${e.task}`);
    }
  }
  return out;
}

const isMain = process.argv[1] === "-" || (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop()));
if (isMain && process.argv.length >= 5) {
  const [file, from, to] = process.argv.slice(2);
  const tz = process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone;
  for (const line of missedRuns(readFileSync(file, "utf8"), Number(from) * 1000, Number(to) * 1000, tz)) console.log(line);
}
