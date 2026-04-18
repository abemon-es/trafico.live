import type { Metadata } from "next";
import Link from "next/link";
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

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Análisis de accidentes de tráfico por provincia — DGT 2011-2024",
  description:
    "Evolución histórica de accidentes, fallecidos y heridos en las 52 provincias españolas. Datos oficiales de la DGT con microdatos por año, tipo de vía y condiciones meteorológicas.",
  alternates: { canonical: `${BASE_URL}/analisis/accidentes` },
  openGraph: {
    title: "Análisis de accidentes por provincia — trafico.live",
    description:
      "Siniestralidad vial histórica en las 52 provincias. Datos DGT 2011-2024 con tendencias, fallecidos y análisis por tipo de vía.",
    url: `${BASE_URL}/analisis/accidentes`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

// 52 Spanish provinces with their URL slugs
const PROVINCES = [
  { name: "Álava", slug: "alava" },
  { name: "Albacete", slug: "albacete" },
  { name: "Alicante", slug: "alicante" },
  { name: "Almería", slug: "almeria" },
  { name: "Asturias", slug: "asturias" },
  { name: "Ávila", slug: "avila" },
  { name: "Badajoz", slug: "badajoz" },
  { name: "Baleares", slug: "baleares" },
  { name: "Barcelona", slug: "barcelona" },
  { name: "Burgos", slug: "burgos" },
  { name: "Cáceres", slug: "caceres" },
  { name: "Cádiz", slug: "cadiz" },
  { name: "Cantabria", slug: "cantabria" },
  { name: "Castellón", slug: "castellon" },
  { name: "Ceuta", slug: "ceuta" },
  { name: "Ciudad Real", slug: "ciudad-real" },
  { name: "Córdoba", slug: "cordoba" },
  { name: "A Coruña", slug: "a-coruna" },
  { name: "Cuenca", slug: "cuenca" },
  { name: "Gipuzkoa", slug: "gipuzkoa" },
  { name: "Girona", slug: "girona" },
  { name: "Granada", slug: "granada" },
  { name: "Guadalajara", slug: "guadalajara" },
  { name: "Huelva", slug: "huelva" },
  { name: "Huesca", slug: "huesca" },
  { name: "Jaén", slug: "jaen" },
  { name: "León", slug: "leon" },
  { name: "Lleida", slug: "lleida" },
  { name: "Lugo", slug: "lugo" },
  { name: "Madrid", slug: "madrid" },
  { name: "Málaga", slug: "malaga" },
  { name: "Melilla", slug: "melilla" },
  { name: "Murcia", slug: "murcia" },
  { name: "Navarra", slug: "navarra" },
  { name: "Ourense", slug: "ourense" },
  { name: "Palencia", slug: "palencia" },
  { name: "Las Palmas", slug: "las-palmas" },
  { name: "Pontevedra", slug: "pontevedra" },
  { name: "La Rioja", slug: "la-rioja" },
  { name: "Salamanca", slug: "salamanca" },
  { name: "Santa Cruz de Tenerife", slug: "santa-cruz-de-tenerife" },
  { name: "Segovia", slug: "segovia" },
  { name: "Sevilla", slug: "sevilla" },
  { name: "Soria", slug: "soria" },
  { name: "Tarragona", slug: "tarragona" },
  { name: "Teruel", slug: "teruel" },
  { name: "Toledo", slug: "toledo" },
  { name: "Valencia", slug: "valencia" },
  { name: "Valladolid", slug: "valladolid" },
  { name: "Vizcaya", slug: "vizcaya" },
  { name: "Zamora", slug: "zamora" },
  { name: "Zaragoza", slug: "zaragoza" },
];

const FAQ_ITEMS = [
  {
    question: "¿Qué información contienen los microdatos de la DGT?",
    answer:
      "Los microdatos de accidentalidad de la DGT incluyen, por cada accidente con víctimas en carretera: fecha, hora, tipo de vía, punto kilométrico, número de vehículos y personas implicadas, fallecidos, heridos graves y leves, y circunstancias del accidente (colisión frontal, salida de calzada, atropello…). Están anonimizados y se publican bajo licencia abierta CC-BY.",
  },
  {
    question: "¿Desde cuándo hay datos disponibles?",
    answer:
      "La serie temporal homogénea comienza en 2011 tras la implantación del actual modelo de recogida de datos. Los microdatos hasta 2023 están integrados en la plataforma; el ejercicio 2024 se incorporará cuando la DGT publique el conjunto de datos oficial.",
  },
  {
    question: "¿Por qué algunas provincias muestran más accidentes?",
    answer:
      "El número absoluto de accidentes está muy correlacionado con la densidad de población y la longitud de la red viaria. Para comparativas entre provincias es más útil la tasa de accidentalidad por millón de vehículos-km o por habitante, que se incluye en el análisis individual de cada provincia.",
  },
  {
    question: "¿Se incluyen accidentes en vías urbanas?",
    answer:
      "Los datos de la DGT solo incluyen accidentes con víctimas en carreteras interurbanas. Los accidentes en vías urbanas son competencia de la Dirección General de Tráfico local y no están integrados en el mismo sistema de recopilación.",
  },
  {
    question: "¿Cómo interpretar la tendencia de fallecidos?",
    answer:
      "España ha reducido el número de fallecidos en carretera un 70% desde el año 2000, pasando de más de 5.000 muertos anuales a menos de 1.500 en 2023. El análisis provincial permite identificar las provincias donde la reducción ha sido mayor o donde la tendencia se ha estancado en los últimos años.",
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
    url: `${BASE_URL}/analisis/accidentes/${p.slug}`,
  })),
};

export default function AnalisisAccidentesHubPage() {
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
          Evolución histórica de la siniestralidad vial en las 52 provincias españolas. Consulta
          el número de accidentes, fallecidos y heridos desde 2011 hasta 2024, con desglose por
          tipo de vía, condiciones meteorológicas y perfil del conductor. Datos oficiales de la
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
              href={`/analisis/accidentes/${prov.slug}`}
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
    <FAQAccordion items={FAQ_ITEMS} title="Preguntas frecuentes — accidentes de tráfico" />
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
