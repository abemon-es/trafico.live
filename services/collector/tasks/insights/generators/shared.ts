import { PrismaClient, ArticleCategory, FuelPriceDailyStats } from "@prisma/client";

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
  total: number;
  byType: Record<string, number>;
  /** By province code. */
  byProvince: Record<string, number>;
  /** The Madrid hour (0-23) in which most of them started, or null. */
  peakHour: number | null;
}

/**
 * Incidents that started in [from, to), one row per source situation: the unit
 * «incidencias» means. DailyStats sums hourly snapshots of the active set
 * (incident-hours), which read as «593.436 incidencias» in a week. Reports
 * count closed periods only, so like is compared with like.
 */
export async function incidentCounts(prisma: PrismaClient, from: Date, to: Date): Promise<IncidentCounts> {
  const where = { startedAt: { gte: from, lt: to } };
  const [total, byType, byProvince, peak] = await Promise.all([
    prisma.trafficIncident.count({ where }),
    prisma.trafficIncident.groupBy({ by: ["type"], where, _count: { _all: true } }),
    prisma.trafficIncident.groupBy({ by: ["province"], where: { ...where, province: { not: null } }, _count: { _all: true } }),
    prisma.$queryRaw<{ h: number }[]>`
      SELECT EXTRACT(HOUR FROM "startedAt" AT TIME ZONE 'Europe/Madrid')::int AS h
      FROM "TrafficIncident" WHERE "startedAt" >= ${from} AND "startedAt" < ${to}
      GROUP BY 1 ORDER BY count(*) DESC, 1 LIMIT 1`,
  ]);
  return {
    total,
    byType: Object.fromEntries(byType.map((r) => [r.type, r._count._all])),
    byProvince: Object.fromEntries(byProvince.map((r) => [r.province as string, r._count._all])),
    peakHour: peak[0]?.h ?? null,
  };
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
};
