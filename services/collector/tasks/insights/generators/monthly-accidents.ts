/**
 * Monthly Accident / Incident Report Generator
 *
 * Runs on day 1 of every month. Creates a MONTHLY_REPORT for the
 * previous calendar month using DailyStats data:
 * - Incident totals vs previous month and same month last year
 * - Type breakdown table
 * - Top 10 provinces table
 * - Peak hour analysis (aggregated across all days in the month)
 *
 * Slug: siniestralidad-{previousMonthSlug}
 * e.g.: siniestralidad-2026-02
 */

import { PrismaClient, ArticleCategory } from "@prisma/client";
import {
  attachTags,
  fmtPct,
  fmtInt,
  getEditorialWeight,
  estimateReadTime,
  getProvinceNameMap,
  mdTable,
  INCIDENT_TYPE_NAMES,
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

export async function generateMonthlyAccidentReport(prisma: PrismaClient): Promise<number> {
  const now = new Date();
  // Only runs on day 1
  if (now.getDate() !== 1) return 0;

  const slug = `siniestralidad-${prevMonthSlug(now)}`;
  const existing = await prisma.article.findUnique({ where: { slug } });
  if (existing) return 0;

  // ── Date boundaries ───────────────────────────────────────────────────────
  // Previous month
  const prevMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const prevMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  // Month before that
  const twoMonthsAgoStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1));
  const twoMonthsAgoEnd = prevMonthStart;

  // Same month last year
  const sameMonthLastYearStart = new Date(
    Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth() - 1, 1)
  );
  const sameMonthLastYearEnd = new Date(
    Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), 1)
  );

  const prevYear = prevMonthStart.getUTCFullYear();
  const prevMonth = prevMonthStart.getUTCMonth() + 1;

  // ── Queries ───────────────────────────────────────────────────────────────
  const [prevMonthStats, prevPrevStats, sameMonthLastYearStats, provinceNameMap] =
    await Promise.all([
      prisma.dailyStats.findMany({
        where: { dateStart: { gte: prevMonthStart, lt: prevMonthEnd } },
        orderBy: { dateStart: "asc" },
      }),
      prisma.dailyStats.findMany({
        where: { dateStart: { gte: twoMonthsAgoStart, lt: twoMonthsAgoEnd } },
        select: { incidentTotal: true },
      }),
      prisma.dailyStats.findMany({
        where: { dateStart: { gte: sameMonthLastYearStart, lt: sameMonthLastYearEnd } },
        select: { incidentTotal: true },
      }),
      getProvinceNameMap(prisma),
    ]);

  if (prevMonthStats.length === 0) return 0;

  // ── Aggregations ──────────────────────────────────────────────────────────
  const totalIncidents = prevMonthStats.reduce((s, d) => s + d.incidentTotal, 0);
  const avgPerDay = totalIncidents / prevMonthStats.length;

  const prevPrevTotal = prevPrevStats.reduce((s, d) => s + d.incidentTotal, 0);
  const sameLastYearTotal = sameMonthLastYearStats.reduce((s, d) => s + d.incidentTotal, 0);

  const vsPrevMonth =
    prevPrevTotal > 0 ? ((totalIncidents - prevPrevTotal) / prevPrevTotal) * 100 : null;
  const vsLastYear =
    sameLastYearTotal > 0
      ? ((totalIncidents - sameLastYearTotal) / sameLastYearTotal) * 100
      : null;

  // Peak day
  const peakDay = prevMonthStats.reduce((best, d) =>
    d.incidentTotal > best.incidentTotal ? d : best
  );

  // Aggregate byProvince
  const provinceAgg: Record<string, number> = {};
  for (const day of prevMonthStats) {
    const bp = (day.byProvince ?? {}) as Record<string, number>;
    for (const [code, count] of Object.entries(bp)) {
      provinceAgg[code] = (provinceAgg[code] ?? 0) + count;
    }
  }

  // Aggregate byIncidentType
  const typeAgg: Record<string, number> = {};
  for (const day of prevMonthStats) {
    const bt = (day.byIncidentType ?? {}) as Record<string, number>;
    for (const [type, count] of Object.entries(bt)) {
      typeAgg[type] = (typeAgg[type] ?? 0) + count;
    }
  }

  // Aggregate byHourOfDay
  const hourAgg: Record<number, number> = {};
  for (const day of prevMonthStats) {
    const bh = (day.byHourOfDay ?? {}) as Record<string, number>;
    for (const [hour, count] of Object.entries(bh)) {
      const h = Number(hour);
      hourAgg[h] = (hourAgg[h] ?? 0) + count;
    }
  }

  // Peak hour
  const peakHourEntry = Object.entries(hourAgg).sort((a, b) => b[1] - a[1])[0];
  const peakHour = peakHourEntry ? Number(peakHourEntry[0]) : null;

  // Top 10 provinces
  const topProvinces = Object.entries(provinceAgg)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([code, count]) => ({
      name: provinceNameMap.get(code) ?? code,
      count,
    }));

  // Type breakdown
  const typeEntries = Object.entries(typeAgg)
    .sort((a, b) => b[1] - a[1])
    .filter(([, c]) => c > 0);
  const totalTyped = typeEntries.reduce((s, [, c]) => s + c, 0) || 1;

  // ── Opinionated lead ──────────────────────────────────────────────────────
  let adjective: string;
  if (vsPrevMonth !== null && vsPrevMonth >= 15) adjective = "especialmente conflictivo";
  else if (vsPrevMonth !== null && vsPrevMonth >= 5) adjective = "algo más accidentado de lo habitual";
  else if (vsPrevMonth !== null && vsPrevMonth <= -15) adjective = "tranquilo en términos de siniestralidad";
  else if (vsPrevMonth !== null && vsPrevMonth <= -5) adjective = "ligeramente más tranquilo de lo habitual";
  else adjective = "dentro de lo normal";

  const label = monthLabel(prevYear, prevMonth);
  const labelCap = label.charAt(0).toUpperCase() + label.slice(1);

  // ── Tables ────────────────────────────────────────────────────────────────
  const typeRows = typeEntries.map(([type, count]) => [
    INCIDENT_TYPE_NAMES[type] ?? type,
    fmtInt(count),
    fmtPct((count / totalTyped) * 100).replace("+", ""),
  ]);

  const provinceRows = topProvinces.map(({ name, count }, i) => [
    String(i + 1),
    name,
    fmtInt(count),
  ]);

  // ── Build body ────────────────────────────────────────────────────────────
  const sections: string[] = [];

  sections.push(
    `## Siniestralidad en carretera — ${labelCap}\n\n` +
    `${labelCap} fue un mes **${adjective}** en las carreteras españolas, ` +
    `con un total de **${fmtInt(totalIncidents)} incidencias** registradas ` +
    `(media de ${avgPerDay.toFixed(1)} incidencias/día).`
  );

  // Key metrics
  const metrics: string[] = [
    `**${fmtInt(totalIncidents)}** incidencias totales en el mes`,
    `Media diaria: **${avgPerDay.toFixed(1)}** incidencias/día`,
  ];
  if (vsPrevMonth !== null) {
    metrics.push(
      `Vs mes anterior: **${fmtPct(vsPrevMonth)}** (${fmtInt(prevPrevTotal)} incidencias en ${monthLabel(prevMonthStart.getUTCFullYear(), prevMonthStart.getUTCMonth())})`
    );
  }
  if (vsLastYear !== null) {
    metrics.push(
      `Vs mismo mes año anterior: **${fmtPct(vsLastYear)}** (${fmtInt(sameLastYearTotal)} incidencias)`
    );
  }
  metrics.push(
    `Día punta: **${peakDay.dateStart.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })}** con ${fmtInt(peakDay.incidentTotal)} incidencias`
  );

  sections.push(`### Métricas clave\n\n${metrics.map((m) => `- ${m}`).join("\n")}`);

  // Type breakdown
  if (typeRows.length > 0) {
    sections.push(
      `### Desglose por tipo de incidencia\n\n` +
      mdTable(
        ["Tipo", "Total", "% del total"],
        typeRows,
        ["left", "right", "right"]
      )
    );
  }

  // Top provinces
  if (provinceRows.length > 0) {
    sections.push(
      `### Top 10 provincias por incidencias\n\n` +
      mdTable(
        ["#", "Provincia", "Incidencias"],
        provinceRows,
        ["center", "left", "right"]
      )
    );
  }

  // Peak hour
  if (peakHour !== null) {
    const hourStr = `${String(peakHour).padStart(2, "0")}:00–${String(peakHour + 1).padStart(2, "0")}:00`;
    sections.push(
      `### Análisis de hora punta\n\n` +
      `La franja horaria con mayor concentración de incidencias durante ${label} fue ` +
      `la de **${hourStr}**, acumulando ${fmtInt(hourAgg[peakHour] ?? 0)} incidencias en el mes.`
    );
  }

  // Links
  sections.push(
    `### Más información\n\n` +
    `- [Mapa de incidencias en tiempo real](/incidencias)\n` +
    `- [Estadísticas de tráfico](/estadisticas)\n` +
    `- [Atascos activos](/atascos)\n` +
    `- [Alertas meteorológicas](/alertas-meteo)\n\n` +
    `---\n\n*Fuente: DGT. Datos elaborados a partir de incidencias registradas durante ${label}.*`
  );

  const body = sections.join("\n\n");

  const title = `Siniestralidad en carretera — ${labelCap}: ${fmtInt(totalIncidents)} incidencias`;
  const summary =
    `Informe mensual de siniestralidad en España — ${labelCap}. ` +
    `${fmtInt(totalIncidents)} incidencias (${vsPrevMonth !== null ? fmtPct(vsPrevMonth) + " vs mes anterior" : "sin comparativa previa"}). ` +
    `Media: ${avgPerDay.toFixed(1)} incidencias/día.`;

  const category: ArticleCategory = "MONTHLY_REPORT";

  const article = await prisma.article.create({
    data: {
      slug,
      title,
      summary,
      body,
      category,
      source: "trafico.live",
      isAutoGenerated: true,
      readTime: estimateReadTime(body.length),
      editorialWeight: getEditorialWeight(category),
    },
  });

  await attachTags(prisma, article.id, [
    { slug: "siniestralidad", name: "Siniestralidad" },
    { slug: "informe-mensual", name: "Informe mensual" },
    { slug: "estadisticas", name: "Estadísticas" },
  ]);

  return 1;
}
