import type { Metadata } from "next";
import {
  BarChart3,
  AlertTriangle,
  Route,
  Map as MapIcon,
  TrendingUp,
  Shield,
} from "lucide-react";
import { VerticalHub } from "@/components/ui/VerticalHub";
import { FAQAccordion } from "@/components/ui/FAQAccordion";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { RelatedLinks } from "@/components/ui/RelatedLinks";
import { ButtonLink } from "@/components/ui/Button";
import { StructuredData } from "@/components/seo/StructuredData";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Análisis de tráfico, accidentes y carreteras — trafico.live",
  description:
    "Análisis estadístico de la siniestralidad vial en las 52 provincias españolas y la intensidad de tráfico en las principales carreteras nacionales. Datos oficiales DGT y Ministerio de Transportes.",
  alternates: { canonical: `${BASE_URL}/analisis` },
  openGraph: {
    title: "Análisis de tráfico, accidentes y carreteras",
    description:
      "Siniestralidad provincial histórica y evolución de la IMD en autopistas, autovías y carreteras nacionales.",
    url: `${BASE_URL}/analisis`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

const FAQ_ITEMS = [
  {
    question: "¿Qué fuentes de datos se utilizan en los análisis?",
    answer:
      "Los análisis de accidentes se basan en los microdatos de accidentalidad de la DGT (2011-2024), que incluyen cada siniestro con geolocalización, circunstancias y perfil de los implicados. Los datos de intensidad de tráfico provienen del visor del Ministerio de Transportes (IMD anual por tramo), que publica datos desde 2017.",
  },
  {
    question: "¿Con qué frecuencia se actualizan los datos?",
    answer:
      "Los datos de accidentes se actualizan anualmente conforme la DGT publica el conjunto de microdatos de cada ejercicio (habitualmente en el segundo trimestre del año siguiente). La Intensidad Media Diaria (IMD) se actualiza cada vez que el Ministerio publica el visor anual, generalmente entre octubre y enero.",
  },
  {
    question: "¿Puedo ver el detalle de un accidente concreto?",
    answer:
      "Los microdatos de la DGT están anonimizados y no incluyen la ubicación exacta del accidente, sino la carretera y el punto kilométrico. Puedes filtrar por provincia, tipo de vía, condiciones meteorológicas y perfil del conductor en las páginas de análisis provincial.",
  },
  {
    question: "¿Qué es la IMD y cómo se calcula?",
    answer:
      "La Intensidad Media Diaria (IMD) es el número medio de vehículos que circulan por un punto de una carretera en un día. Se calcula dividiendo el volumen anual de tráfico entre los 365 días del año, a partir de los datos de las estaciones de aforo permanentes instaladas por el Ministerio de Transportes.",
  },
  {
    question: "¿Están disponibles los datos de carreteras autonómicas?",
    answer:
      "Actualmente el análisis se centra en la red de carreteras del Estado (autopistas A-, AP- y carreteras N-). Varias comunidades autónomas publican sus propios datos de IMD, pero la integración con redes autonómicas se encuentra en hoja de ruta para 2026.",
  },
];

const collectionSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Análisis de tráfico, accidentes y carreteras",
  url: `${BASE_URL}/analisis`,
  inLanguage: "es",
  about: { "@type": "Place", name: "España" },
  publisher: { "@type": "Organization", name: "trafico.live", url: BASE_URL },
  hasPart: [
    {
      "@type": "WebPage",
      name: "Análisis de accidentes por provincia",
      url: `${BASE_URL}/analisis/accidentes`,
    },
    {
      "@type": "WebPage",
      name: "Análisis por carretera",
      url: `${BASE_URL}/analisis/carreteras`,
    },
  ],
};

export default function AnalisisHubPage() {
  const breadcrumbs = [{ name: "Análisis", href: "/analisis" }];

  const hero = (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 max-w-3xl">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-tl-600 dark:text-tl-400">
          <BarChart3 className="w-4 h-4" />
          trafico.live · Análisis
        </span>
        <h1 className="text-4xl md:text-5xl font-heading font-bold text-gray-900 dark:text-gray-50 leading-tight">
          Análisis de tráfico, accidentes y carreteras
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
          Estadísticas detalladas de siniestralidad vial en las 52 provincias españolas e
          intensidad de tráfico en autopistas, autovías y carreteras nacionales. Datos
          oficiales de la DGT y el Ministerio de Transportes.
        </p>
        <div className="flex flex-wrap gap-3 mt-2">
          <ButtonLink href="/analisis/accidentes" variant="primary" icon={<AlertTriangle className="w-4 h-4" />}>
            Accidentes por provincia
          </ButtonLink>
          <ButtonLink href="/analisis/carreteras" variant="secondary" icon={<Route className="w-4 h-4" />}>
            Análisis por carretera
          </ButtonLink>
        </div>
      </div>
    </div>
  );

  const sections = [
    {
      id: "sub-secciones",
      title: "Secciones de análisis",
      description:
        "Explora la accidentalidad provincial o profundiza en el tráfico de cada carretera.",
      content: (
        <RelatedLinks
          columns={2}
          title=""
          items={[
            {
              title: "Análisis de accidentes por provincia",
              description:
                "Evolución histórica de accidentes, fallecidos y heridos en las 52 provincias. Datos DGT 2011-2024.",
              href: "/analisis/accidentes",
              icon: AlertTriangle,
            },
            {
              title: "Análisis por carretera",
              description:
                "IMD, porcentaje de vehículos pesados y evolución anual en autopistas, autovías y carreteras nacionales.",
              href: "/analisis/carreteras",
              icon: Route,
            },
          ]}
        />
      ),
    },
    {
      id: "related",
      title: "También te puede interesar",
      description: "Más herramientas de análisis e inteligencia de movilidad.",
      content: (
        <RelatedLinks
          columns={3}
          title=""
          items={[
            {
              title: "Inteligencia de movilidad",
              description: "Análisis data-driven: hora punta, coste de desplazamiento, impacto de la lluvia y más.",
              href: "/inteligencia",
              icon: TrendingUp,
            },
            {
              title: "Predicciones",
              description: "Previsiones de precio de combustible, retrasos de trenes y tráfico.",
              href: "/prediccion",
              icon: MapIcon,
            },
            {
              title: "Estaciones de aforo",
              description: "Mapa de 14.400+ puntos de medición de intensidad en toda España.",
              href: "/estaciones-aforo",
              icon: Shield,
            },
          ]}
        />
      ),
    },
  ];

  const faq = <FAQAccordion items={FAQ_ITEMS} title="Preguntas frecuentes — análisis de tráfico" />;

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
