import { Metadata } from "next";
import { notFound } from "next/navigation";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { ReportSummary } from "@/components/insights/ReportSummary";
import { renderMarkdown } from "@/lib/insights/render-markdown";
import { BarChart3 } from "lucide-react";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

type Props = { params: Promise<{ roadId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { roadId } = await params;
  const road = roadId.toUpperCase();
  return {
    title: `Intensidad de tráfico ${road} — Análisis IMD | trafico.live`,
    description: `Análisis de la Intensidad Media Diaria (IMD) en la ${road}: vehículos/día, porcentaje de pesados y evolución anual. Datos del Ministerio de Transportes.`,
    alternates: { canonical: `${BASE_URL}/analisis/carreteras/${roadId}` },
  };
}

export default async function AnalisisCarreteraPage({ params }: Props) {
  const { roadId } = await params;
  const road = roadId.toUpperCase();

  // Get all flow data for this road, grouped by year
  const flows = await prisma.trafficFlow.findMany({
    where: { roadNumber: road },
    orderBy: [{ year: "asc" }, { kmStart: "asc" }],
  });

  if (flows.length === 0) notFound();

  // Aggregate by year
  const byYear = new Map<number, { totalImd: number; segments: number; heavyPct: number; vhKm: number }>();
  for (const f of flows) {
    const existing = byYear.get(f.year) || { totalImd: 0, segments: 0, heavyPct: 0, vhKm: 0 };
    existing.totalImd += f.imd;
    existing.segments += 1;
    existing.heavyPct += Number(f.percentPesados || 0);
    existing.vhKm += Number(f.vhKmTotal || 0);
    byYear.set(f.year, existing);
  }

  const years = [...byYear.keys()].sort();
  const yearData = years.map((y) => {
    const d = byYear.get(y)!;
    return {
      year: y,
      avgImd: Math.round(d.totalImd / d.segments),
      avgHeavy: (d.heavyPct / d.segments).toFixed(1),
      totalVhKm: d.vhKm.toFixed(1),
      segments: d.segments,
    };
  });

  const latestYear = yearData[yearData.length - 1];
  const earliestYear = yearData[0];
  const imdTrend = earliestYear.avgImd > 0
    ? (((latestYear.avgImd - earliestYear.avgImd) / earliestYear.avgImd) * 100).toFixed(1)
    : "0";

  // Get top segments by IMD (busiest)
  const latestFlows = flows.filter((f) => f.year === years[years.length - 1]);
  const topSegments = latestFlows
    .sort((a, b) => b.imd - a.imd)
    .slice(0, 10);

  // Get provinces covered
  const provinces = [...new Set(flows.map((f) => f.provinceName).filter(Boolean))];

  const metrics = [
    {
      label: `IMD medio ${latestYear.year}`,
      value: latestYear.avgImd.toLocaleString("es-ES"),
      unit: "veh/día",
      highlight: true,
    },
    {
      label: "% pesados",
      value: `${latestYear.avgHeavy}%`,
    },
    {
      label: "Segmentos medidos",
      value: latestYear.segments.toString(),
    },
    {
      label: `Tendencia ${earliestYear.year}-${latestYear.year}`,
      value: `${Number(imdTrend) > 0 ? "+" : ""}${imdTrend}%`,
    },
  ];

  // Build body
  const yearTableHeader = "| Año | IMD medio | % pesados | Veh-km (M) | Segmentos |";
  const yearTableSep = "| --- | ---: | ---: | ---: | ---: |";
  const yearTableRows = yearData.map((d) =>
    `| ${d.year} | ${d.avgImd.toLocaleString("es-ES")} | ${d.avgHeavy}% | ${d.totalVhKm} | ${d.segments} |`
  );

  const segmentTableHeader = "| Tramo (km) | Provincia | IMD | % pesados |";
  const segmentTableSep = "| --- | --- | ---: | ---: |";
  const segmentTableRows = topSegments.map((s) =>
    `| km ${Number(s.kmStart).toFixed(0)}-${Number(s.kmEnd).toFixed(0)} | ${s.provinceName || "-"} | ${s.imd.toLocaleString("es-ES")} | ${s.percentPesados ? Number(s.percentPesados).toFixed(1) : "-"}% |`
  );

  const bodyMd = `## Intensidad Media Diaria en la ${road}

La **${road}** registra una **Intensidad Media Diaria (IMD) de ${latestYear.avgImd.toLocaleString("es-ES")} vehículos/día** (media de ${latestYear.segments} tramos medidos en ${latestYear.year}), con un **${latestYear.avgHeavy}% de vehículos pesados**.

${provinces.length > 0 ? `Atraviesa las provincias de ${provinces.join(", ")}.` : ""}

### Evolución anual

${yearTableHeader}
${yearTableSep}
${yearTableRows.join("\n")}

${Number(imdTrend) !== 0 ? `La intensidad de tráfico en la ${road} ${Number(imdTrend) > 0 ? `ha aumentado un **${imdTrend}%**` : `ha disminuido un **${Math.abs(Number(imdTrend))}%**`} entre ${earliestYear.year} y ${latestYear.year}.` : ""}

### Tramos con mayor tráfico (${latestYear.year})

${segmentTableHeader}
${segmentTableSep}
${segmentTableRows.join("\n")}

## Más información

- [Carretera ${road}](/carreteras/${road.toLowerCase()})
- [Radares en ${road}](/carreteras/${road.toLowerCase()}/radares)
- [Cámaras en ${road}](/carreteras/${road.toLowerCase()}/camaras)
- [Estaciones de aforo](/estaciones-aforo)

---

*Datos: Ministerio de Transportes y Movilidad Sostenible (MITMA). Mapas de tráfico ${years.join(", ")}.*`;

  const bodyHtml = renderMarkdown(bodyMd);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `Intensidad de tráfico ${road} — Análisis IMD`,
    description: `Análisis IMD de la ${road}.`,
    datePublished: new Date().toISOString(),
    publisher: {
      "@type": "Organization",
      name: "trafico.live",
      url: BASE_URL,
    },
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <StructuredData data={articleSchema} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Carreteras", href: "/carreteras" },
            { name: road, href: `/carreteras/${road.toLowerCase()}` },
            { name: "Análisis IMD", href: `/analisis/carreteras/${roadId}` },
          ]}
        />

        <header className="mb-8">
          <div className="flex items-center gap-2 text-sm text-tl-600 dark:text-tl-400 mb-2">
            <BarChart3 className="w-4 h-4" />
            <span>Análisis de intensidad de tráfico</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3 font-heading">
            Intensidad de tráfico en la {road}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Análisis de la Intensidad Media Diaria (IMD) con datos del MITMA
          </p>
        </header>

        <ReportSummary
          metrics={metrics}
          source="MITMA"
          updatedAt={`Datos ${years.join(", ")}`}
        />

        <article>
          <div
            className="prose-like space-y-4"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        </article>
      </main>
    </div>
  );
}
