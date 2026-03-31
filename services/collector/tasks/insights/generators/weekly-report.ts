/**
 * Enhanced Weekly Traffic Summary (v2)
 *
 * Runs on Monday only (day 1).
 *
 * Queries DailyStats for this week and last week, aggregates:
 * - byProvince top 10
 * - byIncidentType across all days
 * - byHourOfDay across all days (to find peak hour)
 * - worst/best day of week
 * - total V16 activations
 * - Fuel prices + week-ago fuel
 *
 * Builds opinionated lead based on trend vs previous week.
 */

import { PrismaClient, ArticleCategory } from "@prisma/client";
import {
  attachTags,
  weekSlug,
  fmtPrice,
  fmtPct,
  fmtInt,
  getEditorialWeight,
  estimateReadTime,
  getProvinceNameMap,
  mdTable,
  INCIDENT_TYPE_NAMES,
} from "./shared";

export async function generateWeeklyReport(prisma: PrismaClient): Promise<number> {
  const now = new Date();
  if (now.getDay() !== 1) return 0;

  const slug = `informe-semanal-${weekSlug()}`;
  const existing = await prisma.article.findUnique({ where: { slug } });
  if (existing) return 0;

  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const weekAgoUTC = new Date(todayUTC);
  weekAgoUTC.setUTCDate(weekAgoUTC.getUTCDate() - 7);
  const twoWeeksAgoUTC = new Date(todayUTC);
  twoWeeksAgoUTC.setUTCDate(twoWeeksAgoUTC.getUTCDate() - 14);
  const yesterdayUTC = new Date(todayUTC);
  yesterdayUTC.setUTCDate(yesterdayUTC.getUTCDate() - 1);

  // ── Queries ──────────────────────────────────────────────────────────────
  const [
    thisWeekStats,
    lastWeekStats,
    avgDiesel,
    avgGas95,
    yesterdayFuel,
    weekAgoFuel,
    provinceNameMap,
  ] = await Promise.all([
    prisma.dailyStats.findMany({
      where: { dateStart: { gte: weekAgoUTC, lt: todayUTC } },
      orderBy: { dateStart: "asc" },
    }),
    prisma.dailyStats.findMany({
      where: { dateStart: { gte: twoWeeksAgoUTC, lt: weekAgoUTC } },
      orderBy: { dateStart: "asc" },
    }),
    prisma.gasStation.aggregate({
      _avg: { priceGasoleoA: true },
      where: { priceGasoleoA: { not: null } },
    }),
    prisma.gasStation.aggregate({
      _avg: { priceGasolina95E5: true },
      where: { priceGasolina95E5: { not: null } },
    }),
    prisma.fuelPriceDailyStats.findFirst({
      where: { date: yesterdayUTC, scope: "national" },
    }),
    prisma.fuelPriceDailyStats.findFirst({
      where: { date: weekAgoUTC, scope: "national" },
    }),
    getProvinceNameMap(prisma),
  ]);

  if (thisWeekStats.length === 0) return 0;

  // ── Aggregate this week ──────────────────────────────────────────────────
  const thisWeekTotal = thisWeekStats.reduce((s, d) => s + d.incidentTotal, 0);
  const lastWeekTotal = lastWeekStats.reduce((s, d) => s + d.incidentTotal, 0);
  const thisWeekV16Total = thisWeekStats.reduce((s, d) => s + d.v16Total, 0);

  // Aggregate byProvince across all days
  const provinceAgg: Record<string, number> = {};
  for (const day of thisWeekStats) {
    const bp = (day.byProvince ?? {}) as Record<string, number>;
    for (const [code, count] of Object.entries(bp)) {
      provinceAgg[code] = (provinceAgg[code] ?? 0) + count;
    }
  }

  // Aggregate byIncidentType across all days
  const typeAgg: Record<string, number> = {};
  for (const day of thisWeekStats) {
    const bt = (day.byIncidentType ?? {}) as Record<string, number>;
    for (const [type, count] of Object.entries(bt)) {
      typeAgg[type] = (typeAgg[type] ?? 0) + count;
    }
  }

  // Aggregate byHourOfDay across all days
  const hourAgg: Record<number, number> = {};
  for (const day of thisWeekStats) {
    const bh = (day.byHourOfDay ?? {}) as Record<string, number>;
    for (const [hour, count] of Object.entries(bh)) {
      const h = Number(hour);
      hourAgg[h] = (hourAgg[h] ?? 0) + count;
    }
  }

  // Peak hour
  const peakHourEntry = Object.entries(hourAgg).sort((a, b) => b[1] - a[1])[0];
  const peakHour = peakHourEntry ? Number(peakHourEntry[0]) : null;

  // Best / worst day
  type DayRecord = { dateStart: Date; incidentTotal: number };
  const worstDay = thisWeekStats.reduce<DayRecord | null>(
    (best, d) => (best == null || d.incidentTotal > best.incidentTotal ? d : best),
    null
  );
  const bestDay = thisWeekStats.reduce<DayRecord | null>(
    (best, d) => (best == null || d.incidentTotal < best.incidentTotal ? d : best),
    null
  );

  // ── Fuel ─────────────────────────────────────────────────────────────────
  const dieselNow = avgDiesel._avg.priceGasoleoA ? Number(avgDiesel._avg.priceGasoleoA) : null;
  const gas95Now = avgGas95._avg.priceGasolina95E5
    ? Number(avgGas95._avg.priceGasolina95E5)
    : null;

  const dieselWeekAgo = weekAgoFuel?.avgGasoleoA ? Number(weekAgoFuel.avgGasoleoA) : null;
  const gas95WeekAgo = weekAgoFuel?.avgGasolina95 ? Number(weekAgoFuel.avgGasolina95) : null;

  const dieselDelta =
    dieselNow != null && dieselWeekAgo != null
      ? ((dieselNow - dieselWeekAgo) / dieselWeekAgo) * 100
      : null;
  const gas95Delta =
    gas95Now != null && gas95WeekAgo != null
      ? ((gas95Now - gas95WeekAgo) / gas95WeekAgo) * 100
      : null;

  // ── Opinionated trend word ────────────────────────────────────────────────
  const weekLabel = weekSlug();
  let trendWord: string;
  let leadSentence: string;

  if (lastWeekTotal === 0) {
    trendWord = "activo";
    leadSentence = `Esta semana se han registrado **${fmtInt(thisWeekTotal)} incidencias** en las carreteras españolas.`;
  } else {
    const ratio = thisWeekTotal / lastWeekTotal;
    if (ratio >= 1.2) {
      trendWord = "intensa";
      leadSentence = `Semana **más intensa de lo habitual**: ${fmtInt(thisWeekTotal)} incidencias, un ${fmtPct(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100)} más que la semana anterior (${fmtInt(lastWeekTotal)}).`;
    } else if (ratio <= 0.8) {
      trendWord = "tranquila";
      leadSentence = `Semana **más tranquila de lo normal**: ${fmtInt(thisWeekTotal)} incidencias, un ${fmtPct(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100)} respecto a la semana anterior (${fmtInt(lastWeekTotal)}).`;
    } else if (ratio >= 1.05) {
      trendWord = "algo movida";
      leadSentence = `Semana **algo más movida**: ${fmtInt(thisWeekTotal)} incidencias frente a ${fmtInt(lastWeekTotal)} la semana pasada (${fmtPct(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100)}).`;
    } else if (ratio <= 0.95) {
      trendWord = "ligeramente mejor";
      leadSentence = `Semana **ligeramente mejor** que la anterior: ${fmtInt(thisWeekTotal)} incidencias frente a ${fmtInt(lastWeekTotal)} (${fmtPct(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100)}).`;
    } else {
      trendWord = "normal";
      leadSentence = `Semana **dentro de lo habitual**: ${fmtInt(thisWeekTotal)} incidencias, similar a las ${fmtInt(lastWeekTotal)} de la semana anterior.`;
    }
  }

  // ── Top 10 provinces ─────────────────────────────────────────────────────
  const topProvinces = Object.entries(provinceAgg)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([code, count]) => ({
      code,
      name: provinceNameMap.get(code) ?? code,
      count,
    }));

  // ── Type breakdown ────────────────────────────────────────────────────────
  const typeEntries = Object.entries(typeAgg)
    .sort((a, b) => b[1] - a[1])
    .filter(([, c]) => c > 0);
  const totalTyped = typeEntries.reduce((s, [, c]) => s + c, 0) || 1;

  // ── Build body ───────────────────────────────────────────────────────────
  const sections: string[] = [];

  sections.push(`## Informe semanal de tráfico — ${weekLabel}\n\n${leadSentence}`);

  // Key metrics
  const metrics: string[] = [
    `**${fmtInt(thisWeekTotal)}** incidencias totales esta semana`,
    `**${fmtInt(lastWeekTotal)}** incidencias la semana anterior`,
    `**${fmtInt(thisWeekV16Total)}** activaciones de balizas V16`,
  ];
  if (peakHour != null) {
    metrics.push(
      `Hora punta acumulada: **${String(peakHour).padStart(2, "0")}:00–${String(peakHour + 1).padStart(2, "0")}:00**`
    );
  }
  if (worstDay) {
    metrics.push(
      `Día más conflictivo: **${worstDay.dateStart.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" })}** (${fmtInt(worstDay.incidentTotal)} incidencias)`
    );
  }
  if (bestDay) {
    metrics.push(
      `Día más tranquilo: **${bestDay.dateStart.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" })}** (${fmtInt(bestDay.incidentTotal)} incidencias)`
    );
  }

  sections.push(`### Métricas clave

${metrics.map((m) => `- ${m}`).join("\n")}`);

  // Type breakdown table
  if (typeEntries.length > 0) {
    const typeRows = typeEntries.map(([type, count]) => [
      INCIDENT_TYPE_NAMES[type] ?? type,
      fmtInt(count),
      fmtPct((count / totalTyped) * 100).replace("+", ""),
    ]);
    sections.push(`### Desglose por tipo de incidencia

${mdTable(
  ["Tipo", "Total", "% del total"],
  typeRows,
  ["left", "right", "right"]
)}`);
  }

  // Top 10 provinces
  if (topProvinces.length > 0) {
    const provRows = topProvinces.map(({ name, count }, i) => [
      String(i + 1),
      name,
      fmtInt(count),
    ]);
    sections.push(`### Top 10 provincias por incidencias

${mdTable(
  ["#", "Provincia", "Incidencias"],
  provRows,
  ["center", "left", "right"]
)}`);
  }

  // Fuel prices
  const fuelRows: string[][] = [];
  if (dieselNow != null) {
    fuelRows.push([
      "Gasóleo A",
      `**${fmtPrice(dieselNow)} €/L**`,
      dieselDelta != null ? fmtPct(dieselDelta) : "N/D",
    ]);
  }
  if (gas95Now != null) {
    fuelRows.push([
      "Gasolina 95 E5",
      `**${fmtPrice(gas95Now)} €/L**`,
      gas95Delta != null ? fmtPct(gas95Delta) : "N/D",
    ]);
  }

  if (fuelRows.length > 0) {
    sections.push(`### Precios de combustible

${mdTable(
  ["Combustible", "Precio actual", "vs hace 7 días"],
  fuelRows,
  ["left", "right", "right"]
)}

Consulta las [gasolineras más baratas](/gasolineras/baratas) o los [precios por provincia](/gasolineras/precios).`);
  }

  // Links
  sections.push(`### Más información

- [Mapa de incidencias en tiempo real](/incidencias)
- [Atascos activos](/atascos)
- [Evolución de precios](/gasolineras/precios)
- [Gasolineras baratas](/gasolineras/baratas)
- [Radares DGT](/radares)
- [Balizas V16 activas](/balizas-v16)

---

*Datos: DGT, MITERD, AEMET.*`);

  const body = sections.join("\n\n");

  const title = `Informe semanal de tráfico — ${weekLabel}: semana ${trendWord}`;
  const summary = `Resumen ${weekLabel}: ${fmtInt(thisWeekTotal)} incidencias${lastWeekTotal > 0 ? ` (${fmtPct(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100)} vs semana anterior)` : ""}. Diésel: ${fmtPrice(dieselNow)} €/L. Gasolina 95: ${fmtPrice(gas95Now)} €/L.`;

  const category: ArticleCategory = "WEEKLY_REPORT";

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
    { slug: "informe-semanal", name: "Informe semanal" },
    { slug: "estadisticas", name: "Estadísticas" },
    { slug: "dgt", name: "DGT" },
    { slug: "precio-combustible", name: "Precio combustible" },
  ]);

  return 1;
}
