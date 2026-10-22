import { PrismaClient, ArticleCategory, FuelPriceDailyStats } from "@prisma/client";
import { CITY_SENSOR_WHERE, REPORTED_WHERE, VEHICLE_STOP_WHERE } from "../../../../../src/lib/incident-classes.js";

const tagCache = new Map<string, string>();

export async function ensureTag(prisma: PrismaClient, slug: string, name: string): Promise<string> {
  if (tagCache.has(slug)) return tagCache.get(slug)!;
  const tag = await prisma.tag.upsert({ where: { slug }, update: {}, create: { slug, name } });
  tagCache.set(slug, tag.id);
  return tag.id;
}

export async function attachTags(
  prisma: PrismaClient,
  articleId: string,
  tagDefs: { slug: string; name: string }[]
): Promise<void> {
  const tagIds = await Promise.all(tagDefs.map((t) => ensureTag(prisma, t.slug, t.name)));
  await prisma.articleTag.createMany({
    data: tagIds.map((tagId) => ({ articleId, tagId })),
    skipDuplicates: true,
  });
}

export function todaySlug(): string {
  return new Date().toISOString().split("T")[0];
}

export function weekSlug(): string {
  const now = new Date();
  const oneJan = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(
    ((now.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7
  );
  return `${now.getFullYear()}-S${String(weekNum).padStart(2, "0")}`;
}

export function monthSlug(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function fmtPrice(n: number | null | undefined): string {
  if (n == null) return "N/D";
  return Number(n).toFixed(3);
}

export function fmtPct(n: number): string {
  return `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
}

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("es-ES");
}

/** «1 provincia», «13 provincias». */
export function fmtCount(n: number, one: string, many: string): string {
  return `${fmtInt(n)} ${Math.round(n) === 1 ? one : many}`;
}

export interface NationalFuel {
  /** The latest stored national day on or before the date asked: «now». */
  latest: FuelPriceDailyStats | null;
  /** The stored national day exactly `days` before `latest`, or null. */
  before: (days: number) => FuelPriceDailyStats | null;
}

/**
 * National fuel averages for «now» and for any earlier day, all from one
 * source: the rows the gas-station collector stores in FuelPriceDailyStats
 * (scope «national»: public stations in the Peninsula and the Balearics).
 * Averaging GasStation directly for «now» took in the Canaries, Ceuta and
 * Melilla, about 0,018 €/L cheaper, so every report from April to October
 * 2026 compared two different averages and announced a ~1 % fall that never
 * happened.
 */
export async function nationalFuel(prisma: PrismaClient, onOrBefore: Date): Promise<NationalFuel> {
  const rows = await prisma.fuelPriceDailyStats.findMany({
    where: { scope: "national", date: { lte: onOrBefore } },
    orderBy: { date: "desc" },
    take: 15,
  });
  const latest = rows[0] ?? null;
  const before = (days: number) => {
    if (!latest) return null;
    const at = latest.date.getTime() - days * 86_400_000;
    return rows.find((r) => r.date.getTime() === at) ?? null;
  };
  return { latest, before };
}

export interface IncidentCounts {
  /** Reported incidents only (src/lib/incident-classes.ts). */
  total: number;
  /** Stopped or broken-down vehicles, on their own line. */
  vehicleStops: number;
  /** City measurement points that went congested or closed: one per sensor. */
  citySensors: number;
  /** Reported incidents by type. */
  byType: Record<string, number>;
  /** Reported incidents by province code. */
  byProvince: Record<string, number>;
  /** Reported incidents by source, for the headline's single-feed check. */
  bySource: Record<string, number>;
  /** The Madrid hour (0-23) in which most reported incidents started, or null. */
  peakHour: number | null;
}

const madridHour = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: "Europe/Madrid" });

/**
 * Incidents that started in [from, to), one row per source situation, split by
 * the three classes of src/lib/incident-classes.ts: reported incidents (the
 * headline), vehicle stops and city sensors (each on its own line). A city
 * sensor's row restarts on every congestion episode, so its count is the
 * sensors that congested at least once in the window. DailyStats sums hourly
 * snapshots (incident-hours) and is not used. The peak hour is counted from
 * the same rows, so the rule is never written twice.
 */
export async function incidentCounts(prisma: PrismaClient, from: Date, to: Date): Promise<IncidentCounts> {
  const window = { startedAt: { gte: from, lt: to } };
  const reported = { AND: [window, REPORTED_WHERE] };
  const [total, vehicleStops, citySensors, byType, byProvince, bySource, starts] = await Promise.all([
    prisma.trafficIncident.count({ where: reported }),
    prisma.trafficIncident.count({ where: { AND: [window, VEHICLE_STOP_WHERE] } }),
    prisma.trafficIncident.count({ where: { AND: [window, CITY_SENSOR_WHERE] } }),
    prisma.trafficIncident.groupBy({ by: ["type"], where: reported, _count: { _all: true } }),
    prisma.trafficIncident.groupBy({ by: ["province"], where: { AND: [reported, { province: { not: null } }] }, _count: { _all: true } }),
    prisma.trafficIncident.groupBy({ by: ["source"], where: reported, _count: { _all: true } }),
    prisma.trafficIncident.findMany({ where: reported, select: { startedAt: true } }),
  ]);
  const hours = new Map<number, number>();
  for (const { startedAt } of starts) {
    const h = Number(madridHour.format(startedAt));
    hours.set(h, (hours.get(h) ?? 0) + 1);
  }
  const peak = [...hours].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
  return {
    total,
    vehicleStops,
    citySensors,
    byType: Object.fromEntries(byType.map((r) => [r.type, r._count._all])),
    byProvince: Object.fromEntries(byProvince.map((r) => [r.province as string, r._count._all])),
    bySource: Object.fromEntries(bySource.map((r) => [r.source ?? "—", r._count._all])),
    peakHour: peak ? peak[0] : null,
  };
}

/** Reported incidents started in [from, to), by source: the headline's base. */
export async function reportedBySource(prisma: PrismaClient, from: Date, to: Date): Promise<Record<string, number>> {
  const rows = await prisma.trafficIncident.groupBy({
    by: ["source"],
    where: { AND: [{ startedAt: { gte: from, lt: to } }, REPORTED_WHERE] },
    _count: { _all: true },
  });
  return Object.fromEntries(rows.map((r) => [r.source ?? "—", r._count._all]));
}

/** Reported incidents started in [from, to): a bare count. */
export function countIncidents(prisma: PrismaClient, from: Date, to: Date): Promise<number> {
  return prisma.trafficIncident.count({ where: { AND: [{ startedAt: { gte: from, lt: to } }, REPORTED_WHERE] } });
}

/** Active rows of each class, by the same rule. */
export async function activeCounts(prisma: PrismaClient): Promise<{ incidents: number; vehicleStops: number; citySensors: number }> {
  const active = { isActive: true };
  const [incidents, vehicleStops, citySensors] = await Promise.all([
    prisma.trafficIncident.count({ where: { AND: [active, REPORTED_WHERE] } }),
    prisma.trafficIncident.count({ where: { AND: [active, VEHICLE_STOP_WHERE] } }),
    prisma.trafficIncident.count({ where: { AND: [active, CITY_SENSOR_WHERE] } }),
  ]);
  return { incidents, vehicleStops, citySensors };
}

/** A stored average as a number, or null. */
export function num(v: unknown): number | null {
  return v == null ? null : Number(v);
}

export function getEditorialWeight(category: ArticleCategory): number {
  switch (category) {
    case "ANNUAL_REPORT":
    case "ROAD_ANALYSIS":
      return 10;
    case "MONTHLY_REPORT":
      return 9;
    case "WEEKLY_REPORT":
    case "FUEL_TREND":
      return 7;
    case "DAILY_REPORT":
      return 5;
    case "PRICE_ALERT":
    case "INCIDENT_DIGEST":
    case "WEATHER_ALERT":
      return 4;
    default:
      return 5;
  }
}

export function estimateReadTime(bodyLength: number): string {
  const minutes = Math.max(1, Math.ceil(bodyLength / 5 / 200));
  return `${minutes} min`;
}

export async function getProvinceNameMap(prisma: PrismaClient): Promise<Map<string, string>> {
  const provinces = await prisma.province.findMany({ select: { code: true, name: true } });
  return new Map(provinces.map((p) => [p.code, p.name]));
}

export function mdTable(
  headers: string[],
  rows: string[][],
  alignments?: ("left" | "center" | "right")[]
): string {
  const headerLine = `| ${headers.join(" | ")} |`;
  const sepLine = `| ${headers
    .map((_, i) => {
      const a = alignments?.[i] || "left";
      return a === "center" ? ":---:" : a === "right" ? "---:" : "---";
    })
    .join(" | ")} |`;
  const rowLines = rows.map((row) => `| ${row.join(" | ")} |`);
  return [headerLine, sepLine, ...rowLines].join("\n");
}

export const INCIDENT_TYPE_NAMES: Record<string, string> = {
  ACCIDENT: "Accidente",
  ROADWORK: "Obras",
  CONGESTION: "Retención",
  HAZARD: "Peligro",
  VEHICLE_BREAKDOWN: "Avería",
  WEATHER: "Meteorología",
  EVENT: "Evento",
  CLOSURE: "Corte",
  OTHER: "Otro",
  // Not a TrafficIncident type: the reports' own row for src/lib/incident-classes.ts.
  VEHICLE_STOPS: "Vehículos detenidos (balizas V16 y averías)",
  // Not a TrafficIncident type: the reports' own row for city measurement points.
  CITY_SENSORS: "Retenciones detectadas por sensores urbanos (Madrid, Barcelona, Valencia)",
};
