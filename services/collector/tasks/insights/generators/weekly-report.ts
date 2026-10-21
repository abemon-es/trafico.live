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
  nationalFuel,
  incidentCounts,
  num,
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

  // ── Queries ──────────────────────────────────────────────────────────────
  // Counted from TrafficIncident (one row per source situation) and
  // V16BeaconEvent (one row per activation) over closed days. DailyStats sums
  // hourly snapshots of the active set: «593.436 incidencias» a week were
  // incident-hours, and «activaciones de balizas» beacon-hours.
  const days = Array.from({ length: 7 }, (_, i) => {
    const start = new Date(weekAgoUTC);
    start.setUTCDate(start.getUTCDate() + i);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end };
  });
  const [week, lastWeekTotal, thisWeekV16Total, perDay, fuel, provinceNameMap] = await Promise.all([
    incidentCounts(prisma, weekAgoUTC, todayUTC),
    prisma.trafficIncident.count({ where: { startedAt: { gte: twoWeeksAgoUTC, lt: weekAgoUTC } } }),
    prisma.v16BeaconEvent.count({ where: { activatedAt: { gte: weekAgoUTC, lt: todayUTC } } }),
    Promise.all(days.map((d) => prisma.trafficIncident.count({ where: { startedAt: { gte: d.start, lt: d.end } } }))),
    nationalFuel(prisma, todayUTC),
    getProvinceNameMap(prisma),
  ]);

  if (week.total === 0) return 0;

  const thisWeekTotal = week.total;
  const provinceAgg = week.byProvince;
  const typeAgg = week.byType;
  const peakHour = week.peakHour;

  // Best / worst day
  type DayRecord = { dateStart: Date; incidentTotal: number };
  const dayRecords: DayRecord[] = days.map((d, i) => ({ dateStart: d.start, incidentTotal: perDay[i] }));
  const worstDay = dayRecords.reduce<DayRecord | null>(
    (best, d) => (best == null || d.incidentTotal > best.incidentTotal ? d : best),
    null
  );
  const bestDay = dayRecords.reduce<DayRecord | null>(
    (best, d) => (best == null || d.incidentTotal < best.incidentTotal ? d : best),
    null
  );

  // ── Fuel ─────────────────────────────────────────────────────────────────
  // «Now» and «a week ago» from the same stored average (see nationalFuel).
  const dieselNow = num(fuel.latest?.avgGasoleoA);
  const gas95Now = num(fuel.latest?.avgGasolina95);
  const dieselWeekAgo = num(fuel.before(7)?.avgGasoleoA);
  const gas95WeekAgo = num(fuel.before(7)?.avgGasolina95);

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
    `**${fmtInt(thisWeekTotal)}** incidencias nuevas esta semana`,
    `**${fmtInt(lastWeekTotal)}** incidencias nuevas la semana anterior`,
    `**${fmtInt(thisWeekV16Total)}** activaciones de balizas V16`,
  ];
  if (peakHour != null) {
    metrics.push(
      `Hora en que empezaron más incidencias: **${String(peakHour).padStart(2, "0")}:00–${String(peakHour + 1).padStart(2, "0")}:00**`
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
