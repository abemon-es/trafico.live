/**
 * Daily Fuel Price Report (v2)
 *
 * Runs on Monday (day 1) and Friday (day 5) only.
 *
 * Includes:
 * - National price table: diesel, gas95, gas98 vs yesterday vs 7 days ago
 * - Cheapest 5 provinces (diesel + gas95)
 * - Most expensive 5 provinces (diesel)
 * - Diesel-gasolina differential section
 * - Navigation links
 */

import { PrismaClient, ArticleCategory } from "@prisma/client";
import {
  attachTags,
  todaySlug,
  fmtPrice,
  fmtPct,
  getEditorialWeight,
  estimateReadTime,
  getProvinceNameMap,
  mdTable,
} from "./shared";

export async function generateDailyFuelReport(prisma: PrismaClient): Promise<number> {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, 5=Fri
  if (day !== 1 && day !== 5) return 0;

  const slug = `precios-combustible-${todaySlug()}`;
  const existing = await prisma.article.findUnique({ where: { slug } });
  if (existing) return 0;

  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const yesterdayUTC = new Date(todayUTC);
  yesterdayUTC.setUTCDate(yesterdayUTC.getUTCDate() - 1);
  const weekAgoUTC = new Date(todayUTC);
  weekAgoUTC.setUTCDate(weekAgoUTC.getUTCDate() - 7);

  // ── Queries ──────────────────────────────────────────────────────────────
  const [
    avgDiesel,
    avgGas95,
    avgGas98,
    yesterdayNational,
    weekAgoNational,
    yesterdayProvinceStats,
    weekAgoProvinceStats,
    provinceNameMap,
  ] = await Promise.all([
    prisma.gasStation.aggregate({
      _avg: { priceGasoleoA: true },
      where: { priceGasoleoA: { not: null } },
    }),
    prisma.gasStation.aggregate({
      _avg: { priceGasolina95E5: true },
      where: { priceGasolina95E5: { not: null } },
    }),
    prisma.gasStation.aggregate({
      _avg: { priceGasolina98E5: true },
      where: { priceGasolina98E5: { not: null } },
    }),
    prisma.fuelPriceDailyStats.findFirst({
      where: { date: yesterdayUTC, scope: "national" },
    }),
    prisma.fuelPriceDailyStats.findFirst({
      where: { date: weekAgoUTC, scope: "national" },
    }),
    prisma.fuelPriceDailyStats.findMany({
      where: {
        date: yesterdayUTC,
        scope: { startsWith: "province:" },
      },
      orderBy: { avgGasoleoA: "asc" },
    }),
    prisma.fuelPriceDailyStats.findMany({
      where: {
        date: weekAgoUTC,
        scope: { startsWith: "province:" },
      },
    }),
    getProvinceNameMap(prisma),
  ]);

  // ── Current national averages ─────────────────────────────────────────
  const dieselNow = avgDiesel._avg.priceGasoleoA ? Number(avgDiesel._avg.priceGasoleoA) : null;
  const gas95Now = avgGas95._avg.priceGasolina95E5
    ? Number(avgGas95._avg.priceGasolina95E5)
    : null;
  const gas98Now = avgGas98._avg.priceGasolina98E5
    ? Number(avgGas98._avg.priceGasolina98E5)
    : null;

  if (dieselNow == null && gas95Now == null) return 0;

  // ── Deltas helper ────────────────────────────────────────────────────────
  function pctDelta(current: number | null, reference: number | null | undefined): string {
    if (current == null || reference == null) return "N/D";
    return fmtPct(((current - reference) / reference) * 100);
  }

  const dieselYest = yesterdayNational?.avgGasoleoA
    ? Number(yesterdayNational.avgGasoleoA)
    : null;
  const gas95Yest = yesterdayNational?.avgGasolina95
    ? Number(yesterdayNational.avgGasolina95)
    : null;
  const gas98Yest = yesterdayNational?.avgGasolina98
    ? Number(yesterdayNational.avgGasolina98)
    : null;

  const diesel7d = weekAgoNational?.avgGasoleoA ? Number(weekAgoNational.avgGasoleoA) : null;
  const gas957d = weekAgoNational?.avgGasolina95 ? Number(weekAgoNational.avgGasolina95) : null;
  const gas987d = weekAgoNational?.avgGasolina98 ? Number(weekAgoNational.avgGasolina98) : null;

  // ── Province stats ───────────────────────────────────────────────────────
  // Build week-ago lookup by scope
  const weekAgoByScope = new Map(weekAgoProvinceStats.map((s) => [s.scope, s]));

  interface ProvStat {
    scope: string;
    code: string;
    name: string;
    avgDiesel: number | null;
    avgGas95: number | null;
    weekAgoDiesel: number | null;
  }

  const provStats: ProvStat[] = yesterdayProvinceStats
    .filter((s) => s.avgGasoleoA != null || s.avgGasolina95 != null)
    .map((s) => {
      const code = s.scope.replace("province:", "");
      const wa = weekAgoByScope.get(s.scope);
      return {
        scope: s.scope,
        code,
        name: provinceNameMap.get(code) ?? code,
        avgDiesel: s.avgGasoleoA ? Number(s.avgGasoleoA) : null,
        avgGas95: s.avgGasolina95 ? Number(s.avgGasolina95) : null,
        weekAgoDiesel: wa?.avgGasoleoA ? Number(wa.avgGasoleoA) : null,
      };
    });

  // Sorted by diesel
  const sortedByDiesel = [...provStats]
    .filter((p) => p.avgDiesel != null)
    .sort((a, b) => (a.avgDiesel ?? 99) - (b.avgDiesel ?? 99));

  const cheapestDiesel5 = sortedByDiesel.slice(0, 5);
  const mostExpensiveDiesel5 = [...sortedByDiesel].reverse().slice(0, 5);

  const sortedByGas95 = [...provStats]
    .filter((p) => p.avgGas95 != null)
    .sort((a, b) => (a.avgGas95 ?? 99) - (b.avgGas95 ?? 99));

  const cheapestGas95_5 = sortedByGas95.slice(0, 5);

  // ── Date string ──────────────────────────────────────────────────────────
  const dateStr = now.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const dayLabel = day === 1 ? "inicio de semana" : "cierre de semana";

  // ── Differential ─────────────────────────────────────────────────────────
  const differential =
    dieselNow != null && gas95Now != null ? gas95Now - dieselNow : null;

  // ── Build body ───────────────────────────────────────────────────────────
  const sections: string[] = [];

  sections.push(
    `## Precios de combustible — ${dateStr}\n\nResumen de ${dayLabel}: precios nacionales de carburantes según datos del MITERD.`
  );

  // National price table
  const nationalRows: string[][] = [];
  if (dieselNow != null) {
    nationalRows.push([
      "Gasóleo A",
      `**${fmtPrice(dieselNow)} €/L**`,
      pctDelta(dieselNow, dieselYest),
      pctDelta(dieselNow, diesel7d),
    ]);
  }
  if (gas95Now != null) {
    nationalRows.push([
      "Gasolina 95 E5",
      `**${fmtPrice(gas95Now)} €/L**`,
      pctDelta(gas95Now, gas95Yest),
      pctDelta(gas95Now, gas957d),
    ]);
  }
  if (gas98Now != null) {
    nationalRows.push([
      "Gasolina 98 E5",
      `**${fmtPrice(gas98Now)} €/L**`,
      pctDelta(gas98Now, gas98Yest),
      pctDelta(gas98Now, gas987d),
    ]);
  }

  if (nationalRows.length > 0) {
    sections.push(`### Precios medios nacionales

${mdTable(
  ["Combustible", "Precio", "vs ayer", "vs hace 7 días"],
  nationalRows,
  ["left", "right", "right", "right"]
)}`);
  }

  // Cheapest 5 provinces — diesel
  if (cheapestDiesel5.length > 0) {
    const rows = cheapestDiesel5.map((p, i) => [
      String(i + 1),
      p.name,
      fmtPrice(p.avgDiesel),
      pctDelta(p.avgDiesel, p.weekAgoDiesel),
    ]);
    sections.push(`### Provincias más baratas — Gasóleo A

${mdTable(
  ["#", "Provincia", "Precio (€/L)", "vs hace 7d"],
  rows,
  ["center", "left", "right", "right"]
)}`);
  }

  // Cheapest 5 provinces — gas95
  if (cheapestGas95_5.length > 0) {
    const rows = cheapestGas95_5.map((p, i) => {
      const wa = weekAgoByScope.get(p.scope);
      const waGas95 = wa?.avgGasolina95 ? Number(wa.avgGasolina95) : null;
      return [
        String(i + 1),
        p.name,
        fmtPrice(p.avgGas95),
        pctDelta(p.avgGas95, waGas95),
      ];
    });
    sections.push(`### Provincias más baratas — Gasolina 95

${mdTable(
  ["#", "Provincia", "Precio (€/L)", "vs hace 7d"],
  rows,
  ["center", "left", "right", "right"]
)}`);
  }

  // Most expensive 5 — diesel
  if (mostExpensiveDiesel5.length > 0) {
    const rows = mostExpensiveDiesel5.map((p, i) => [
      String(i + 1),
      p.name,
      fmtPrice(p.avgDiesel),
      pctDelta(p.avgDiesel, p.weekAgoDiesel),
    ]);
    sections.push(`### Provincias más caras — Gasóleo A

${mdTable(
  ["#", "Provincia", "Precio (€/L)", "vs hace 7d"],
  rows,
  ["center", "left", "right", "right"]
)}`);
  }

  // Differential section
  if (differential != null) {
    const diffLabel = differential > 0 ? "más caro" : "más barato";
    sections.push(`### Diferencial diésel-gasolina

La gasolina 95 es **${fmtPrice(Math.abs(differential))} €/L ${diffLabel}** que el gasóleo A a nivel nacional.

El diferencial entre ambos carburantes refleja la demanda relativa y las presiones fiscales sobre cada producto.`);
  }

  // Links
  sections.push(`### Dónde repostar

- [Gasolineras más baratas por provincia](/gasolineras/baratas)
- [Precios por provincia](/gasolineras/precios)
- [Ranking completo semanal](/noticias/precio-combustible)
- [Calculadora de coste de viaje](/calculadora)

---

*Fuente: MITERD (geoportalgasolineras.es). Precios en €/L con IVA incluido.*`);

  const body = sections.join("\n\n");

  const dayName = day === 1 ? "lunes" : "viernes";
  const title = `Precios combustible ${dayName} ${todaySlug()}: gasóleo ${fmtPrice(dieselNow)} €/L`;
  const summary = `Precios medios nacionales: Gasóleo A ${fmtPrice(dieselNow)} €/L${diesel7d != null && dieselNow != null ? ` (${fmtPct(((dieselNow - diesel7d) / diesel7d) * 100)} vs hace 7d)` : ""}, Gasolina 95 ${fmtPrice(gas95Now)} €/L. Ranking provincial completo por provincia.`;

  const category: ArticleCategory = "PRICE_ALERT";

  const article = await prisma.article.create({
    data: {
      slug,
      title,
      summary,
      body,
      category,
      source: "MITERD",
      sourceUrl: "https://geoportalgasolineras.es",
      isAutoGenerated: true,
      readTime: estimateReadTime(body.length),
      editorialWeight: getEditorialWeight(category),
    },
  });

  await attachTags(prisma, article.id, [
    { slug: "precio-combustible", name: "Precio combustible" },
    { slug: "diesel", name: "Diésel" },
    { slug: "gasolina", name: "Gasolina" },
    { slug: "ranking-provincial", name: "Ranking provincial" },
  ]);

  return 1;
}
