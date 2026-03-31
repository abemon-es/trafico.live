/**
 * Monthly Fuel Price Report Generator
 *
 * Runs on day 1 of every month. Creates a MONTHLY_REPORT for the
 * previous calendar month's fuel price evolution:
 * - National evolution (gasóleo A + gasolina 95) with weekly snapshots
 * - Cheapest / most expensive 5 provinces (diesel + gasolina 95)
 *
 * Slug: combustible-mensual-{previousMonthSlug}
 * e.g.: combustible-mensual-2026-02
 */

import { PrismaClient, ArticleCategory } from "@prisma/client";
import {
  attachTags,
  fmtPrice,
  fmtPct,
  getEditorialWeight,
  estimateReadTime,
  getProvinceNameMap,
  mdTable,
} from "./shared";

function prevMonthSlug(now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(year: number, month: number): string {
  const NAMES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  return `${NAMES[month - 1] ?? String(month)} de ${year}`;
}

export async function generateMonthlyFuelReport(prisma: PrismaClient): Promise<number> {
  const now = new Date();
  // Only runs on day 1
  if (now.getDate() !== 1) return 0;

  const slug = `combustible-mensual-${prevMonthSlug(now)}`;
  const existing = await prisma.article.findUnique({ where: { slug } });
  if (existing) return 0;

  // ── Date boundaries ───────────────────────────────────────────────────────
  const prevMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const prevMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  // Last day of previous month (= day before prevMonthEnd)
  const lastDayOfPrevMonth = new Date(prevMonthEnd);
  lastDayOfPrevMonth.setUTCDate(lastDayOfPrevMonth.getUTCDate() - 1);

  const prevYear = prevMonthStart.getUTCFullYear();
  const prevMonth = prevMonthStart.getUTCMonth() + 1;

  // ── Queries ───────────────────────────────────────────────────────────────
  const [nationalStats, provinceStatsLastDay, provinceNameMap] = await Promise.all([
    // Full month national evolution ordered by date
    prisma.fuelPriceDailyStats.findMany({
      where: {
        scope: "national",
        date: { gte: prevMonthStart, lt: prevMonthEnd },
      },
      orderBy: { date: "asc" },
    }),
    // Province stats for the last available day (for cheapest/most expensive)
    prisma.fuelPriceDailyStats.findMany({
      where: {
        date: lastDayOfPrevMonth,
        scope: { startsWith: "province:" },
      },
    }),
    getProvinceNameMap(prisma),
  ]);

  if (nationalStats.length === 0) return 0;

  // ── National trend ────────────────────────────────────────────────────────
  const firstPoint = nationalStats[0];
  const lastPoint = nationalStats[nationalStats.length - 1];

  const dieselStart = firstPoint.avgGasoleoA ? Number(firstPoint.avgGasoleoA) : null;
  const dieselEnd = lastPoint.avgGasoleoA ? Number(lastPoint.avgGasoleoA) : null;
  const gas95Start = firstPoint.avgGasolina95 ? Number(firstPoint.avgGasolina95) : null;
  const gas95End = lastPoint.avgGasolina95 ? Number(lastPoint.avgGasolina95) : null;

  const dieselChange =
    dieselStart != null && dieselEnd != null && dieselStart > 0
      ? ((dieselEnd - dieselStart) / dieselStart) * 100
      : null;
  const gas95Change =
    gas95Start != null && gas95End != null && gas95Start > 0
      ? ((gas95End - gas95Start) / gas95Start) * 100
      : null;

  // ── Weekly snapshot table (pick last data point of each ISO week) ─────────
  // Group by ISO week, take the last record per week
  const weekMap = new Map<string, typeof nationalStats[0]>();
  for (const row of nationalStats) {
    const d = row.date;
    const day = d.getUTCDay();
    // ISO week: ends on Sunday; use the date itself to build a stable key
    // We keep the last entry seen per week (dates are sorted asc)
    const weekKey = `${d.getUTCFullYear()}-W${String(
      Math.ceil(
        ((d.getTime() - new Date(Date.UTC(d.getUTCFullYear(), 0, 1)).getTime()) / 86400000 +
          new Date(Date.UTC(d.getUTCFullYear(), 0, 1)).getUTCDay() +
          1) /
          7
      )
    ).padStart(2, "0")}`;
    weekMap.set(weekKey, row);
  }

  const weeklySnapshots = Array.from(weekMap.values());

  const evolutionRows = weeklySnapshots.map((row) => {
    const dateStr = row.date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    });
    return [
      dateStr,
      row.avgGasoleoA != null ? `**${fmtPrice(Number(row.avgGasoleoA))}**` : "N/D",
      row.avgGasolina95 != null ? `**${fmtPrice(Number(row.avgGasolina95))}**` : "N/D",
      row.avgGasolina98 != null ? fmtPrice(Number(row.avgGasolina98)) : "N/D",
      row.stationCount != null ? String(row.stationCount) : "N/D",
    ];
  });

  // ── Province rankings ─────────────────────────────────────────────────────
  interface ProvStat {
    code: string;
    name: string;
    diesel: number | null;
    gas95: number | null;
  }

  const provStats: ProvStat[] = provinceStatsLastDay
    .map((s) => {
      const code = s.scope.replace("province:", "");
      return {
        code,
        name: provinceNameMap.get(code) ?? code,
        diesel: s.avgGasoleoA != null ? Number(s.avgGasoleoA) : null,
        gas95: s.avgGasolina95 != null ? Number(s.avgGasolina95) : null,
      };
    })
    .filter((p) => p.diesel != null || p.gas95 != null);

  const byDiesel = [...provStats]
    .filter((p) => p.diesel != null)
    .sort((a, b) => (a.diesel ?? 99) - (b.diesel ?? 99));

  const cheapestDiesel5 = byDiesel.slice(0, 5);
  const mostExpensiveDiesel5 = [...byDiesel].reverse().slice(0, 5);

  const byGas95 = [...provStats]
    .filter((p) => p.gas95 != null)
    .sort((a, b) => (a.gas95 ?? 99) - (b.gas95 ?? 99));

  const cheapestGas95_5 = byGas95.slice(0, 5);

  // ── Opinionated lead ──────────────────────────────────────────────────────
  const label = monthLabel(prevYear, prevMonth);
  const labelCap = label.charAt(0).toUpperCase() + label.slice(1);

  let dieselVerb: string;
  let dieselChangeStr: string;
  if (dieselChange === null) {
    dieselVerb = "cerró";
    dieselChangeStr = "sin variación disponible";
  } else if (Math.abs(dieselChange) < 0.05) {
    dieselVerb = "cerró";
    dieselChangeStr = `prácticamente sin variación (${fmtPct(dieselChange)})`;
  } else {
    dieselVerb = dieselChange > 0 ? "cerró" : "cerró";
    dieselChangeStr = `un **${fmtPct(Math.abs(dieselChange))} ${dieselChange > 0 ? "más caro" : "más barato"}** que al inicio del mes`;
  }

  // ── Build body ────────────────────────────────────────────────────────────
  const sections: string[] = [];

  sections.push(
    `## Precios de combustible — ${labelCap}\n\n` +
    `El **gasóleo A** ${dieselVerb} el mes de ${label} a **${fmtPrice(dieselEnd)} €/L**, ` +
    `${dieselChangeStr} (inicio del mes: ${fmtPrice(dieselStart)} €/L).` +
    (gas95End != null && gas95Change !== null
      ? ` La **gasolina 95** cerró en **${fmtPrice(gas95End)} €/L** (${fmtPct(gas95Change)} vs inicio de mes).`
      : "")
  );

  // Evolution table
  if (evolutionRows.length > 0) {
    sections.push(
      `### Evolución mensual de precios\n\n` +
      mdTable(
        ["Fecha", "Gasóleo A (€/L)", "Gasolina 95 (€/L)", "Gasolina 98 (€/L)", "Estaciones"],
        evolutionRows,
        ["left", "right", "right", "right", "right"]
      )
    );
  }

  // Cheapest provinces — diesel
  if (cheapestDiesel5.length > 0) {
    const rows = cheapestDiesel5.map((p, i) => [
      String(i + 1),
      p.name,
      `**${fmtPrice(p.diesel)} €/L**`,
    ]);
    sections.push(
      `### 5 provincias más baratas — Gasóleo A\n\n` +
      mdTable(
        ["#", "Provincia", "Precio medio (€/L)"],
        rows,
        ["center", "left", "right"]
      )
    );
  }

  // Most expensive provinces — diesel
  if (mostExpensiveDiesel5.length > 0) {
    const rows = mostExpensiveDiesel5.map((p, i) => [
      String(i + 1),
      p.name,
      `**${fmtPrice(p.diesel)} €/L**`,
    ]);
    sections.push(
      `### 5 provincias más caras — Gasóleo A\n\n` +
      mdTable(
        ["#", "Provincia", "Precio medio (€/L)"],
        rows,
        ["center", "left", "right"]
      )
    );
  }

  // Cheapest provinces — gasolina 95
  if (cheapestGas95_5.length > 0) {
    const rows = cheapestGas95_5.map((p, i) => [
      String(i + 1),
      p.name,
      `**${fmtPrice(p.gas95)} €/L**`,
    ]);
    sections.push(
      `### 5 provincias más baratas — Gasolina 95\n\n` +
      mdTable(
        ["#", "Provincia", "Precio medio (€/L)"],
        rows,
        ["center", "left", "right"]
      )
    );
  }

  // Links
  sections.push(
    `### Más información\n\n` +
    `- [Gasolineras más baratas en España](/gasolineras/baratas)\n` +
    `- [Precios por provincia](/gasolineras/precios)\n` +
    `- [Ranking semanal de precios](/noticias/precio-combustible)\n` +
    `- [Calculadora de coste de viaje](/calculadora)\n\n` +
    `---\n\n*Fuente: MITERD (geoportalgasolineras.es). Precios medios nacionales y provinciales con IVA incluido. Datos de ${label}.*`
  );

  const body = sections.join("\n\n");

  const title =
    `Precios de combustible — ${labelCap}: gasóleo ${fmtPrice(dieselEnd)} €/L` +
    (gas95End != null ? `, gasolina 95 ${fmtPrice(gas95End)} €/L` : "");

  const summary =
    `Informe mensual de precios de combustible — ${labelCap}. ` +
    `Gasóleo A: ${fmtPrice(dieselStart)} → ${fmtPrice(dieselEnd)} €/L ` +
    (dieselChange !== null ? `(${fmtPct(dieselChange)})` : "") +
    (gas95End != null ? `. Gasolina 95: ${fmtPrice(gas95End)} €/L.` : ".") +
    (cheapestDiesel5[0] != null
      ? ` Provincia más barata: ${cheapestDiesel5[0].name} (${fmtPrice(cheapestDiesel5[0].diesel)} €/L).`
      : "");

  const category: ArticleCategory = "MONTHLY_REPORT";

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
    { slug: "informe-mensual", name: "Informe mensual" },
    { slug: "diesel", name: "Diésel" },
    { slug: "gasolina", name: "Gasolina" },
  ]);

  return 1;
}
