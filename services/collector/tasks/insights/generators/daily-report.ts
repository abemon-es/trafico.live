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
  nationalFuel,
  incidentCounts,
  countIncidents,
  activeCounts,
  num,
} from "./shared";

export async function generateDailyReport(prisma: PrismaClient): Promise<number> {
  const slug = `informe-diario-${todaySlug()}`;
  const existing = await prisma.article.findUnique({ where: { slug } });
  if (existing) return 0;

  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);
  // The report goes out just after 00:00Z, so it reports the day that has
  // just closed (yesterday) against the 7 closed days before it: comparing the
  // first minutes of today with full days read «10 nuevas hoy, -99.9 %».
  const weekBeforeStart = new Date(yesterdayStart);
  weekBeforeStart.setUTCDate(weekBeforeStart.getUTCDate() - 7);

  // ── Queries ──────────────────────────────────────────────────────────────
  const [
    activeIncidents,
    yesterday,
    activeAlerts,
    fuel,
    weekBeforeCount,
    provinceNameMap,
  ] = await Promise.all([
    activeCounts(prisma),
    incidentCounts(prisma, yesterdayStart, todayStart),
    prisma.weatherAlert.findMany({
      where: { isActive: true },
      select: { severity: true, type: true, provinceName: true },
      orderBy: { severity: "desc" },
      take: 20,
    }),
    nationalFuel(prisma, todayStart),
    // Same unit as `yesterday`: incidents started, over 7 closed days.
    countIncidents(prisma, weekBeforeStart, yesterdayStart),
    getProvinceNameMap(prisma),
  ]);

  // ── Fuel deltas ──────────────────────────────────────────────────────────
  // «Now» and «yesterday» from the same stored average (see nationalFuel).
  const dieselNow = num(fuel.latest?.avgGasoleoA);
  const gas95Now = num(fuel.latest?.avgGasolina95);
  const dieselYest = num(fuel.before(1)?.avgGasoleoA);
  const gas95Yest = num(fuel.before(1)?.avgGasolina95);

  const dieselDelta =
    dieselNow != null && dieselYest != null
      ? ((dieselNow - dieselYest) / dieselYest) * 100
      : null;
  const gas95Delta =
    gas95Now != null && gas95Yest != null
      ? ((gas95Now - gas95Yest) / gas95Yest) * 100
      : null;

  // ── 7-day average ────────────────────────────────────────────────────────
  // Incidents and vehicle stops apart (src/lib/vehicle-stops.ts), the same
  // split on every figure: active, yesterday and the 7 days before.
  const yesterdayIncidents = yesterday.total;
  const avg7d = weekBeforeCount > 0 ? weekBeforeCount / 7 : null;
  const active = activeIncidents.incidents;

  // ── Yesterday's breakdowns, from the same rows ───────────────────────────
  const byIncidentType = yesterday.byType;
  const byProvince = yesterday.byProvince;
  const peakHour = yesterday.peakHour;

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
    leadSentence = `Ayer se registraron **${fmtInt(yesterdayIncidents)} incidencias** nuevas en las carreteras españolas.`;
  } else {
    const ratio = yesterdayIncidents / avg7d;
    const pct = fmtPct(((yesterdayIncidents - avg7d) / avg7d) * 100);
    if (ratio >= 1.25) {
      leadSentence = `Ayer fue una jornada **más intensa de lo habitual**: ${fmtInt(yesterdayIncidents)} incidencias nuevas frente a una media de ${fmtInt(avg7d)} en los 7 días anteriores (${pct}).`;
    } else if (ratio <= 0.75) {
      leadSentence = `Ayer fue una jornada **tranquila en carretera**: ${fmtInt(yesterdayIncidents)} incidencias nuevas, por debajo de la media de ${fmtInt(avg7d)} de los 7 días anteriores (${pct}).`;
    } else {
      leadSentence = `Ayer, tráfico **dentro de lo normal**: ${fmtInt(yesterdayIncidents)} incidencias nuevas, próximo a la media de ${fmtInt(avg7d)} de los 7 días anteriores.`;
    }
  }

  // ── Incident type breakdown table ────────────────────────────────────────
  const typeEntries = Object.entries(byIncidentType)
    .sort((a, b) => b[1] - a[1])
    .filter(([, count]) => count > 0);

  // The type table adds the vehicle stops as their own row, so incidents plus
  // vehicle stops is the whole: nothing hidden.
  const totalTyped = typeEntries.reduce((s, [, c]) => s + c, 0) + yesterday.vehicleStops || 1;
  const typeTableRows = [...typeEntries, ["VEHICLE_STOPS", yesterday.vehicleStops] as [string, number]].filter(([, c]) => c > 0).map(([type, count]) => [
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

- **${fmtInt(active)}** incidencias activas en este momento
- **${fmtInt(yesterdayIncidents)}** incidencias nuevas ayer${avg7d != null ? `\n- Media de los 7 días anteriores: **${fmtInt(avg7d)}** incidencias nuevas al día` : ""}
- Vehículos detenidos (balizas V16 y averías): **${fmtInt(yesterday.vehicleStops)}** nuevos ayer, **${fmtInt(activeIncidents.vehicleStops)}** activos ahora`);

  // Type breakdown
  if (typeTableRows.length > 0) {
    sections.push(`### Tipo de incidencia (nuevas ayer)

${mdTable(
  ["Tipo", "Incidencias", "% del total"],
  typeTableRows,
  ["left", "right", "right"]
)}`);
  }

  // Top provinces
  if (provinceTableRows.length > 0) {
    sections.push(`### Provincias con más incidencias nuevas ayer

${mdTable(
  ["#", "Provincia", "Incidencias"],
  provinceTableRows,
  ["center", "left", "right"]
)}`);
  }

  // Peak hour
  sections.push(`### Hora punta

La hora en que empezaron más incidencias ayer fue ${peakHourStr}.`);

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
  const summary = `${fmtInt(active)} incidencias activas, ${fmtInt(yesterdayIncidents)} nuevas ayer${avg7d != null ? ` (media de los 7 días anteriores: ${fmtInt(avg7d)})` : ""}, y ${fmtInt(yesterday.vehicleStops)} vehículos detenidos. Diésel: ${fmtPrice(dieselNow)} €/L. Gasolina 95: ${fmtPrice(gas95Now)} €/L. ${activeAlerts.length} alertas meteorológicas.`;

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
