/**
 * Annual Provincial Accident Report Generator
 *
 * Creates one ANNUAL_REPORT Article per province using 14 years
 * of HistoricalAccidents data (2011–2024). Runs for all provinces
 * that have historical data; skips any province already covered
 * by a current-year report.
 *
 * Slug: accidentalidad-{province_slug}-{latestYear}
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

export async function generateAnnualAccidentReports(prisma: PrismaClient): Promise<number> {
  // Determine the latest year present in the dataset
  const latestYearRow = await prisma.historicalAccidents.findFirst({
    where: { roadType: null },
    orderBy: { year: "desc" },
    select: { year: true },
  });
  if (!latestYearRow) return 0;
  const latestYear = latestYearRow.year;

  // Get all province codes that have historical data (roadType=null rows)
  const provinceCodes = await prisma.historicalAccidents.findMany({
    where: { roadType: null },
    distinct: ["province"],
    select: { province: true },
    orderBy: { province: "asc" },
  });
  if (provinceCodes.length === 0) return 0;

  // National totals for the latest year (for comparison)
  const nationalLatest = await prisma.historicalAccidents.aggregate({
    where: { year: latestYear, roadType: null },
    _sum: { accidents: true, fatalities: true, hospitalized: true, nonHospitalized: true },
  });
  const nationalAccidents = nationalLatest._sum.accidents ?? 0;
  const nationalFatalities = nationalLatest._sum.fatalities ?? 0;
  const nationalFatalityRate =
    nationalAccidents > 0 ? (nationalFatalities / nationalAccidents) * 100 : 0;

  let created = 0;

  for (const { province: provinceCode } of provinceCodes) {
    const slug = `accidentalidad-${provinceCode}-${latestYear}`;

    // Skip if article already exists for this province + year
    const existing = await prisma.article.findUnique({ where: { slug } });
    if (existing) continue;

    // Fetch province info for slug + name
    const provinceRow = await prisma.province.findUnique({
      where: { code: provinceCode },
      select: { slug: true, name: true },
    });
    const provinceSlug = provinceRow?.slug ?? provinceCode.toLowerCase();
    const provinceName = provinceRow?.name ?? provinceCode;

    // Full historical series (roadType=null only)
    const history = await prisma.historicalAccidents.findMany({
      where: { province: provinceCode, roadType: null },
      orderBy: { year: "asc" },
      select: { year: true, accidents: true, fatalities: true, hospitalized: true, nonHospitalized: true },
    });
    if (history.length === 0) continue;

    const firstYear = history[0].year;
    const lastRecord = history[history.length - 1];
    const firstRecord = history[0];

    const totalAccidents = history.reduce((s, r) => s + (r.accidents ?? 0), 0);
    const totalFatalities = history.reduce((s, r) => s + (r.fatalities ?? 0), 0);

    // % change first→last year (accidents)
    const accidentChange =
      firstRecord.accidents && firstRecord.accidents > 0
        ? ((( lastRecord.accidents ?? 0) - firstRecord.accidents) / firstRecord.accidents) * 100
        : null;

    // Province fatality rate (latest year)
    const provFatalityRate =
      (lastRecord.accidents ?? 0) > 0
        ? (((lastRecord.fatalities ?? 0) / lastRecord.accidents!) * 100)
        : 0;

    // Notable years
    const mostAccidents = history.reduce((best, r) =>
      (r.accidents ?? 0) > (best.accidents ?? 0) ? r : best
    );
    const leastAccidents = history.reduce((best, r) =>
      (r.accidents ?? 0) < (best.accidents ?? 0) ? r : best
    );

    // ── Historical table ──────────────────────────────────────────────────
    const tableRows = history.map((r) => {
      const mortality =
        (r.accidents ?? 0) > 0
          ? `${(((r.fatalities ?? 0) / r.accidents!) * 100).toFixed(2)}%`
          : "N/D";
      return [
        String(r.year),
        fmtInt(r.accidents ?? 0),
        fmtInt(r.fatalities ?? 0),
        fmtInt(r.hospitalized ?? 0),
        mortality,
      ];
    });

    // ── Build body ────────────────────────────────────────────────────────
    const sections: string[] = [];

    sections.push(
      `## Accidentalidad en ${provinceName}: evolución ${firstYear}–${latestYear}\n\n` +
      `Desde **${firstYear}** hasta **${latestYear}**, ${provinceName} ha registrado **${fmtInt(totalAccidents)} accidentes** ` +
      `con **${fmtInt(totalFatalities)} fallecidos** en sus carreteras según datos de la DGT.`
    );

    // Year-by-year table
    sections.push(
      `### Evolución histórica ${firstYear}–${latestYear}\n\n` +
      mdTable(
        ["Año", "Accidentes", "Fallecidos", "Hospitalizados", "Tasa mortalidad"],
        tableRows,
        ["center", "right", "right", "right", "right"]
      )
    );

    // Trend analysis
    const trendLines: string[] = [];
    if (accidentChange !== null) {
      const direction = accidentChange < 0 ? "reducido" : "aumentado";
      trendLines.push(
        `Entre ${firstYear} y ${latestYear}, el número de accidentes se ha **${direction} un ${fmtPct(Math.abs(accidentChange))}** ` +
        `(de ${fmtInt(firstRecord.accidents ?? 0)} a ${fmtInt(lastRecord.accidents ?? 0)}).`
      );
    }

    const rateComparison =
      provFatalityRate > nationalFatalityRate
        ? `por encima de la media nacional (${nationalFatalityRate.toFixed(2)}%)`
        : `por debajo de la media nacional (${nationalFatalityRate.toFixed(2)}%)`;
    trendLines.push(
      `En ${latestYear}, la tasa de mortalidad en ${provinceName} fue del **${provFatalityRate.toFixed(2)}%**, ` +
      `${rateComparison} (${fmtInt(nationalAccidents)} accidentes y ${fmtInt(nationalFatalities)} fallecidos en España).`
    );

    sections.push(`### Tendencia y comparativa nacional\n\n${trendLines.join(" ")}`);

    // Notable years
    sections.push(
      `### Años destacados\n\n` +
      `- **Año con más accidentes:** ${mostAccidents.year} — ${fmtInt(mostAccidents.accidents ?? 0)} accidentes ` +
      `(${fmtInt(mostAccidents.fatalities ?? 0)} fallecidos)\n` +
      `- **Año con menos accidentes:** ${leastAccidents.year} — ${fmtInt(leastAccidents.accidents ?? 0)} accidentes ` +
      `(${fmtInt(leastAccidents.fatalities ?? 0)} fallecidos)`
    );

    // Links
    sections.push(
      `### Más información\n\n` +
      `- [Estadísticas nacionales de accidentalidad](/estadisticas/accidentes)\n` +
      `- [Información de la provincia de ${provinceName}](/provincias/${provinceCode})\n` +
      `- [Análisis completo por provincia](/analisis/accidentes/${provinceSlug})\n\n` +
      `---\n\n*Fuente: DGT (Dirección General de Tráfico). Datos definitivos ${firstYear}–${latestYear}.*`
    );

    const body = sections.join("\n\n");

    const title = `Accidentalidad en ${provinceName} (${firstYear}–${latestYear}): ${fmtInt(totalAccidents)} accidentes y ${fmtInt(totalFatalities)} fallecidos`;
    const summary =
      `Análisis histórico de la accidentalidad en ${provinceName} entre ${firstYear} y ${latestYear}. ` +
      `Total: ${fmtInt(totalAccidents)} accidentes y ${fmtInt(totalFatalities)} fallecidos. ` +
      `En ${latestYear}: ${fmtInt(lastRecord.accidents ?? 0)} accidentes, tasa de mortalidad ${provFatalityRate.toFixed(2)}%.`;

    const category: ArticleCategory = "ANNUAL_REPORT";

    const article = await prisma.article.create({
      data: {
        slug,
        title,
        summary,
        body,
        category,
        source: "DGT",
        province: provinceCode,
        isAutoGenerated: true,
        readTime: estimateReadTime(body.length),
        editorialWeight: getEditorialWeight(category),
      },
    });

    await attachTags(prisma, article.id, [
      { slug: "accidentalidad", name: "Accidentalidad" },
      { slug: "seguridad-vial", name: "Seguridad vial" },
      { slug: provinceSlug, name: provinceName },
    ]);

    created++;
  }

  return created;
}
