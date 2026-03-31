/**
 * Road IMD (Intensidad Media Diaria) Analysis Generator
 *
 * Creates one ROAD_ANALYSIS Article per road that has TrafficFlow data.
 * Limited to top 100 roads by IMD to avoid thin-content pages.
 *
 * Slug: intensidad-trafico-{road.toLowerCase()}-{latestYear}
 * e.g.: intensidad-trafico-a-1-2019
 */

import { PrismaClient, ArticleCategory } from "@prisma/client";
import {
  attachTags,
  fmtPct,
  fmtInt,
  getEditorialWeight,
  estimateReadTime,
  mdTable,
} from "./shared";

export async function generateRoadIMDAnalyses(prisma: PrismaClient): Promise<number> {
  // Get distinct road numbers present in TrafficFlow
  const distinctRoads = await prisma.trafficFlow.findMany({
    distinct: ["roadNumber"],
    select: { roadNumber: true },
    orderBy: { roadNumber: "asc" },
  });
  if (distinctRoads.length === 0) return 0;

  // Determine the latest year in the dataset (one global query)
  const latestYearRow = await prisma.trafficFlow.findFirst({
    orderBy: { year: "desc" },
    select: { year: true },
  });
  if (!latestYearRow) return 0;
  const latestYear = latestYearRow.year;

  // Compute average IMD per road for the latest year to rank them
  // We aggregate in-memory after fetching avg per road
  interface RoadAvgIMD {
    roadNumber: string;
    avgIMD: number;
  }

  const roadIMDs: RoadAvgIMD[] = [];
  for (const { roadNumber } of distinctRoads) {
    const agg = await prisma.trafficFlow.aggregate({
      where: { roadNumber, year: latestYear },
      _avg: { imd: true },
    });
    if (agg._avg.imd != null) {
      roadIMDs.push({ roadNumber, avgIMD: Number(agg._avg.imd) });
    }
  }

  // Top 100 roads by latest-year average IMD
  const top100 = roadIMDs
    .sort((a, b) => b.avgIMD - a.avgIMD)
    .slice(0, 100);

  if (top100.length === 0) return 0;

  let created = 0;

  for (const { roadNumber } of top100) {
    const roadSlug = roadNumber.toLowerCase().replace(/\s+/g, "-");
    const slug = `intensidad-trafico-${roadSlug}-${latestYear}`;

    const existing = await prisma.article.findUnique({ where: { slug } });
    if (existing) continue;

    // All TrafficFlow rows for this road, all years
    const allRows = await prisma.trafficFlow.findMany({
      where: { roadNumber },
      orderBy: [{ year: "asc" }, { kmStart: "asc" }],
      select: {
        year: true,
        imd: true,
        imdLigeros: true,
        imdPesados: true,
        percentPesados: true,
        vhKmTotal: true,
        segmentLength: true,
        kmStart: true,
        kmEnd: true,
        province: true,
        provinceName: true,
      },
    });
    if (allRows.length === 0) continue;

    // ── Year-over-year aggregates ─────────────────────────────────────────
    interface YearAgg {
      year: number;
      avgIMD: number;
      avgHeavyPct: number;
      vhKmTotalM: number; // millions
      segmentCount: number;
    }

    const yearMap = new Map<number, { imd: number[]; heavy: number[]; vhKm: number; count: number }>();
    for (const r of allRows) {
      const entry = yearMap.get(r.year) ?? { imd: [], heavy: [], vhKm: 0, count: 0 };
      if (r.imd != null) entry.imd.push(Number(r.imd));
      if (r.percentPesados != null) entry.heavy.push(Number(r.percentPesados));
      entry.vhKm += r.vhKmTotal ? Number(r.vhKmTotal) : 0;
      entry.count++;
      yearMap.set(r.year, entry);
    }

    const yearAggs: YearAgg[] = Array.from(yearMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([year, e]) => ({
        year,
        avgIMD: e.imd.length > 0 ? e.imd.reduce((s, v) => s + v, 0) / e.imd.length : 0,
        avgHeavyPct: e.heavy.length > 0 ? e.heavy.reduce((s, v) => s + v, 0) / e.heavy.length : 0,
        vhKmTotalM: e.vhKm / 1_000_000,
        segmentCount: e.count,
      }));

    const latestAgg = yearAggs.find((y) => y.year === latestYear) ?? yearAggs[yearAggs.length - 1];

    // ── Top 10 busiest segments for latest year ───────────────────────────
    const latestSegments = allRows
      .filter((r) => r.year === latestYear && r.imd != null)
      .sort((a, b) => Number(b.imd) - Number(a.imd))
      .slice(0, 10);

    // ── Provinces covered ─────────────────────────────────────────────────
    const provinceSet = new Set<string>();
    for (const r of allRows) {
      if (r.provinceName) provinceSet.add(r.provinceName);
    }
    const provinces = Array.from(provinceSet).sort();

    // ── Year-over-year table ──────────────────────────────────────────────
    const yoyRows = yearAggs.map((y) => [
      String(y.year),
      fmtInt(Math.round(y.avgIMD)),
      `${y.avgHeavyPct.toFixed(1)}%`,
      y.vhKmTotalM.toFixed(1),
      fmtInt(y.segmentCount),
    ]);

    // ── Top 10 segments table ─────────────────────────────────────────────
    const segmentRows = latestSegments.map((r) => [
      `${r.kmStart != null ? `p.k. ${Number(r.kmStart).toFixed(0)}` : "—"}–${r.kmEnd != null ? Number(r.kmEnd).toFixed(0) : "—"}`,
      r.provinceName ?? r.province ?? "—",
      fmtInt(Math.round(Number(r.imd ?? 0))),
      r.percentPesados != null ? `${Number(r.percentPesados).toFixed(1)}%` : "N/D",
    ]);

    // ── Build body ────────────────────────────────────────────────────────
    const sections: string[] = [];

    sections.push(
      `## Intensidad de tráfico en la ${roadNumber} — ${latestYear}\n\n` +
      `La **${roadNumber}** registra una **IMD de ${fmtInt(Math.round(latestAgg.avgIMD))} vehículos/día** ` +
      `con un ${latestAgg.avgHeavyPct.toFixed(1)}% de pesados según los datos del MITMA para ${latestYear}.`
    );

    // YoY table
    sections.push(
      `### Evolución anual — ${yearAggs[0]?.year ?? ""}–${latestYear}\n\n` +
      mdTable(
        ["Año", "IMD medio", "% pesados", "Veh-km (M)", "Segmentos"],
        yoyRows,
        ["center", "right", "right", "right", "right"]
      )
    );

    // Top 10 segments
    if (segmentRows.length > 0) {
      sections.push(
        `### Tramos más cargados (${latestYear})\n\n` +
        mdTable(
          ["Tramo (p.k.)", "Provincia", "IMD", "% pesados"],
          segmentRows,
          ["left", "left", "right", "right"]
        )
      );
    }

    // Provinces
    if (provinces.length > 0) {
      sections.push(
        `### Provincias recorridas\n\n` +
        `La **${roadNumber}** atraviesa las siguientes provincias: **${provinces.join(", ")}**.`
      );
    }

    // Links
    sections.push(
      `### Más información\n\n` +
      `- [Ficha de la carretera ${roadNumber}](/carreteras/${roadSlug})\n` +
      `- [Análisis de IMD por carretera](/analisis/carreteras/${roadSlug})\n` +
      `- [Mapa de incidencias en tiempo real](/incidencias)\n\n` +
      `---\n\n*Fuente: MITMA — Mapa de Tráfico. Datos de Intensidad Media Diaria (IMD) ${latestYear}.*`
    );

    const body = sections.join("\n\n");

    const title =
      `Intensidad de tráfico en la ${roadNumber} (${latestYear}): IMD de ${fmtInt(Math.round(latestAgg.avgIMD))} veh/día`;
    const summary =
      `La ${roadNumber} registra una IMD media de ${fmtInt(Math.round(latestAgg.avgIMD))} veh/día ` +
      `(${latestAgg.avgHeavyPct.toFixed(1)}% pesados) en ${latestYear}. ` +
      `${yearAggs.length} años de histórico disponibles. ` +
      `Recorre ${provinces.slice(0, 4).join(", ")}${provinces.length > 4 ? ` y ${provinces.length - 4} provincias más` : ""}.`;

    const category: ArticleCategory = "ROAD_ANALYSIS";

    const article = await prisma.article.create({
      data: {
        slug,
        title,
        summary,
        body,
        category,
        source: "MITMA",
        isAutoGenerated: true,
        readTime: estimateReadTime(body.length),
        editorialWeight: getEditorialWeight(category),
      },
    });

    await attachTags(prisma, article.id, [
      { slug: "intensidad-trafico", name: "Intensidad de tráfico" },
      { slug: "imd", name: "IMD" },
      { slug: roadSlug, name: roadNumber },
    ]);

    created++;
  }

  return created;
}
