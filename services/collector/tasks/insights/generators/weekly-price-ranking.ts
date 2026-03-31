/**
 * Weekly Province Price Ranking (v2)
 *
 * Runs on Friday only (day 5).
 *
 * Builds:
 * - Cheapest 10 provinces by avgGasoleoA
 * - Most expensive 10 provinces by avgGasoleoA
 * - Full 52-province ranking table
 * - Biggest movers (vs week ago)
 */

import { PrismaClient, ArticleCategory } from "@prisma/client";
import {
  attachTags,
  weekSlug,
  fmtPrice,
  fmtPct,
  getEditorialWeight,
  estimateReadTime,
  getProvinceNameMap,
  mdTable,
} from "./shared";

export async function generateWeeklyPriceRanking(prisma: PrismaClient): Promise<number> {
  const now = new Date();
  if (now.getDay() !== 5) return 0;

  const slug = `ranking-precios-${weekSlug()}`;
  const existing = await prisma.article.findUnique({ where: { slug } });
  if (existing) return 0;

  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const yesterdayUTC = new Date(todayUTC);
  yesterdayUTC.setUTCDate(yesterdayUTC.getUTCDate() - 1);
  const weekAgoUTC = new Date(todayUTC);
  weekAgoUTC.setUTCDate(weekAgoUTC.getUTCDate() - 7);

  // ── Queries ──────────────────────────────────────────────────────────────
  const [yesterdayStats, weekAgoStats, provinceNameMap] = await Promise.all([
    prisma.fuelPriceDailyStats.findMany({
      where: {
        date: yesterdayUTC,
        scope: { startsWith: "province:" },
      },
    }),
    prisma.fuelPriceDailyStats.findMany({
      where: {
        date: weekAgoUTC,
        scope: { startsWith: "province:" },
      },
    }),
    getProvinceNameMap(prisma),
  ]);

  if (yesterdayStats.length === 0) return 0;

  // ── Build week-ago lookup ────────────────────────────────────────────────
  const weekAgoByScope = new Map(weekAgoStats.map((s) => [s.scope, s]));

  // ── Build ranked list ────────────────────────────────────────────────────
  interface RankedProvince {
    scope: string;
    code: string;
    name: string;
    avgDiesel: number | null;
    avgGas95: number | null;
    weekAgoDiesel: number | null;
    dieselDelta: number | null;
  }

  const ranked: RankedProvince[] = yesterdayStats
    .map((s) => {
      const code = s.scope.replace("province:", "");
      const wa = weekAgoByScope.get(s.scope);
      const avgDiesel = s.avgGasoleoA ? Number(s.avgGasoleoA) : null;
      const weekAgoDiesel = wa?.avgGasoleoA ? Number(wa.avgGasoleoA) : null;
      const dieselDelta =
        avgDiesel != null && weekAgoDiesel != null
          ? ((avgDiesel - weekAgoDiesel) / weekAgoDiesel) * 100
          : null;
      return {
        scope: s.scope,
        code,
        name: provinceNameMap.get(code) ?? code,
        avgDiesel,
        avgGas95: s.avgGasolina95 ? Number(s.avgGasolina95) : null,
        weekAgoDiesel,
        dieselDelta,
      };
    })
    .filter((p) => p.avgDiesel != null)
    .sort((a, b) => (a.avgDiesel ?? 99) - (b.avgDiesel ?? 99));

  if (ranked.length === 0) return 0;

  // ── Rankings ─────────────────────────────────────────────────────────────
  const cheapest10 = ranked.slice(0, 10);
  const mostExpensive10 = [...ranked].reverse().slice(0, 10);

  // Biggest movers (absolute change)
  const withDelta = ranked.filter((p) => p.dieselDelta != null);
  const biggestFallers = [...withDelta]
    .sort((a, b) => (a.dieselDelta ?? 0) - (b.dieselDelta ?? 0))
    .slice(0, 5);
  const biggestRisers = [...withDelta]
    .sort((a, b) => (b.dieselDelta ?? 0) - (a.dieselDelta ?? 0))
    .slice(0, 5)
    .filter((p) => (p.dieselDelta ?? 0) > 0);

  // ── National averages from the data ──────────────────────────────────────
  const dieselPrices = ranked.filter((p) => p.avgDiesel != null).map((p) => p.avgDiesel!);
  const nationalAvgDiesel =
    dieselPrices.length > 0
      ? dieselPrices.reduce((s, v) => s + v, 0) / dieselPrices.length
      : null;

  const gas95Prices = ranked.filter((p) => p.avgGas95 != null).map((p) => p.avgGas95!);
  const nationalAvgGas95 =
    gas95Prices.length > 0
      ? gas95Prices.reduce((s, v) => s + v, 0) / gas95Prices.length
      : null;

  // ── Date string ──────────────────────────────────────────────────────────
  const week = weekSlug();
  const dateStr = now.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // ── Build body ───────────────────────────────────────────────────────────
  const sections: string[] = [];

  sections.push(
    `## Ranking de precios de combustible por provincia — ${week}\n\nComparativa del precio medio del **Gasóleo A** en las ${ranked.length} provincias españolas. Media nacional: **${fmtPrice(nationalAvgDiesel)} €/L** (gasóleo), **${fmtPrice(nationalAvgGas95)} €/L** (gasolina 95).`
  );

  // Cheapest 10
  if (cheapest10.length > 0) {
    const rows = cheapest10.map((p, i) => [
      String(i + 1),
      p.name,
      fmtPrice(p.avgDiesel),
      fmtPrice(p.avgGas95),
      p.dieselDelta != null ? fmtPct(p.dieselDelta) : "N/D",
    ]);
    sections.push(`### Las 10 provincias más baratas — Gasóleo A

${mdTable(
  ["#", "Provincia", "Gasóleo A (€/L)", "Gasolina 95 (€/L)", "Variación 7d"],
  rows,
  ["center", "left", "right", "right", "right"]
)}`);
  }

  // Most expensive 10
  if (mostExpensive10.length > 0) {
    const rows = mostExpensive10.map((p, i) => [
      String(i + 1),
      p.name,
      fmtPrice(p.avgDiesel),
      fmtPrice(p.avgGas95),
      p.dieselDelta != null ? fmtPct(p.dieselDelta) : "N/D",
    ]);
    sections.push(`### Las 10 provincias más caras — Gasóleo A

${mdTable(
  ["#", "Provincia", "Gasóleo A (€/L)", "Gasolina 95 (€/L)", "Variación 7d"],
  rows,
  ["center", "left", "right", "right", "right"]
)}`);
  }

  // Full ranking (all provinces)
  if (ranked.length > 0) {
    const fullRows = ranked.map((p, i) => {
      const vsDelta = p.dieselDelta != null ? fmtPct(p.dieselDelta) : "N/D";
      return [String(i + 1), p.name, fmtPrice(p.avgDiesel), fmtPrice(p.avgGas95), vsDelta];
    });
    sections.push(`### Ranking completo — ${ranked.length} provincias

${mdTable(
  ["#", "Provincia", "Gasóleo A (€/L)", "Gasolina 95 (€/L)", "Variación 7d"],
  fullRows,
  ["center", "left", "right", "right", "right"]
)}`);
  }

  // Biggest movers
  const moverSections: string[] = [];
  if (biggestFallers.length > 0 && biggestFallers[0].dieselDelta != null && biggestFallers[0].dieselDelta < -0.05) {
    const fallerRows = biggestFallers
      .filter((p) => (p.dieselDelta ?? 0) < 0)
      .map((p) => [p.name, fmtPrice(p.avgDiesel), fmtPct(p.dieselDelta!)]);
    if (fallerRows.length > 0) {
      moverSections.push(
        `**Mayores bajadas:**\n\n${mdTable(
          ["Provincia", "Precio actual", "Variación"],
          fallerRows,
          ["left", "right", "right"]
        )}`
      );
    }
  }
  if (biggestRisers.length > 0) {
    const riserRows = biggestRisers.map((p) => [
      p.name,
      fmtPrice(p.avgDiesel),
      fmtPct(p.dieselDelta!),
    ]);
    moverSections.push(
      `**Mayores subidas:**\n\n${mdTable(
        ["Provincia", "Precio actual", "Variación"],
        riserRows,
        ["left", "right", "right"]
      )}`
    );
  }

  if (moverSections.length > 0) {
    sections.push(`### Mayores variaciones semanales\n\n${moverSections.join("\n\n")}`);
  }

  // Links
  sections.push(`### Encuentra las mejores gasolineras

- [Gasolineras más baratas en España](/gasolineras/baratas)
- [Precios por provincia](/gasolineras/precios)
- [Comparar precios por carretera](/gasolineras)
- [Calculadora de coste de viaje](/calculadora)

---

*Fuente: MITERD (geoportalgasolineras.es). Precios medios provinciales con IVA incluido. Datos del ${dateStr}.*`);

  const body = sections.join("\n\n");

  const cheapestProv = cheapest10[0];
  const mostExpProv = mostExpensive10[0];

  const title = `Ranking precios combustible por provincia — ${week}`;
  const summary = `Ranking semanal de precios: provincia más barata ${cheapestProv?.name ?? "N/D"} (${fmtPrice(cheapestProv?.avgDiesel)} €/L), más cara ${mostExpProv?.name ?? "N/D"} (${fmtPrice(mostExpProv?.avgDiesel)} €/L). Media nacional: ${fmtPrice(nationalAvgDiesel)} €/L.`;

  const category: ArticleCategory = "FUEL_TREND";

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
    { slug: "ranking-provincial", name: "Ranking provincial" },
    { slug: "diesel", name: "Diésel" },
    { slug: "tendencia", name: "Tendencia" },
  ]);

  return 1;
}
