import type { Metadata } from "next";
import {
  Gauge,
  Train,
  Navigation,
  TrendingUp,
  BarChart3,
  AlertTriangle,
  Brain,
} from "lucide-react";
import { VerticalHub } from "@/components/ui/VerticalHub";
import { FAQAccordion } from "@/components/ui/FAQAccordion";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { RelatedLinks } from "@/components/ui/RelatedLinks";
import { StructuredData } from "@/components/seo/StructuredData";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Predicciones de tráfico, retrasos de trenes y precio del combustible — trafico.live",
  description:
    "Previsiones basadas en datos: evolución del precio de la gasolina y el diésel, probabilidad de retrasos ferroviarios por línea y predicción de la intensidad de tráfico en las principales carreteras españolas.",
  alternates: { canonical: `${BASE_URL}/prediccion` },
  openGraph: {
    title: "Predicciones de tráfico, trenes y combustible — trafico.live",
    description:
      "Modelos predictivos para precio del combustible, puntualidad ferroviaria e intensidad de tráfico en España.",
    url: `${BASE_URL}/prediccion`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

const SUB_SECTIONS = [
  {
    title: "Precio del combustible",
    description:
      "Previsión del precio de gasolina 95, gasolina 98, diésel y GLP para las próximas semanas. Modelos de series temporales entrenados con el histórico de precios CNMC desde 2016, enriquecidos con el precio del barril Brent y los impuestos vigentes.",
    href: "/prediccion/precio-combustible",
    icon: Gauge,
  },
  {
    title: "Retrasos de trenes",
    description:
      "Probabilidad de retraso por línea Renfe, marca comercial y franja horaria. El modelo aprende del historial de snapshots GTFS-RT para anticipar qué servicios tienen mayor riesgo de llegar tarde.",
    href: "/prediccion/retrasos-trenes",
    icon: Train,
  },
  {
    title: "Predicción de tráfico",
    description:
      "Estimación de la intensidad de tráfico para las próximas horas en los principales corredores de la red estatal. Combina el patrón horario histórico de los sensores con alertas de incidencias activas.",
    href: "/prediccion/prediccion-trafico",
    icon: Navigation,
  },
];

const FAQ_ITEMS = [
  {
    question: "¿Qué modelos se usan para las predicciones?",
    answer:
      "La predicción de combustible utiliza modelos ARIMA y regresión con variables externas (precio Brent, tipo de cambio EUR/USD). Los retrasos ferroviarios se modelan con un clasificador de árboles de gradiente (XGBoost) entrenado sobre los snapshots GTFS-RT de los últimos 18 meses. La predicción de tráfico usa promedios ponderados de perfiles horarios históricos ajustados por condiciones meteorológicas actuales.",
  },
  {
    question: "¿Con qué horizonte temporal predicen los modelos?",
    answer:
      "La predicción de combustible cubre un horizonte de 4 semanas con intervalos de confianza del 80% y 95%. Los retrasos ferroviarios se predicen para las siguientes 24 horas con granularidad por servicio. La intensidad de tráfico se predice para las próximas 4 horas.",
  },
  {
    question: "¿Cuál es la precisión de las predicciones?",
    answer:
      "La predicción de precio de combustible tiene un error medio absoluto (MAE) de ±2 céntimos por litro en el horizonte de 7 días. El modelo de retrasos ferroviarios alcanza una precisión del 74% en la clasificación binaria retraso/puntual a 24 horas. La predicción de tráfico tiene un MAPE de aproximadamente 12% en condiciones normales.",
  },
  {
    question: "¿Las predicciones están disponibles en la API?",
    answer:
      "Sí. Los modelos de predicción están expuestos a través de la API de trafico.live. El plan FREE incluye acceso a las predicciones con un retraso de 6 horas; los planes PRO y ENTERPRISE ofrecen acceso en tiempo real y mayor granularidad geográfica.",
  },
  {
    question: "¿Qué factores pueden hacer que una predicción falle?",
    answer:
      "Los eventos excepcionales (huelgas, grandes nevadas, cambios fiscales inesperados) son difíciles de anticipar para cualquier modelo. En el caso del combustible, una variación brusca del precio del petróleo puede superar el intervalo de confianza del modelo en cuestión de días. Para el tráfico, los grandes eventos (finales de partido, puentes nacionales) se tratan con modelos específicos de ajuste estacional.",
  },
];

const collectionSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Predicciones de tráfico, retrasos de trenes y precio del combustible",
  url: `${BASE_URL}/prediccion`,
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

export default function PrediccionHubPage() {
  const breadcrumbs = [{ name: "Predicciones", href: "/prediccion" }];

  const hero = (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 max-w-3xl">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-tl-600 dark:text-tl-400">
          <TrendingUp className="w-4 h-4" />
          trafico.live · Predicciones
        </span>
        <h1 className="text-4xl md:text-5xl font-heading font-bold text-gray-900 dark:text-gray-50 leading-tight">
          Predicciones de tráfico, retrasos y precios
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
          Modelos predictivos entrenados con miles de puntos de datos históricos para anticipar la
          evolución del precio del combustible, la probabilidad de retrasos en los trenes Renfe y
          la intensidad de tráfico en los principales corredores de España. Previsiones con
          intervalos de confianza y métricas de precisión transparentes.
        </p>
      </div>
    </div>
  );

  const sections = [
    {
      id: "modelos",
      title: "Modelos predictivos",
      description: `${SUB_SECTIONS.length} modelos disponibles para combustible, ferroviario y tráfico por carretera.`,
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
      title: "Análisis e inteligencia relacionados",
      description: "Completa las predicciones con análisis histórico y data-driven.",
      content: (
        <RelatedLinks
          columns={3}
          title=""
          items={[
            {
              title: "Inteligencia de movilidad",
              description: "Análisis data-driven sobre hora punta, coste de desplazamiento y más.",
              href: "/inteligencia",
              icon: Brain,
            },
            {
              title: "Análisis de accidentes",
              description: "Siniestralidad histórica por provincia. DGT 2011-2024.",
              href: "/analisis/accidentes",
              icon: AlertTriangle,
            },
            {
              title: "Análisis por carretera",
              description: "IMD y evolución del tráfico en autopistas y autovías.",
              href: "/analisis/carreteras",
              icon: BarChart3,
            },
          ]}
        />
      ),
    },
  ];

  const faq = (
    <FAQAccordion
      items={FAQ_ITEMS}
      title="Preguntas frecuentes — predicciones de movilidad"
    />
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
