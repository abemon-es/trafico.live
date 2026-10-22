import type { Metadata } from "next";
import Link from "next/link";
import { PROVINCES as INE_PROVINCES, PROVINCE_NAMES } from "@/lib/geo/ine-codes";
import { provinceSlug } from "@/lib/geo/slugify";
import {
  AlertTriangle,
  BarChart3,
  MapPin,
  TrendingDown,
  Shield,
} from "lucide-react";
import { VerticalHub } from "@/components/ui/VerticalHub";
import { FAQAccordion } from "@/components/ui/FAQAccordion";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { RelatedLinks } from "@/components/ui/RelatedLinks";
import { StructuredData } from "@/components/seo/StructuredData";
import { accidentYears, nationalFatalities, spanText, type YearSpan } from "@/lib/accident-years";

// 300: build-blank policy (2026-08-17). The years come from the database, and
// the Docker build has none, so the prerender says no range until it refreshes.
export const revalidate = 300;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// The years come from the database (src/lib/accident-years.ts): this page said
// «2011-2024» while the provinces held 2021–2023.
export async function generateMetadata(): Promise<Metadata> {
  const years = spanText((await accidentYears()).provincial);
  return {
    title: `Análisis de accidentes de tráfico por provincia — DGT${years ? ` ${years}` : ""}`,
    description: `Accidentes con víctimas, fallecidos y heridos por año en las 52 provincias españolas${years ? ` (${years})` : ""}. Datos oficiales de la DGT.`,
    alternates: { canonical: `${BASE_URL}/analisis/accidentes` },
    openGraph: {
      title: "Análisis de accidentes por provincia — trafico.live",
      description: `Siniestralidad vial en las 52 provincias: accidentes, fallecidos y heridos por año.${years ? ` Datos DGT ${years}.` : " Datos DGT."}`,
      url: `${BASE_URL}/analisis/accidentes`,
      siteName: "trafico.live",
      locale: "es_ES",
      type: "website",
    },
  };
}

const fromTo = (s: YearSpan) => (s.from === s.to ? `de ${s.from}` : `de ${s.from} a ${s.to}`);

/** «¿Desde cuándo hay datos?», answered with the years in the database. */
function yearsAnswer({ provincial, microdata }: { provincial: YearSpan | null; microdata: YearSpan | null }): string {
  const parts = [
    provincial ? `los datos anuales por provincia ${fromTo(provincial)}` : null,
    microdata ? `los microdatos de la DGT (un registro por accidente con víctimas) ${fromTo(microdata)}` : null,
  ].filter(Boolean);
  if (parts.length === 0) return "Los años disponibles se indican en la página de cada provincia.";
  return `trafico.live integra ${parts.join(" y ")}. Cada año nuevo se incorpora cuando la DGT publica su conjunto de datos oficial.`;
}

// The 52 provinces, linked straight to /estadisticas/accidentes/<slug> with
// the slug that route resolves (provinceSlug of the official name). This list
// used short slugs and /analisis/accidentes/<slug>, which 308s there: seven
// of them («valencia», «alicante»…) then ended in a 404.
const PROVINCES = INE_PROVINCES.map((p) => ({
  name: PROVINCE_NAMES[p.code] ?? p.name,
  slug: provinceSlug(p.name),
})).sort((a, b) => a.name.localeCompare(b.name, "es"));

/**
 * The fatalities trend from the database. It said «menos de 1.500 en 2023»;
 * the provinces add up to 1806 that year.
 */
function trendAnswer(rows: { year: number; fatalities: number }[]): string {
  const fmt = (n: number) => n.toLocaleString("es-ES");
  const first = rows[0];
  const last = rows[rows.length - 1];
  const tail = "El análisis provincial permite identificar las provincias donde la siniestralidad baja o donde se ha estancado.";
  if (!last) return tail;
  const since = first.year !== last.year ? `, frente a ${fmt(first.fatalities)} en ${first.year}` : "";
  return `En ${last.year} la DGT registró ${fmt(last.fatalities)} fallecidos en accidentes con víctimas en España${since}. ${tail}`;
}

const faqItems = (years: { provincial: YearSpan | null; microdata: YearSpan | null }, fatalities: { year: number; fatalities: number }[]) => [
  {
    question: "¿Qué información contienen los microdatos de la DGT?",
    answer:
      "Los microdatos de accidentalidad de la DGT incluyen, por cada accidente con víctimas en carretera: fecha, hora, tipo de vía, punto kilométrico, número de vehículos y personas implicadas, fallecidos, heridos graves y leves, y circunstancias del accidente (colisión frontal, salida de calzada, atropello…). Están anonimizados y se publican bajo licencia abierta CC-BY.",
  },
  {
    question: "¿Desde cuándo hay datos disponibles?",
    answer: yearsAnswer(years),
  },
  {
    question: "¿Por qué algunas provincias muestran más accidentes?",
    answer:
      "El número absoluto de accidentes está muy correlacionado con la densidad de población y la longitud de la red viaria. Para comparativas entre provincias es más útil la tasa de accidentalidad por millón de vehículos-km o por habitante, que se incluye en el análisis individual de cada provincia.",
  },
  {
    question: "¿Se incluyen accidentes en vías urbanas?",
    // Not «solo interurbanas»: the totals (101,306 accidents with victims in
    // 2023) are all roads. No split: AccidentMicrodata.isUrban is empty for
    // 64 % of rows (2023: 1,411 urban, 35,330 interurban, 64,565 unknown).
    answer: "Sí. Los datos de la DGT incluyen accidentes con víctimas en vías interurbanas y urbanas.",
  },
  {
    question: "¿Cómo interpretar la tendencia de fallecidos?",
    answer: trendAnswer(fatalities),
  },
];

const collectionSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Análisis de accidentes de tráfico por provincia",
  url: `${BASE_URL}/analisis/accidentes`,
  inLanguage: "es",
  about: { "@type": "Place", name: "España" },
  publisher: { "@type": "Organization", name: "trafico.live", url: BASE_URL },
  numberOfItems: PROVINCES.length,
  itemListElement: PROVINCES.map((p, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: p.name,
    url: `${BASE_URL}/estadisticas/accidentes/${p.slug}`,
  })),
};

export default async function AnalisisAccidentesHubPage() {
  const [years, fatalities] = await Promise.all([accidentYears(), nationalFatalities()]);
  const breadcrumbs = [
    { name: "Análisis", href: "/analisis" },
    { name: "Accidentes por provincia", href: "/analisis/accidentes" },
  ];

  const hero = (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 max-w-3xl">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-tl-600 dark:text-tl-400">
          <AlertTriangle className="w-4 h-4" />
          trafico.live · Análisis · Accidentes
        </span>
        <h1 className="text-4xl md:text-5xl font-heading font-bold text-gray-900 dark:text-gray-50 leading-tight">
          Análisis de accidentes por provincia
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
          Evolución de la siniestralidad vial en las 52 provincias españolas. Consulta el número
          de accidentes con víctimas, fallecidos y heridos hospitalizados
          {years.provincial ? ` ${fromTo(years.provincial)}` : " por año"}. Datos oficiales de la
          Dirección General de Tráfico (DGT).
        </p>
      </div>
    </div>
  );

  const sections = [
    {
      id: "provincias",
      title: "Selecciona una provincia",
      description: "52 provincias españolas con análisis histórico de accidentalidad.",
      content: (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {PROVINCES.map((prov) => (
            <Link
              key={prov.slug}
              href={`/estadisticas/accidentes/${prov.slug}`}
              className="group flex items-center gap-2 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-tl-400 dark:hover:border-tl-500 hover:shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tl-600"
            >
              <MapPin className="w-3.5 h-3.5 shrink-0 text-tl-500 dark:text-tl-400" aria-hidden="true" />
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate group-hover:text-tl-700 dark:group-hover:text-tl-300">
                {prov.name}
              </span>
            </Link>
          ))}
        </div>
      ),
    },
    {
      id: "related",
      title: "Más análisis",
      description: "Explora otras herramientas relacionadas.",
      content: (
        <RelatedLinks
          columns={3}
          title=""
          items={[
            {
              title: "Análisis por carretera",
              description: "IMD y tráfico de vehículos pesados en autopistas y carreteras nacionales.",
              href: "/analisis/carreteras",
              icon: BarChart3,
            },
            {
              title: "Inteligencia: hora punta y accidentes",
              description: "Correlación entre picos de tráfico y siniestralidad. Análisis data-driven.",
              href: "/inteligencia/hora-punta-y-accidentes",
              icon: TrendingDown,
            },
            {
              title: "Inteligencia: lluvia y accidentes",
              description: "Impacto de la precipitación sobre la accidentalidad vial en España.",
              href: "/inteligencia/lluvia-y-accidentes",
              icon: Shield,
            },
          ]}
        />
      ),
    },
  ];

  const faq = (
    <FAQAccordion items={faqItems(years, fatalities)} title="Preguntas frecuentes — accidentes de tráfico" />
  );

  return (
    <>
      <StructuredData data={[collectionSchema]} />
      <VerticalHub
        breadcrumbs={<Breadcrumbs items={breadcrumbs} />}
        hero={hero}
        sections={sections}
        faq={faq}
      />
    </>
  );
}
