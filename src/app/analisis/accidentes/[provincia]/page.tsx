import { Metadata } from "next";
import { notFound } from "next/navigation";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { ReportSummary } from "@/components/insights/ReportSummary";
import { renderMarkdown } from "@/lib/insights/render-markdown";
import { Calendar, BarChart3 } from "lucide-react";
import Link from "next/link";

export const revalidate = 86400; // 24h — evergreen content

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

type Props = { params: Promise<{ provincia: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { provincia } = await params;
  const prov = await prisma.province.findFirst({
    where: { slug: provincia },
    select: { name: true, code: true },
  });
  if (!prov) return { title: "Provincia no encontrada" };

  return {
    title: `Accidentes de tráfico en ${prov.name} — Histórico 2011-2024 | trafico.live`,
    description: `Evolución de la siniestralidad vial en ${prov.name}: accidentes, fallecidos y heridos desde 2011 hasta 2024. Datos oficiales de la DGT con análisis de tendencias.`,
    alternates: { canonical: `${BASE_URL}/analisis/accidentes/${provincia}` },
    openGraph: {
      title: `Accidentes de tráfico en ${prov.name} — Histórico 2011-2024`,
      description: `Análisis de siniestralidad vial en ${prov.name} con datos oficiales de la DGT.`,
      url: `${BASE_URL}/analisis/accidentes/${provincia}`,
      siteName: "trafico.live",
      type: "article",
    },
  };
}

export async function generateStaticParams() {
  const provinces = await prisma.province.findMany({
    select: { slug: true },
  });
  return provinces.map((p) => ({ provincia: p.slug }));
}

export default async function AnalisisAccidentesPage({ params }: Props) {
  const { provincia } = await params;
  const prov = await prisma.province.findFirst({
    where: { slug: provincia },
    select: { name: true, code: true, population: true },
  });
  if (!prov) notFound();

  // Get historical data for this province
  const data = await prisma.historicalAccidents.findMany({
    where: { province: prov.code, roadType: null },
    orderBy: { year: "asc" },
  });

  if (data.length === 0) notFound();

  // Compute stats
  const latest = data[data.length - 1];
  const earliest = data[0];
  const totalAccidents = data.reduce((s, d) => s + d.accidents, 0);
  const totalFatalities = data.reduce((s, d) => s + d.fatalities, 0);
  const fatalityRate = latest.accidents > 0
    ? ((latest.fatalities / latest.accidents) * 100).toFixed(2)
    : "0";
  const accidentTrend = earliest.accidents > 0
    ? (((latest.accidents - earliest.accidents) / earliest.accidents) * 100).toFixed(1)
    : "0";

  // National totals for comparison
  const nationalLatest = await prisma.historicalAccidents.aggregate({
    where: { year: latest.year, roadType: null },
    _sum: { accidents: true, fatalities: true },
  });
  const nationalFatalityRate = nationalLatest._sum.accidents && nationalLatest._sum.fatalities
    ? ((nationalLatest._sum.fatalities / nationalLatest._sum.accidents) * 100).toFixed(2)
    : null;

  const metrics = [
    {
      label: `Accidentes ${latest.year}`,
      value: latest.accidents.toLocaleString("es-ES"),
      change: data.length >= 2
        ? ((latest.accidents - data[data.length - 2].accidents) / data[data.length - 2].accidents) * 100
        : undefined,
      highlight: true,
    },
    {
      label: `Fallecidos ${latest.year}`,
      value: latest.fatalities.toLocaleString("es-ES"),
      change: data.length >= 2
        ? ((latest.fatalities - data[data.length - 2].fatalities) / data[data.length - 2].fatalities) * 100
        : undefined,
    },
    {
      label: "Tasa mortalidad",
      value: `${fatalityRate}%`,
      context: nationalFatalityRate ? `Nacional: ${nationalFatalityRate}%` : undefined,
    },
    {
      label: `Tendencia ${earliest.year}-${latest.year}`,
      value: `${Number(accidentTrend) > 0 ? "+" : ""}${accidentTrend}%`,
    },
  ];

  // Build body markdown with table
  const tableHeader = "| Año | Accidentes | Fallecidos | Hospitalizados | Tasa mortalidad |";
  const tableSep = "| --- | ---: | ---: | ---: | ---: |";
  const tableRows = data.map((d) => {
    const rate = d.accidents > 0 ? ((d.fatalities / d.accidents) * 100).toFixed(2) : "0";
    return `| ${d.year} | ${d.accidents.toLocaleString("es-ES")} | ${d.fatalities.toLocaleString("es-ES")} | ${d.hospitalized.toLocaleString("es-ES")} | ${rate}% |`;
  });

  const bodyMd = `## Evolución de la siniestralidad vial en ${prov.name}

Desde ${earliest.year} hasta ${latest.year}, ${prov.name} ha registrado un total de **${totalAccidents.toLocaleString("es-ES")} accidentes de tráfico** con **${totalFatalities.toLocaleString("es-ES")} fallecidos**.

${tableHeader}
${tableSep}
${tableRows.join("\n")}

## Análisis de tendencia

La siniestralidad en ${prov.name} ${Number(accidentTrend) < 0 ? `ha disminuido un **${Math.abs(Number(accidentTrend))}%**` : `ha aumentado un **${accidentTrend}%**`} entre ${earliest.year} y ${latest.year}. La tasa de mortalidad actual es del **${fatalityRate}%**${nationalFatalityRate ? ` frente a la media nacional del **${nationalFatalityRate}%**` : ""}.

### Datos anuales detallados

- **Año con más accidentes:** ${data.reduce((max, d) => d.accidents > max.accidents ? d : max, data[0]).year} (${data.reduce((max, d) => d.accidents > max.accidents ? d : max, data[0]).accidents.toLocaleString("es-ES")})
- **Año con menos accidentes:** ${data.reduce((min, d) => d.accidents < min.accidents ? d : min, data[0]).year} (${data.reduce((min, d) => d.accidents < min.accidents ? d : min, data[0]).accidents.toLocaleString("es-ES")})
- **Total fallecidos (${earliest.year}-${latest.year}):** ${totalFatalities.toLocaleString("es-ES")}

## Más información

- [Estadísticas de accidentes](/estadisticas/accidentes)
- [Tráfico en ${prov.name}](/provincias/${prov.code})
- [Radares en ${prov.name}](/radares)

---

*Datos: DGT (Dirección General de Tráfico). Última actualización: ${latest.year}.*`;

  const bodyHtml = renderMarkdown(bodyMd);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `Accidentes de tráfico en ${prov.name} — Histórico ${earliest.year}-${latest.year}`,
    description: `Evolución de siniestralidad vial en ${prov.name}.`,
    datePublished: new Date().toISOString(),
    dateModified: new Date().toISOString(),
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
            { name: "Análisis", href: "/analisis/accidentes" },
            { name: prov.name, href: `/analisis/accidentes/${provincia}` },
          ]}
        />

        <header className="mb-8">
          <div className="flex items-center gap-2 text-sm text-tl-600 dark:text-tl-400 mb-2">
            <BarChart3 className="w-4 h-4" />
            <span>Análisis de siniestralidad</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3 font-heading">
            Accidentes de tráfico en {prov.name}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Evolución {earliest.year}–{latest.year} con datos oficiales de la DGT
          </p>
        </header>

        <ReportSummary
          metrics={metrics}
          source="DGT"
          updatedAt={`Datos hasta ${latest.year}`}
        />

        <article>
          <div
            className="prose-like space-y-4"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        </article>

        {/* Province navigation */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Otras provincias
          </h2>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/estadisticas/accidentes"
              className="text-sm px-3 py-1.5 rounded-full bg-tl-50 dark:bg-tl-950/30 text-tl-700 dark:text-tl-300 hover:bg-tl-100 dark:hover:bg-tl-900/30 transition-colors"
            >
              Ver todas las provincias →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
