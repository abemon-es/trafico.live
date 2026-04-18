import type { Metadata } from "next";
import {
  Brain,
  TrendingUp,
  CloudRain,
  Bike,
  Truck,
  Clock,
  Wallet,
  BarChart3,
  AlertTriangle,
  Route,
} from "lucide-react";
import { VerticalHub } from "@/components/ui/VerticalHub";
import { FAQAccordion } from "@/components/ui/FAQAccordion";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { RelatedLinks } from "@/components/ui/RelatedLinks";
import { StructuredData } from "@/components/seo/StructuredData";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Inteligencia de movilidad — análisis data-driven del tráfico en España",
  description:
    "Análisis avanzado de movilidad: coste real del desplazamiento, impacto de la lluvia en los accidentes, radiografía de la carretera española y perfiles de riesgo para motociclistas, ciclistas, peatones y camiones.",
  alternates: { canonical: `${BASE_URL}/inteligencia` },
  openGraph: {
    title: "Inteligencia de movilidad — trafico.live",
    description:
      "Análisis data-driven del tráfico en España: hora punta, coste de desplazamiento, lluvia y accidentes, motociclistas, camiones, ciclistas y peatones.",
    url: `${BASE_URL}/inteligencia`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

const SUB_SECTIONS = [
  {
    title: "Coste de desplazamiento",
    description:
      "Cuánto cuesta realmente ir al trabajo en coche: combustible, peajes, tiempo perdido en atascos y depreciación del vehículo por kilómetro.",
    href: "/inteligencia/coste-desplazamiento",
    icon: Wallet,
  },
  {
    title: "Hora punta y accidentes",
    description:
      "Correlación entre los picos de tráfico (7-9h y 17-20h) y la siniestralidad vial. ¿A qué hora del día hay más accidentes en España?",
    href: "/inteligencia/hora-punta-y-accidentes",
    icon: Clock,
  },
  {
    title: "Lluvia y accidentes",
    description:
      "Impacto de las precipitaciones sobre la accidentalidad. Análisis provincia a provincia del efecto del tiempo adverso en las carreteras españolas.",
    href: "/inteligencia/lluvia-y-accidentes",
    icon: CloudRain,
  },
  {
    title: "Motociclistas",
    description:
      "Radiografía del riesgo para usuarios de moto: tramos con mayor siniestralidad, perfil del accidente grave y comparativa con el resto de vehículos.",
    href: "/inteligencia/motociclistas",
    icon: TrendingUp,
  },
  {
    title: "Camiones y transporte de mercancías",
    description:
      "Análisis de la incidencia del transporte pesado en la red viaria: corredores con más tráfico pesado, accidentalidad y restricciones de circulación.",
    href: "/inteligencia/camiones",
    icon: Truck,
  },
  {
    title: "Ciclistas y peatones",
    description:
      "Los usuarios vulnerables de la vía: dónde y cuándo ocurren los atropellos y accidentes con ciclistas, y qué factores aumentan el riesgo.",
    href: "/inteligencia/ciclistas-y-peatones",
    icon: Bike,
  },
  {
    title: "Radiografía de la carretera",
    description:
      "Visión de conjunto de la red viaria española: estado del firme, tramos de concentración de accidentes, puntos negros y obras en ejecución.",
    href: "/inteligencia/radiografia-carretera",
    icon: Route,
  },
];

const FAQ_ITEMS = [
  {
    question: "¿Qué fuentes se usan en los análisis de inteligencia?",
    answer:
      "Los análisis combinan microdatos de la DGT (accidentes 2011-2024), datos AEMET de precipitación y temperatura, la IMD del Ministerio de Transportes, registros de sensores de intensidad del tráfico de Madrid y otras ciudades, y precios de combustible del Ministerio de Industria. Todas las fuentes son públicas y con licencia abierta.",
  },
  {
    question: "¿Con qué frecuencia se actualizan los análisis?",
    answer:
      "Los análisis estáticos (accidentes históricos, radiografía de la carretera) se actualizan cuando las fuentes de datos publican nuevos conjuntos anuales. Los módulos que incluyen datos en tiempo real (precio de combustible, intensidad de tráfico) se refrescan diaria o semanalmente.",
  },
  {
    question: "¿Son predictivos los análisis o solo descriptivos?",
    answer:
      "La sección de Inteligencia contiene principalmente análisis descriptivos y correlacionales basados en datos históricos. Las predicciones (precio de combustible, retrasos de trenes, tráfico futuro) están en la sección /prediccion, que utiliza modelos de series temporales y aprendizaje automático.",
  },
  {
    question: "¿Puedo acceder a los datos en bruto mediante API?",
    answer:
      "Sí. trafico.live expone una API con endpoints para accidentes, tráfico, clima y combustible. Los planes PRO y ENTERPRISE permiten acceso a datos históricos sin límite de llamadas. Consulta la documentación de la API o el portal de facturación para más información.",
  },
  {
    question: "¿Qué metodología se sigue para los análisis de riesgo?",
    answer:
      "El riesgo se calcula como la tasa de accidentes graves por millón de vehículos-km expuestos, segmentada por tipo de usuario (moto, bicicleta, peatón, vehículo pesado). Se aplican modelos de regresión negativa binomial para controlar la sobredispersión típica de los datos de accidentes escasos.",
  },
];

const collectionSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Inteligencia de movilidad — análisis data-driven",
  url: `${BASE_URL}/inteligencia`,
  inLanguage: "es",
  about: { "@type": "Place", name: "España" },
  publisher: { "@type": "Organization", name: "trafico.live", url: BASE_URL },
  hasPart: SUB_SECTIONS.map((s) => ({
    "@type": "WebPage",
    name: s.title,
    url: `${BASE_URL}${s.href}`,
    description: s.description,
  })),
};

export default function InteligenciaHubPage() {
  const breadcrumbs = [{ name: "Inteligencia de movilidad", href: "/inteligencia" }];

  const hero = (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 max-w-3xl">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-tl-600 dark:text-tl-400">
          <Brain className="w-4 h-4" />
          trafico.live · Inteligencia
        </span>
        <h1 className="text-4xl md:text-5xl font-heading font-bold text-gray-900 dark:text-gray-50 leading-tight">
          Inteligencia de movilidad
          <span className="block text-2xl md:text-3xl font-medium text-tl-600 dark:text-tl-400 mt-1">
            análisis data-driven
          </span>
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
          Cruzamos microdatos de accidentes de la DGT, registros climáticos de AEMET, intensidad
          de tráfico en tiempo real y precios de combustible para generar análisis profundos
          sobre la movilidad en España. Desde el coste real de ir al trabajo hasta los perfiles
          de riesgo para usuarios vulnerables.
        </p>
      </div>
    </div>
  );

  const sections = [
    {
      id: "analisis",
      title: "Análisis disponibles",
      description: `${SUB_SECTIONS.length} análisis data-driven sobre movilidad y seguridad vial.`,
      content: (
        <RelatedLinks
          columns={3}
          title=""
          items={SUB_SECTIONS}
        />
      ),
    },
    {
      id: "related",
      title: "Más herramientas",
      description: "Explora otros módulos de análisis y predicción.",
      content: (
        <RelatedLinks
          columns={3}
          title=""
          items={[
            {
              title: "Análisis de accidentes",
              description: "Siniestralidad por provincia con serie histórica 2011-2024.",
              href: "/analisis/accidentes",
              icon: AlertTriangle,
            },
            {
              title: "Análisis por carretera",
              description: "IMD y tráfico pesado en autopistas y autovías.",
              href: "/analisis/carreteras",
              icon: BarChart3,
            },
            {
              title: "Predicciones",
              description: "Previsiones de combustible, retrasos de trenes y tráfico.",
              href: "/prediccion",
              icon: TrendingUp,
            },
          ]}
        />
      ),
    },
  ];

  const faq = (
    <FAQAccordion items={FAQ_ITEMS} title="Preguntas frecuentes — inteligencia de movilidad" />
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
