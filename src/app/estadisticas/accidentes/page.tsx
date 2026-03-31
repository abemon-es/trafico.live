import { Metadata } from "next";
import dynamic from "next/dynamic";
import { prisma } from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { AccidentesClient } from "./AccidentesClient";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const revalidate = 3600;

// ─── Metadata ──────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Accidentes de Tráfico en España — Estadísticas Históricas | DGT",
  description:
    "Estadísticas históricas de accidentes de tráfico en España por provincia y año. " +
    "Datos oficiales de la DGT: víctimas mortales, heridos hospitalizados y tasa de mortalidad desde 2011.",
  alternates: {
    canonical: `${BASE_URL}/estadisticas/accidentes`,
  },
  openGraph: {
    title: "Accidentes de Tráfico en España — Estadísticas Históricas",
    description:
      "Análisis por provincia y año de la siniestralidad vial española con datos oficiales de la DGT.",
    url: `${BASE_URL}/estadisticas/accidentes`,
    type: "website",
  },
};

// ─── Data fetching (server side) ──────────────────────────────────────────────

async function fetchStats() {
  // All years time series
  const yearlyAgg = await prisma.historicalAccidents.groupBy({
    by: ["year"],
    _sum: {
      accidents: true,
      fatalities: true,
      hospitalized: true,
    },
    orderBy: { year: "asc" },
  });

  const yearly = yearlyAgg.map((r) => ({
    year: r.year,
    accidents: r._sum.accidents ?? 0,
    fatalities: r._sum.fatalities ?? 0,
    hospitalized: r._sum.hospitalized ?? 0,
  }));

  const availableYears = yearly.map((r) => r.year);
  const latestYear =
    availableYears.length > 0
      ? availableYears[availableYears.length - 1]
      : new Date().getFullYear();

  // Province breakdown for latest year
  const provinceAgg = await prisma.historicalAccidents.groupBy({
    by: ["province", "provinceName"],
    where: { year: latestYear },
    _sum: {
      accidents: true,
      fatalities: true,
      hospitalized: true,
    },
    orderBy: { _sum: { accidents: "desc" } },
  });

  // Population for rate calculation
  const provinces = await prisma.province.findMany({
    select: { code: true, name: true, population: true },
  });
  const popMap = new Map(provinces.map((p) => [p.code, p.population ?? 0]));

  const byProvince = provinceAgg.map((r) => {
    const accidents = r._sum.accidents ?? 0;
    const fatalities = r._sum.fatalities ?? 0;
    const population = popMap.get(r.province) ?? 0;
    const rate =
      accidents > 0
        ? parseFloat(((fatalities / accidents) * 100).toFixed(2))
        : 0;
    const ratePer100k =
      population > 0
        ? parseFloat(((fatalities / population) * 100000).toFixed(2))
        : 0;
    return {
      province: r.province,
      provinceName: r.provinceName ?? r.province,
      accidents,
      fatalities,
      hospitalized: r._sum.hospitalized ?? 0,
      rate,
      ratePer100k,
    };
  });

  // Latest year totals (key stats cards)
  const totals = yearly.find((r) => r.year === latestYear) ?? {
    year: latestYear,
    accidents: 0,
    fatalities: 0,
    hospitalized: 0,
  };

  const fatalityRate =
    totals.accidents > 0
      ? ((totals.fatalities / totals.accidents) * 100).toFixed(2)
      : "0.00";

  // YoY change
  const prevYear = yearly.find((r) => r.year === latestYear - 1);
  const yoyAccidents =
    prevYear && prevYear.accidents > 0
      ? (((totals.accidents - prevYear.accidents) / prevYear.accidents) * 100).toFixed(1)
      : null;

  return {
    yearly,
    byProvince,
    totals,
    fatalityRate,
    yoyAccidents,
    latestYear,
    availableYears,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AccidentesPage() {
  const stats = await fetchStats();

  // JSON-LD Dataset schema
  const datasetSchema = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Estadísticas de Accidentes de Tráfico en España",
    description:
      "Serie histórica de accidentes de tráfico en España por provincia, " +
      "incluyendo víctimas mortales, heridos hospitalizados y tasas de siniestralidad.",
    url: `${BASE_URL}/estadisticas/accidentes`,
    creator: {
      "@type": "GovernmentOrganization",
      name: "Dirección General de Tráfico (DGT)",
      url: "https://www.dgt.es",
    },
    publisher: {
      "@type": "Organization",
      name: "trafico.live",
      url: BASE_URL,
    },
    temporalCoverage:
      stats.availableYears.length > 0
        ? `${stats.availableYears[0]}/${stats.latestYear}`
        : String(stats.latestYear),
    spatialCoverage: {
      "@type": "Place",
      name: "España",
    },
    license: "https://datos.gob.es/es/noticia/licencia-de-uso",
    variableMeasured: [
      "Número de accidentes con víctimas",
      "Número de víctimas mortales",
      "Número de heridos hospitalizados",
    ],
    distribution: [
      {
        "@type": "DataDownload",
        encodingFormat: "application/json",
        contentUrl: `${BASE_URL}/api/historical/stats`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetSchema) }}
      />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Breadcrumbs */}
          <Breadcrumbs
            items={[
              { name: "Inicio", href: "/" },
              { name: "Estadísticas", href: "/estadisticas" },
              { name: "Accidentes", href: "/estadisticas/accidentes" },
            ]}
          />

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-heading font-bold text-gray-900 dark:text-gray-50 leading-tight">
              Accidentes de Tráfico en España
              <span className="block text-xl sm:text-2xl font-normal text-gray-500 dark:text-gray-400 mt-1">
                Estadísticas Históricas
              </span>
            </h1>
            <p className="mt-3 text-base text-gray-600 dark:text-gray-400 max-w-3xl">
              Serie histórica de siniestralidad vial en España por año y provincia. Datos
              oficiales procedentes de{" "}
              <a
                href="https://www.dgt.es"
                target="_blank"
                rel="noopener noreferrer"
                className="text-tl-600 dark:text-tl-400 hover:underline"
              >
                DGT en Cifras
              </a>
              , actualizados anualmente.
            </p>
          </div>

          {/* Client component handles all interactive sections */}
          <AccidentesClient {...stats} />
        </div>
      </div>
    </>
  );
}
