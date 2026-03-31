/**
 * Maritime Zone Report Generators
 *
 * Two generators:
 *
 * 1. generateMaritimeZoneReports — Daily per-zone COASTAL alert reports
 *    For each of the 8 coastal zones, generates a zone-specific article when
 *    there are active COASTAL alerts in that zone's provinces.
 *    Slug: meteo-maritima-{zone-slug}-YYYY-MM-DD
 *    Category: WEATHER_ALERT
 *
 * 2. generateWeeklyMaritimeSummary — National weekly maritime digest (Mondays)
 *    Aggregates 7-day COASTAL alerts + maritime fuel price trends into a
 *    comprehensive national overview.
 *    Slug: resumen-maritimo-semanal-YYYY-WW
 *    Category: WEEKLY_REPORT
 */

import { PrismaClient, ArticleCategory } from "@prisma/client";
import {
  attachTags,
  todaySlug,
  weekSlug,
  fmtPrice,
  fmtPct,
  fmtInt,
  getEditorialWeight,
  estimateReadTime,
  mdTable,
} from "./shared";
import { log, logError } from "../../../shared/utils.js";

// ── Constants ─────────────────────────────────────────────────────────────────

const TASK = "maritime-zones";

const COASTAL_ZONES = [
  { id: "42", name: "Costa de Galicia", slug: "galicia", provinces: ["15", "27", "36"] },
  { id: "43", name: "Cantábrico Occidental", slug: "cantabrico-occidental", provinces: ["33", "39"] },
  { id: "44", name: "Cantábrico Oriental", slug: "cantabrico-oriental", provinces: ["48", "20"] },
  { id: "45", name: "Catalano-Balear", slug: "catalano-balear", provinces: ["08", "17", "43", "07"] },
  { id: "46", name: "Costa de Valencia", slug: "valencia", provinces: ["12", "46", "03"] },
  { id: "47", name: "Costa de Alborán", slug: "alboran", provinces: ["04", "18", "29"] },
  { id: "48", name: "Estrecho", slug: "estrecho", provinces: ["11", "29", "51", "52"] },
  { id: "49", name: "Costa de Canarias", slug: "canarias", provinces: ["35", "38"] },
] as const;

const SEVERITY_NAMES: Record<string, string> = {
  VERY_HIGH: "Rojo",
  HIGH: "Naranja",
  MEDIUM: "Amarillo",
  LOW: "Verde",
};

const SEVERITY_ORDER: Record<string, number> = {
  VERY_HIGH: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

// ── Navigation advice by severity ─────────────────────────────────────────────

function getNavigationAdvice(
  highestSeverity: string,
  alertCount: number
): string {
  if (highestSeverity === "VERY_HIGH") {
    return `**Navegación no recomendada** en la zona. Mantente en puerto hasta que las condiciones mejoren. Consulta la última previsión de AEMET antes de zarpar.`;
  }
  if (highestSeverity === "HIGH") {
    return `**Precaución máxima** en la mar. Solo embarcaciones preparadas para condiciones adversas. Revisa la previsión horaria antes de zarpar.`;
  }
  if (alertCount > 0) {
    return `**Precaución** al salir. Hay ${alertCount} aviso${alertCount !== 1 ? "s" : ""} costero${alertCount !== 1 ? "s" : ""} activo${alertCount !== 1 ? "s" : ""} en la zona. Consulta la previsión actualizada.`;
  }
  return `Condiciones favorables para la navegación. Consulta siempre la previsión de AEMET antes de zarpar.`;
}

// ── Safety label ──────────────────────────────────────────────────────────────

function getSafetyEmoji(severity: string | null): string {
  if (severity === "VERY_HIGH") return "🔴";
  if (severity === "HIGH") return "🟡";
  if (severity === "MEDIUM") return "🟡";
  return "🟢";
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. DAILY PER-ZONE REPORTS
// ─────────────────────────────────────────────────────────────────────────────

export async function generateMaritimeZoneReports(
  prisma: PrismaClient
): Promise<number> {
  let total = 0;
  const now = new Date();

  for (const zone of COASTAL_ZONES) {
    const slug = `meteo-maritima-${zone.slug}-${todaySlug()}`;

    try {
      // Skip if already exists
      const existing = await prisma.article.findUnique({ where: { slug } });
      if (existing) {
        log(TASK, `Zone report already exists: ${slug}`);
        continue;
      }

      // ── Zone queries ─────────────────────────────────────────────────────
      const [zoneAlerts, fuelAgg, cheapestStation, stationCount] =
        await Promise.all([
          prisma.weatherAlert.findMany({
            where: {
              type: "COASTAL",
              isActive: true,
              province: { in: zone.provinces as unknown as string[] },
            },
            select: {
              severity: true,
              provinceName: true,
              description: true,
            },
            orderBy: { severity: "desc" },
          }),
          prisma.maritimeStation.aggregate({
            _avg: { priceGasoleoA: true, priceGasolina95E5: true },
            where: {
              province: { in: zone.provinces as unknown as string[] },
              priceGasoleoA: { not: null },
            },
          }),
          prisma.maritimeStation.findFirst({
            where: {
              province: { in: zone.provinces as unknown as string[] },
              priceGasoleoA: { not: null },
            },
            orderBy: { priceGasoleoA: "asc" },
            select: { name: true, priceGasoleoA: true, port: true },
          }),
          prisma.maritimeStation.count({
            where: {
              province: { in: zone.provinces as unknown as string[] },
            },
          }),
        ]);

      // Skip zone if no active COASTAL alerts
      if (zoneAlerts.length === 0) {
        log(TASK, `No active COASTAL alerts for zone ${zone.name}, skipping`);
        continue;
      }

      // ── Derived data ─────────────────────────────────────────────────────
      const highestSeverity =
        zoneAlerts.reduce<string | null>((best, a) => {
          if (best == null) return a.severity;
          return (SEVERITY_ORDER[a.severity] ?? 0) > (SEVERITY_ORDER[best] ?? 0)
            ? a.severity
            : best;
        }, null) ?? "LOW";

      const severityCounts: Record<string, number> = {};
      for (const a of zoneAlerts) {
        severityCounts[a.severity] = (severityCounts[a.severity] ?? 0) + 1;
      }

      const affectedProvinces = [
        ...new Set(zoneAlerts.map((a) => a.provinceName).filter(Boolean)),
      ] as string[];

      const avgGasoleoA = fuelAgg._avg.priceGasoleoA
        ? Number(fuelAgg._avg.priceGasoleoA)
        : null;
      const avgGasolina95 = fuelAgg._avg.priceGasolina95E5
        ? Number(fuelAgg._avg.priceGasolina95E5)
        : null;

      // ── Date strings ──────────────────────────────────────────────────────
      const dateStr = now.toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const timeStr = now.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const safetyEmoji = getSafetyEmoji(highestSeverity);
      const navAdvice = getNavigationAdvice(highestSeverity, zoneAlerts.length);

      // ── Build body ────────────────────────────────────────────────────────
      const sections: string[] = [];

      sections.push(`## Meteorología marítima — ${zone.name} — ${dateStr}

${safetyEmoji} **Estado de la zona:** ${SEVERITY_NAMES[highestSeverity] ?? highestSeverity.toLowerCase()} — ${zoneAlerts.length} aviso${zoneAlerts.length !== 1 ? "s" : ""} costero${zoneAlerts.length !== 1 ? "s" : ""} activo${zoneAlerts.length !== 1 ? "s" : ""}.`);

      // Alert summary table
      const alertTableRows = zoneAlerts.slice(0, 12).map((a) => [
        a.provinceName ?? "—",
        SEVERITY_NAMES[a.severity] ?? a.severity,
        a.description
          ? a.description.slice(0, 90) + (a.description.length > 90 ? "…" : "")
          : "—",
      ]);

      sections.push(`### Avisos AEMET activos en la zona

${mdTable(
  ["Provincia", "Nivel", "Descripción"],
  alertTableRows,
  ["left", "center", "left"]
)}`);

      // Severity breakdown
      const severityRows = Object.entries(severityCounts)
        .sort((a, b) => (SEVERITY_ORDER[b[0]] ?? 0) - (SEVERITY_ORDER[a[0]] ?? 0))
        .map(([sev, count]) => [
          SEVERITY_NAMES[sev] ?? sev,
          String(count),
        ]);

      sections.push(`### Desglose por nivel

${mdTable(["Nivel", "Avisos"], severityRows, ["left", "right"])}

Provincias afectadas: ${affectedProvinces.length > 0 ? affectedProvinces.join(", ") : "zona marítima"}.`);

      // Navigation advice
      sections.push(`### Consejo de navegación

${navAdvice}`);

      // Fuel prices (zone-specific)
      if (avgGasoleoA != null || stationCount > 0) {
        const fuelRows: string[][] = [];
        if (avgGasoleoA != null) {
          fuelRows.push([
            "Gasóleo A (marino)",
            fmtPrice(avgGasoleoA) + " €/L",
            `${fmtInt(stationCount)} estaciones`,
          ]);
        }
        if (avgGasolina95 != null) {
          fuelRows.push([
            "Gasolina 95 E5 (marina)",
            fmtPrice(avgGasolina95) + " €/L",
            "—",
          ]);
        }

        const fuelSection =
          fuelRows.length > 0
            ? `${mdTable(
                ["Combustible", "Precio medio", "Cobertura"],
                fuelRows,
                ["left", "right", "right"]
              )}\n\n${
                cheapestStation && cheapestStation.priceGasoleoA != null
                  ? `Estación más económica en la zona: **${cheapestStation.name}**${cheapestStation.port ? ` (${cheapestStation.port})` : ""} — **${fmtPrice(Number(cheapestStation.priceGasoleoA))} €/L**.`
                  : ""
              }`
            : stationCount > 0
            ? `${fmtInt(stationCount)} estaciones marítimas en la zona. Sin datos de precio actualizados.`
            : `Sin estaciones marítimas registradas en esta zona.`;

        sections.push(`### Combustible naval en la zona\n\n${fuelSection}`);
      }

      // Links
      sections.push(`### Más información

- [Meteorología costera](/maritimo/meteorologia)
- [Informe marítimo nacional](/maritimo)
- [Combustible naval](/maritimo/combustible)
- [Mapa marítimo](/maritimo/mapa)
- [Alertas meteorológicas](/alertas-meteo)

---

*Datos: AEMET (alertas costeras), MINETUR (combustible naval). Actualizado a las ${timeStr}.*`);

      const body = sections.join("\n\n");

      const title = `Meteorología marítima ${zone.name} — ${dateStr}`;
      const summary =
        `${zoneAlerts.length} aviso${zoneAlerts.length !== 1 ? "s" : ""} costero${zoneAlerts.length !== 1 ? "s" : ""} AEMET en ${zone.name}` +
        ` (nivel máximo: ${SEVERITY_NAMES[highestSeverity] ?? highestSeverity})` +
        (avgGasoleoA != null
          ? `. Gasóleo marino: ${fmtPrice(avgGasoleoA)} €/L.`
          : ".");

      const category: ArticleCategory = "WEATHER_ALERT";

      const article = await prisma.article.create({
        data: {
          slug,
          title,
          summary,
          body,
          category,
          source: "AEMET",
          sourceUrl: "https://www.aemet.es",
          isAutoGenerated: true,
          readTime: estimateReadTime(body.length),
          editorialWeight: getEditorialWeight(category),
        },
      });

      await attachTags(prisma, article.id, [
        { slug: "maritimo", name: "Marítimo" },
        { slug: "costera", name: "Costera" },
        { slug: zone.slug, name: zone.name },
      ]);

      log(TASK, `Created zone report: ${slug}`);
      total++;
    } catch (err) {
      logError(TASK, `Failed to process zone ${zone.name}`, err);
    }
  }

  return total;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. WEEKLY NATIONAL MARITIME DIGEST
// ─────────────────────────────────────────────────────────────────────────────

export async function generateWeeklyMaritimeSummary(
  prisma: PrismaClient
): Promise<number> {
  const now = new Date();

  // Only generate on Mondays (day 1)
  if (now.getDay() !== 1) return 0;

  const slug = `resumen-maritimo-semanal-${weekSlug()}`;

  const existing = await prisma.article.findUnique({ where: { slug } });
  if (existing) {
    log(TASK, `Weekly maritime summary already exists: ${slug}`);
    return 0;
  }

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setUTCDate(fourteenDaysAgo.getUTCDate() - 14);

  // ── Queries ───────────────────────────────────────────────────────────────
  let weekAlerts: {
    severity: string;
    province: string;
    provinceName: string | null;
  }[] = [];
  let avgGasoleoA: number | null = null;
  let avgGasolina95: number | null = null;
  let stationTotal = 0;

  try {
    const [
      alertsThisWeek,
      gasoleoAgg,
      gasolinaAgg,
      stationCount,
    ] = await Promise.all([
      prisma.weatherAlert.findMany({
        where: {
          type: "COASTAL",
          startedAt: { gte: sevenDaysAgo },
        },
        select: { severity: true, province: true, provinceName: true },
        orderBy: { severity: "desc" },
      }),
      prisma.maritimeStation.aggregate({
        _avg: { priceGasoleoA: true },
        where: { priceGasoleoA: { not: null } },
      }),
      prisma.maritimeStation.aggregate({
        _avg: { priceGasolina95E5: true },
        where: { priceGasolina95E5: { not: null } },
      }),
      prisma.maritimeStation.count(),
    ]);

    weekAlerts = alertsThisWeek as typeof weekAlerts;
    avgGasoleoA = gasoleoAgg._avg.priceGasoleoA
      ? Number(gasoleoAgg._avg.priceGasoleoA)
      : null;
    avgGasolina95 = gasolinaAgg._avg.priceGasolina95E5
      ? Number(gasolinaAgg._avg.priceGasolina95E5)
      : null;
    stationTotal = stationCount;
  } catch (err) {
    logError(TASK, "Failed to query maritime data for weekly summary", err);
    return 0;
  }

  // ── Last week fuel comparison via price history ───────────────────────────
  let avgGasoleoALastWeek: number | null = null;
  try {
    const lastWeekHistory = await prisma.maritimePriceHistory.aggregate({
      _avg: { priceGasoleoA: true },
      where: {
        recordedAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
        priceGasoleoA: { not: null },
      },
    });
    avgGasoleoALastWeek = lastWeekHistory._avg.priceGasoleoA
      ? Number(lastWeekHistory._avg.priceGasoleoA)
      : null;
  } catch {
    // Price history may be empty — not a fatal error
  }

  // ── National alert aggregation ────────────────────────────────────────────
  const totalAlerts = weekAlerts.length;
  const nationalSeverityCounts: Record<string, number> = {};
  for (const a of weekAlerts) {
    nationalSeverityCounts[a.severity] =
      (nationalSeverityCounts[a.severity] ?? 0) + 1;
  }

  const highestNational =
    Object.keys(nationalSeverityCounts).reduce<string | null>((best, sev) => {
      if (best == null) return sev;
      return (SEVERITY_ORDER[sev] ?? 0) > (SEVERITY_ORDER[best] ?? 0)
        ? sev
        : best;
    }, null) ?? "LOW";

  // ── Per-zone breakdown ────────────────────────────────────────────────────
  interface ZoneSummary {
    name: string;
    slug: string;
    alertCount: number;
    highestSeverity: string | null;
  }
  const zoneSummaries: ZoneSummary[] = COASTAL_ZONES.map((zone) => {
    const zoneAlertList = weekAlerts.filter((a) =>
      (zone.provinces as readonly string[]).includes(a.province)
    );
    const zoneHighest = zoneAlertList.reduce<string | null>((best, a) => {
      if (best == null) return a.severity;
      return (SEVERITY_ORDER[a.severity] ?? 0) > (SEVERITY_ORDER[best] ?? 0)
        ? a.severity
        : best;
    }, null);
    return {
      name: zone.name,
      slug: zone.slug,
      alertCount: zoneAlertList.length,
      highestSeverity: zoneHighest,
    };
  });

  // ── Fuel price trend ──────────────────────────────────────────────────────
  const gasoleoTrend =
    avgGasoleoA != null && avgGasoleoALastWeek != null
      ? ((avgGasoleoA - avgGasoleoALastWeek) / avgGasoleoALastWeek) * 100
      : null;

  // ── Date strings ──────────────────────────────────────────────────────────
  const now2 = new Date();
  const timeStr = now2.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const weekLabel = weekSlug();

  // ── Build body ────────────────────────────────────────────────────────────
  const sections: string[] = [];

  // Lead
  const leadSeverityLabel =
    totalAlerts === 0
      ? "sin incidencias costeras"
      : `máxima: ${SEVERITY_NAMES[highestNational] ?? highestNational}`;
  sections.push(`## Resumen marítimo semanal — ${weekLabel}

Resumen de la actividad costera en España durante los últimos 7 días. **${fmtInt(totalAlerts)} avisos costeros** AEMET registrados (${leadSeverityLabel}).`);

  // National overview
  const overviewItems: string[] = [
    `**${fmtInt(totalAlerts)}** avisos AEMET de tipo costero en 7 días`,
    `**${fmtInt(stationTotal)}** estaciones de combustible marítimo activas`,
  ];
  if (avgGasoleoA != null) {
    overviewItems.push(
      `Gasóleo marino (media nacional): **${fmtPrice(avgGasoleoA)} €/L**${gasoleoTrend != null ? ` (${fmtPct(gasoleoTrend)} vs semana anterior)` : ""}`
    );
  }
  if (avgGasolina95 != null) {
    overviewItems.push(
      `Gasolina 95 marina (media nacional): **${fmtPrice(avgGasolina95)} €/L**`
    );
  }

  sections.push(`### Panorama nacional

${overviewItems.map((i) => `- ${i}`).join("\n")}`);

  // Severity breakdown table (national)
  if (Object.keys(nationalSeverityCounts).length > 0) {
    const sevRows = Object.entries(nationalSeverityCounts)
      .sort((a, b) => (SEVERITY_ORDER[b[0]] ?? 0) - (SEVERITY_ORDER[a[0]] ?? 0))
      .map(([sev, count]) => [SEVERITY_NAMES[sev] ?? sev, String(count)]);

    sections.push(`### Distribución de alertas por nivel

${mdTable(["Nivel", "Avisos"], sevRows, ["left", "right"])}`);
  }

  // Zone-by-zone summary table
  const zoneRows = zoneSummaries.map((z) => [
    z.name,
    z.alertCount > 0 ? String(z.alertCount) : "—",
    z.highestSeverity
      ? `${getSafetyEmoji(z.highestSeverity)} ${SEVERITY_NAMES[z.highestSeverity] ?? z.highestSeverity}`
      : "🟢 Sin alertas",
  ]);

  sections.push(`### Desglose por zona costera

${mdTable(
  ["Zona", "Avisos (7 días)", "Nivel máximo"],
  zoneRows,
  ["left", "right", "left"]
)}`);

  // Fuel price table
  const fuelTableRows: string[][] = [];
  if (avgGasoleoA != null) {
    fuelTableRows.push([
      "Gasóleo A (marino)",
      fmtPrice(avgGasoleoA) + " €/L",
      avgGasoleoALastWeek != null ? fmtPrice(avgGasoleoALastWeek) + " €/L" : "N/D",
      gasoleoTrend != null ? fmtPct(gasoleoTrend) : "N/D",
    ]);
  }
  if (avgGasolina95 != null) {
    fuelTableRows.push([
      "Gasolina 95 E5 (marina)",
      fmtPrice(avgGasolina95) + " €/L",
      "N/D",
      "N/D",
    ]);
  }

  if (fuelTableRows.length > 0) {
    sections.push(`### Precios de combustible naval

${mdTable(
  ["Combustible", "Precio actual", "Semana anterior", "Variación"],
  fuelTableRows,
  ["left", "right", "right", "right"]
)}

Consulta los [precios de combustible naval](/maritimo/combustible) en tiempo real.`);
  }

  // Navigation advice section
  const zonesWithAlerts = zoneSummaries.filter((z) => z.alertCount > 0);
  if (zonesWithAlerts.length > 0) {
    const zoneNotes = zonesWithAlerts.map((z) => {
      const advice = getNavigationAdvice(z.highestSeverity ?? "LOW", z.alertCount);
      return `**${z.name}:** ${advice}`;
    });
    sections.push(`### Recomendaciones por zona

${zoneNotes.map((n) => `- ${n}`).join("\n")}`);
  } else {
    sections.push(`### Recomendaciones

Sin alertas costeras activas esta semana. Condiciones generalmente favorables para la navegación en toda la costa española.`);
  }

  // Links
  sections.push(`### Más información

- [Informe marítimo diario](/maritimo)
- [Meteorología costera](/maritimo/meteorologia)
- [Combustible naval](/maritimo/combustible)
- [Mapa marítimo](/maritimo/mapa)
- [Alertas AEMET](/alertas-meteo)

---

*Datos: AEMET (alertas costeras 7 días), MINETUR (combustible naval). Generado el ${weekLabel} a las ${timeStr}.*`);

  const body = sections.join("\n\n");

  const title = `Resumen marítimo semanal — ${weekLabel}`;
  const summary =
    `Semana ${weekLabel}: ${fmtInt(totalAlerts)} avisos costeros AEMET en las 8 zonas marítimas españolas.` +
    (avgGasoleoA != null
      ? ` Gasóleo marino: ${fmtPrice(avgGasoleoA)} €/L${gasoleoTrend != null ? ` (${fmtPct(gasoleoTrend)} vs semana anterior)` : ""}.`
      : "");

  const category: ArticleCategory = "WEEKLY_REPORT";

  try {
    const article = await prisma.article.create({
      data: {
        slug,
        title,
        summary,
        body,
        category,
        source: "AEMET",
        sourceUrl: "https://www.aemet.es",
        isAutoGenerated: true,
        readTime: estimateReadTime(body.length),
        editorialWeight: getEditorialWeight(category),
      },
    });

    await attachTags(prisma, article.id, [
      { slug: "maritimo", name: "Marítimo" },
      { slug: "costera", name: "Costera" },
      { slug: "combustible-naval", name: "Combustible naval" },
    ]);

    log(TASK, `Created weekly maritime summary: ${slug}`);
    return 1;
  } catch (err) {
    logError(TASK, `Failed to create weekly maritime summary: ${slug}`, err);
    return 0;
  }
}
