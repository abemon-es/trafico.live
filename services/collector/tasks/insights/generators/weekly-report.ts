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
  getEditorialWeight,
  estimateReadTime,
  getProvinceNameMap,
  mdTable,
  nationalFuel,
  incidentCounts,
  countIncidents,
  reportedBySource,
  dgtSeenHours,
  num,
} from "./shared";
import { outageHours, weeklyIncidentText } from "./incident-text";

const HOUR = 3_600_000;

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
  const [week, lastWeekBySource, thisWeekV16Total, perDay, fuel, provinceNameMap, seen] = await Promise.all([
    incidentCounts(prisma, weekAgoUTC, todayUTC),
    reportedBySource(prisma, twoWeeksAgoUTC, weekAgoUTC),
    prisma.v16BeaconEvent.count({ where: { activatedAt: { gte: weekAgoUTC, lt: todayUTC } } }),
    Promise.all(days.map((d) => countIncidents(prisma, d.start, d.end))),
    nationalFuel(prisma, todayUTC),
    getProvinceNameMap(prisma),
    dgtSeenHours(prisma, new Date(twoWeeksAgoUTC.getTime() - HOUR), new Date(todayUTC.getTime() + HOUR)),
  ]);

  if (week.total === 0) return 0;

  // Reported incidents per closed day, for the best / worst day.
  const dayRecords = days.map((d, i) => ({
    dateStart: d.start,
    incidentTotal: perDay[i],
    missingHours: outageHours(seen, d.start, d.end, now),
  }));

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

  // ── Incidents ────────────────────────────────────────────────────────────
  const weekLabel = weekSlug();
  const incidents = weeklyIncidentText({
    week,
    lastWeekBySource,
    perDay: dayRecords,
    v16Activations: thisWeekV16Total,
    missing: {
      week: outageHours(seen, weekAgoUTC, todayUTC, now),
      lastWeek: outageHours(seen, twoWeeksAgoUTC, weekAgoUTC, now),
    },
    provinceNames: provinceNameMap,
    withCitySensors: true,
  });

  // ── Build body ───────────────────────────────────────────────────────────
  const sections: string[] = [];

  sections.push(`## Informe semanal de tráfico — ${weekLabel}\n\n${incidents.lead}`, ...incidents.sections);

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

  const title = `Informe semanal de tráfico — ${weekLabel}${incidents.trendWord ? `: semana ${incidents.trendWord}` : ""}`;
  const summary = `Resumen ${weekLabel}: ${incidents.summaryClause}. Diésel: ${fmtPrice(dieselNow)} €/L. Gasolina 95: ${fmtPrice(gas95Now)} €/L.`;

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
