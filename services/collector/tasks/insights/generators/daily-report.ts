/**
 * Enhanced Daily National Traffic Report (v2)
 *
 * Generates a data-dense daily digest with:
 * - Incident totals vs 7-day average (opinionated lead)
 * - Incident type breakdown table
 * - Top 5 provinces by incident count table
 * - Peak hour analysis
 * - National fuel prices (diesel + gas95) vs yesterday
 * - Active weather alerts summary
 * - Navigation links
 */

import { PrismaClient, ArticleCategory } from "@prisma/client";
import {
  attachTags,
  todaySlug,
  fmtPrice,
  fmtPct,
  fmtInt,
  getEditorialWeight,
  estimateReadTime,
  getProvinceNameMap,
  mdTable,
  INCIDENT_TYPE_NAMES,
} from "./shared";

export async function generateDailyReport(prisma: PrismaClient): Promise<number> {
  const slug = `informe-diario-${todaySlug()}`;
  const existing = await prisma.article.findUnique({ where: { slug } });
  if (existing) return 0;

  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);
  const sevenDaysAgo = new Date(todayStart);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);

  // ── Queries ──────────────────────────────────────────────────────────────
  const [
    activeIncidents,
    todayIncidents,
    yesterdayIncidents,
    activeAlerts,
    avgDieselToday,
    avgGas95Today,
    yesterdayFuelStats,
    todayDailyStats,
    sevenDayStats,
    provinceNameMap,
  ] = await Promise.all([
    prisma.trafficIncident.count({ where: { isActive: true } }),
    prisma.trafficIncident.count({ where: { startedAt: { gte: todayStart } } }),
    prisma.trafficIncident.count({
      where: { startedAt: { gte: yesterdayStart, lt: todayStart } },
    }),
    prisma.weatherAlert.findMany({
      where: { isActive: true },
      select: { severity: true, type: true, provinceName: true },
      orderBy: { severity: "desc" },
      take: 20,
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
      where: { date: yesterdayStart, scope: "national" },
    }),
    prisma.dailyStats.findFirst({
      where: { dateStart: todayStart },
    }),
    prisma.dailyStats.findMany({
      where: { dateStart: { gte: sevenDaysAgo, lt: todayStart } },
      select: { incidentTotal: true },
    }),
    getProvinceNameMap(prisma),
  ]);

  // ── Fuel deltas ──────────────────────────────────────────────────────────
  const dieselNow = avgDieselToday._avg.priceGasoleoA
    ? Number(avgDieselToday._avg.priceGasoleoA)
    : null;
  const gas95Now = avgGas95Today._avg.priceGasolina95E5
    ? Number(avgGas95Today._avg.priceGasolina95E5)
    : null;

  const dieselYest = yesterdayFuelStats?.avgGasoleoA
    ? Number(yesterdayFuelStats.avgGasoleoA)
    : null;
  const gas95Yest = yesterdayFuelStats?.avgGasolina95
    ? Number(yesterdayFuelStats.avgGasolina95)
    : null;

  const dieselDelta =
    dieselNow != null && dieselYest != null
      ? ((dieselNow - dieselYest) / dieselYest) * 100
      : null;
  const gas95Delta =
    gas95Now != null && gas95Yest != null
      ? ((gas95Now - gas95Yest) / gas95Yest) * 100
      : null;

  // ── 7-day average ────────────────────────────────────────────────────────
  const avg7d =
    sevenDayStats.length > 0
      ? sevenDayStats.reduce((sum, d) => sum + d.incidentTotal, 0) / sevenDayStats.length
      : null;

  // ── DailyStats breakdowns ────────────────────────────────────────────────
  const byIncidentType = (todayDailyStats?.byIncidentType ?? {}) as Record<string, number>;
  const byProvince = (todayDailyStats?.byProvince ?? {}) as Record<string, number>;
  const peakHour: number | null = todayDailyStats?.peakHour ?? null;
  const avgDurationSecs: number | null = todayDailyStats?.avgDurationSecs ?? null;

  // Top 5 provinces
  const topProvinces = Object.entries(byProvince)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([code, count]) => ({
      code,
      name: provinceNameMap.get(code) ?? code,
      count,
    }));

  // ── Opinionated lead ─────────────────────────────────────────────────────
  const dateStr = now.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

  let leadSentence: string;
  if (avg7d == null) {
    leadSentence = `Hoy se registran **${fmtInt(todayIncidents)} incidencias** nuevas en las carreteras españolas.`;
  } else {
    const ratio = todayIncidents / avg7d;
    if (ratio >= 1.25) {
      leadSentence = `La jornada de hoy es **más intensa de lo habitual**: ${fmtInt(todayIncidents)} incidencias frente a una media de ${fmtInt(avg7d)} en los últimos 7 días (${fmtPct(((todayIncidents - avg7d) / avg7d) * 100)}).`;
    } else if (ratio <= 0.75) {
      leadSentence = `Jornada **tranquila en carretera**: solo ${fmtInt(todayIncidents)} incidencias hoy, por debajo de la media de ${fmtInt(avg7d)} de los últimos 7 días (${fmtPct(((todayIncidents - avg7d) / avg7d) * 100)}).`;
    } else {
      leadSentence = `Tráfico **dentro de lo normal** hoy: ${fmtInt(todayIncidents)} incidencias, próximo a la media de ${fmtInt(avg7d)} de los últimos 7 días.`;
    }
  }

  // ── Incident type breakdown table ────────────────────────────────────────
  const typeEntries = Object.entries(byIncidentType)
    .sort((a, b) => b[1] - a[1])
    .filter(([, count]) => count > 0);

  const totalTyped = typeEntries.reduce((s, [, c]) => s + c, 0) || 1;
  const typeTableRows = typeEntries.map(([type, count]) => [
    INCIDENT_TYPE_NAMES[type] ?? type,
    String(count),
    fmtPct((count / totalTyped) * 100).replace("+", ""),
  ]);

  // ── Province table ───────────────────────────────────────────────────────
  const provinceTableRows = topProvinces.map(({ name, count }, i) => [
    String(i + 1),
    name,
    String(count),
  ]);

  // ── Peak hour string ─────────────────────────────────────────────────────
  const peakHourStr =
    peakHour != null
      ? `**${String(peakHour).padStart(2, "0")}:00–${String(peakHour + 1).padStart(2, "0")}:00**`
      : "N/D";

  const avgDurStr =
    avgDurationSecs != null
      ? `${Math.round(avgDurationSecs / 60)} min`
      : "N/D";

  // ── Weather section ──────────────────────────────────────────────────────
  const alertProvinces = [
    ...new Set(activeAlerts.map((a) => a.provinceName).filter(Boolean)),
  ] as string[];
  const alertSeverities = activeAlerts.reduce((acc, a) => {
    acc[a.severity] = (acc[a.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const severityLabels: Record<string, string> = {
    LOW: "bajos",
    MEDIUM: "moderados",
    HIGH: "altos",
    VERY_HIGH: "muy altos",
  };
  const severitySummary = Object.entries(alertSeverities)
    .map(([s, c]) => `${c} ${severityLabels[s] ?? s.toLowerCase()}`)
    .join(", ");

  // ── Build body ───────────────────────────────────────────────────────────
  const sections: string[] = [];

  sections.push(`## Informe de tráfico — ${dateStr}\n\n${leadSentence}`);

  // Incident summary
  sections.push(`### Incidencias

- **${fmtInt(activeIncidents)}** incidencias activas en este momento
- **${fmtInt(todayIncidents)}** incidencias nuevas registradas hoy
- **${fmtInt(yesterdayIncidents)}** incidencias registradas ayer
- Duración media: ${avgDurStr}${avg7d != null ? `\n- Media últimos 7 días: **${fmtInt(avg7d)}** incidencias/día` : ""}`);

  // Type breakdown
  if (typeTableRows.length > 0) {
    sections.push(`### Tipo de incidencia

${mdTable(
  ["Tipo", "Incidencias", "% del total"],
  typeTableRows,
  ["left", "right", "right"]
)}`);
  }

  // Top provinces
  if (provinceTableRows.length > 0) {
    sections.push(`### Provincias con más incidencias

${mdTable(
  ["#", "Provincia", "Incidencias"],
  provinceTableRows,
  ["center", "left", "right"]
)}`);
  }

  // Peak hour
  sections.push(`### Hora punta

La hora con mayor concentración de incidencias hoy ha sido ${peakHourStr}.`);

  // Fuel prices
  const dieselDeltaStr = dieselDelta != null ? ` (${fmtPct(dieselDelta)} vs ayer)` : "";
  const gas95DeltaStr = gas95Delta != null ? ` (${fmtPct(gas95Delta)} vs ayer)` : "";

  sections.push(`### Precios de combustible

${mdTable(
  ["Combustible", "Precio (€/L)", "Variación vs ayer"],
  [
    ["Gasóleo A", fmtPrice(dieselNow), dieselDelta != null ? fmtPct(dieselDelta) : "N/D"],
    ["Gasolina 95 E5", fmtPrice(gas95Now), gas95Delta != null ? fmtPct(gas95Delta) : "N/D"],
  ],
  ["left", "right", "right"]
)}

Di\u00e9sel: **${fmtPrice(dieselNow)} €/L**${dieselDeltaStr}. Gasolina 95: **${fmtPrice(gas95Now)} €/L**${gas95DeltaStr}.

Consulta las [gasolineras más baratas](/gasolineras/baratas) o los [precios por provincia](/gasolineras/precios).`);

  // Weather
  if (activeAlerts.length > 0) {
    sections.push(`### Meteorolog\u00eda

**${activeAlerts.length} alertas meteorológicas activas** (${severitySummary}) que afectan a ${alertProvinces.length > 0 ? alertProvinces.slice(0, 8).join(", ") + (alertProvinces.length > 8 ? ` y ${alertProvinces.length - 8} más` : "") : "varias provincias"}.

Revisa las [alertas meteorológicas](/alertas-meteo) antes de salir.`);
  } else {
    sections.push(`### Meteorolog\u00eda

Sin alertas meteorológicas activas en este momento.`);
  }

  // Links
  sections.push(`### Más información

- [Mapa de incidencias en tiempo real](/incidencias)
- [Atascos activos](/atascos)
- [Cortes de tráfico](/cortes-trafico)
- [Cámaras de tráfico](/camaras)
- [Radares DGT](/radares)
- [Gasolineras más baratas](/gasolineras/baratas)

---

*Datos: DGT, MITERD, AEMET. Actualizado a las ${timeStr}.*`);

  const body = sections.join("\n\n");

  const title = `Informe de tráfico — ${dateStr}`;
  const summary = `${fmtInt(activeIncidents)} incidencias activas, ${fmtInt(todayIncidents)} nuevas hoy${avg7d != null ? ` (media 7d: ${fmtInt(avg7d)})` : ""}. Diésel: ${fmtPrice(dieselNow)} €/L. Gasolina 95: ${fmtPrice(gas95Now)} €/L. ${activeAlerts.length} alertas meteorológicas.`;

  const category: ArticleCategory = "DAILY_REPORT";

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
    { slug: "informe-diario", name: "Informe diario" },
    { slug: "dgt", name: "DGT" },
    { slug: "aemet", name: "AEMET" },
    { slug: "precio-combustible", name: "Precio combustible" },
  ]);

  return 1;
}
