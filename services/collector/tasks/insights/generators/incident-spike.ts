/**
 * Enhanced Incident Spike Alert — severity-gated with breakdowns.
 *
 * Expert recommendation: threshold 1.8x (not 1.5x), min 15 (not 10).
 * Enriched with: type breakdown, affected provinces/roads, panel messages.
 */

import { PrismaClient } from "@prisma/client";
import {
  attachTags, todaySlug, fmtInt, fmtPct,
  getEditorialWeight, estimateReadTime, getProvinceNameMap,
  mdTable, INCIDENT_TYPE_NAMES,
} from "./shared";

export async function generateEnhancedIncidentSpike(prisma: PrismaClient): Promise<number> {
  const slug = `pico-incidencias-${todaySlug()}`;
  const existing = await prisma.article.findUnique({ where: { slug } });
  if (existing) return 0;

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekAgo = new Date(todayStart);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [activeCount, weekStats] = await Promise.all([
    prisma.trafficIncident.count({ where: { isActive: true } }),
    prisma.dailyStats.findMany({
      where: { dateStart: { gte: weekAgo, lt: todayStart } },
      select: { incidentTotal: true },
    }),
  ]);

  const weekAvg = weekStats.length > 0
    ? weekStats.reduce((s, d) => s + d.incidentTotal, 0) / weekStats.length
    : 0;

  // Severity gate: 1.8x average AND at least 15 incidents
  if (activeCount < 15 || weekAvg === 0 || activeCount <= weekAvg * 1.8) return 0;

  const pctAbove = ((activeCount - weekAvg) / weekAvg) * 100;
  const provinceNames = await getProvinceNameMap(prisma);

  // Parallel queries for enriched data
  const [typeBreakdown, todayStats, panelMessages] = await Promise.all([
    prisma.trafficIncident.groupBy({
      by: ["type"],
      where: { isActive: true },
      _count: { type: true },
      orderBy: { _count: { type: "desc" } },
    }),
    prisma.dailyStats.findFirst({
      where: { dateStart: todayStart },
      select: { byProvince: true, peakHour: true, peakCount: true, avgDurationSecs: true },
    }),
    prisma.variablePanel.findMany({
      where: { hasMessage: true, isActive: true },
      select: { name: true, message: true, roadNumber: true, province: true },
      take: 10,
      orderBy: { messageStartAt: "desc" },
    }),
  ]);

  // Province breakdown from DailyStats
  const byProvince = todayStats?.byProvince as Record<string, number> | null;
  const topProvinces = byProvince
    ? Object.entries(byProvince)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([code, count]) => ({
          name: provinceNames.get(code) || code,
          count,
        }))
    : [];

  // Top roads from active incidents
  const roadCounts = await prisma.trafficIncident.groupBy({
    by: ["roadNumber"],
    where: { isActive: true, roadNumber: { not: null } },
    _count: { roadNumber: true },
    orderBy: { _count: { roadNumber: "desc" } },
    take: 10,
  });

  // Build body
  const sections: string[] = [];

  sections.push(`## Pico de incidencias de tráfico\n\nLas carreteras españolas registran un **pico de incidencias**: **${fmtInt(activeCount)} activas**, un **${fmtPct(pctAbove)}** por encima de la media de los últimos 7 días (**${fmtInt(weekAvg)} incidencias/día**).`);

  // Type breakdown table
  if (typeBreakdown.length > 0) {
    const total = typeBreakdown.reduce((s, t) => s + t._count.type, 0);
    sections.push(`### Desglose por tipo\n\n${mdTable(
      ["Tipo", "Activas", "% del total"],
      typeBreakdown.map((t) => [
        INCIDENT_TYPE_NAMES[t.type] || t.type,
        fmtInt(t._count.type),
        `${Math.round((t._count.type / total) * 100)}%`,
      ]),
      ["left", "right", "right"]
    )}`);
  }

  // Top provinces
  if (topProvinces.length > 0) {
    sections.push(`### Provincias más afectadas\n\n${mdTable(
      ["Provincia", "Incidencias"],
      topProvinces.map((p) => [p.name, fmtInt(p.count)]),
      ["left", "right"]
    )}`);
  }

  // Top roads
  if (roadCounts.length > 0) {
    sections.push(`### Carreteras más afectadas\n\n${mdTable(
      ["Carretera", "Incidencias activas"],
      roadCounts
        .filter((r) => r.roadNumber)
        .map((r) => [r.roadNumber!, fmtInt(r._count.roadNumber)]),
      ["left", "right"]
    )}`);
  }

  // Peak hour
  if (todayStats?.peakHour !== null && todayStats?.peakHour !== undefined) {
    const duration = todayStats.avgDurationSecs
      ? `Duración media de las incidencias: **${Math.round(todayStats.avgDurationSecs / 60)} minutos**.`
      : "";
    sections.push(`### Hora punta\n\nLa hora con mayor actividad ha sido las **${todayStats.peakHour}:00**${todayStats.peakCount ? ` con **${fmtInt(todayStats.peakCount)} incidencias**` : ""}. ${duration}`);
  }

  // Panel messages (if any)
  if (panelMessages.length > 0) {
    const panelList = panelMessages
      .slice(0, 5)
      .map((p) => `- **${p.roadNumber || ""} ${p.name || ""}:** ${p.message || "Sin mensaje"}`)
      .join("\n");
    sections.push(`### Mensajes en paneles de tráfico\n\n${panelList}`);
  }

  // Links
  sections.push(`## Consulta en tiempo real\n\n- [Mapa de incidencias](/incidencias)\n- [Atascos activos](/atascos)\n- [Cortes de tráfico](/cortes-trafico)\n- [Alertas meteorológicas](/alertas-meteo)\n- [Cámaras de tráfico](/camaras/madrid)`);

  sections.push(`---\n\n*Datos: DGT (Dirección General de Tráfico).*`);

  const body = sections.join("\n\n");
  const summary = `${fmtInt(activeCount)} incidencias activas (${fmtPct(pctAbove)} sobre la media semanal). ${typeBreakdown[0] ? `Tipo dominante: ${INCIDENT_TYPE_NAMES[typeBreakdown[0].type] || typeBreakdown[0].type}.` : ""} ${topProvinces[0] ? `Provincia más afectada: ${topProvinces[0].name}.` : ""}`;

  const article = await prisma.article.create({
    data: {
      slug,
      title: `Pico de incidencias: ${fmtInt(activeCount)} activas (${fmtPct(pctAbove)} sobre la media)`,
      summary,
      body,
      category: "INCIDENT_DIGEST",
      source: "DGT",
      isAutoGenerated: true,
      editorialWeight: getEditorialWeight("INCIDENT_DIGEST"),
      readTime: estimateReadTime(body.length),
    },
  });

  await attachTags(prisma, article.id, [
    { slug: "incidencias", name: "Incidencias" },
    { slug: "pico-trafico", name: "Pico de tráfico" },
    { slug: "dgt", name: "DGT" },
  ]);

  return 1;
}
