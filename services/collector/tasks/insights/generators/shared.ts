import { PrismaClient, ArticleCategory } from "@prisma/client";

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
