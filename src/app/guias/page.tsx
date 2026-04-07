import { Metadata } from "next";
import Link from "next/link";
import {
  Route,
  Radar,
  Leaf,
  Tag,
  Train,
  Zap,
  Gauge,
  Fuel,
  BookOpen,
  ChevronRight,
  Clock,
  Users,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { buildPageMetadata } from "@/lib/seo/metadata";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = buildPageMetadata({
  title: "Guias de Trafico y Transporte en Espana — trafico.live",
  description:
    "Guias completas sobre peajes, radares, zonas de bajas emisiones, etiquetas ambientales, cercanias, puntos de recarga, limites de velocidad y combustibles en Espana.",
  path: "/guias",
  keywords: [
    "guias trafico espana",
    "peajes espana",
    "radares fijos espana",
    "ZBE espana",
    "etiqueta ambiental DGT",
    "cercanias madrid",
    "puntos recarga electrico",
    "limites velocidad",
    "gasolina vs diesel",
  ],
});

export const revalidate = 86400;

interface GuideCard {
  slug: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  audience: string;
  readTime: string;
  color: string;
}

const GUIDES: GuideCard[] = [
  {
    slug: "peajes-espana",
    title: "Peajes en Espana",
    description:
      "Guia completa de autopistas de pago: tarifas actualizadas, metodos de pago, telepeaje VIA-T y alternativas gratuitas.",
    icon: <Route className="w-6 h-6" />,
    audience: "Conductores habituales",
    readTime: "12 min",
    color: "bg-tl-100 dark:bg-tl-900/30 text-tl-600 dark:text-tl-400",
  },
  {
    slug: "radares-espana",
    title: "Radares en Espana",
    description:
      "Todo sobre radares fijos, de tramo, moviles y semaforicos. Sistema de multas, margenes de tolerancia y recursos.",
    icon: <Radar className="w-6 h-6" />,
    audience: "Todos los conductores",
    readTime: "14 min",
    color: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400",
  },
  {
    slug: "zonas-bajas-emisiones",
    title: "Zonas de Bajas Emisiones (ZBE)",
    description:
      "Que son las ZBE, que ciudades las tienen, como funcionan las restricciones y que vehiculos pueden circular.",
    icon: <Leaf className="w-6 h-6" />,
    audience: "Conductores urbanos",
    readTime: "11 min",
    color: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
  },
  {
    slug: "etiqueta-ambiental",
    title: "Etiqueta Ambiental DGT",
    description:
      "Los 4 distintivos ambientales (0, ECO, C, B), como consultar el tuyo, beneficios por ciudad y tramites.",
    icon: <Tag className="w-6 h-6" />,
    audience: "Todos los conductores",
    readTime: "10 min",
    color: "bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400",
  },
  {
    slug: "cercanias-madrid",
    title: "Cercanias Madrid",
    description:
      "Todas las lineas, zonas tarifarias, horarios, precios, conexiones con metro y aeropuerto, y consejos practicos.",
    icon: <Train className="w-6 h-6" />,
    audience: "Viajeros y residentes Madrid",
    readTime: "15 min",
    color: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
  },
  {
    slug: "puntos-recarga-electrico",
    title: "Puntos de Recarga Electrico",
    description:
      "Como funciona la recarga de vehiculos electricos en Espana: tipos de conectores, redes, apps y costes.",
    icon: <Zap className="w-6 h-6" />,
    audience: "Conductores de VE",
    readTime: "13 min",
    color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
  },
  {
    slug: "limites-velocidad-espana",
    title: "Limites de Velocidad en Espana",
    description:
      "Limites por tipo de via, condiciones especiales, sanciones y sistema de puntos del carnet de conducir.",
    icon: <Gauge className="w-6 h-6" />,
    audience: "Todos los conductores",
    readTime: "10 min",
    color: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
  },
  {
    slug: "gasolina-vs-diesel-vs-electrico",
    title: "Gasolina vs Diesel vs Electrico",
    description:
      "Comparativa de costes por kilometro, impacto ambiental, mantenimiento y perspectivas de futuro para cada tipo de combustible.",
    icon: <Fuel className="w-6 h-6" />,
    audience: "Compradores de vehiculo",
    readTime: "16 min",
    color: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
  },
];

export default function GuiasIndexPage() {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Guias de Trafico y Transporte en Espana",
    description:
      "Coleccion de guias completas sobre trafico, transporte y movilidad en Espana con datos en tiempo real.",
    url: `${BASE_URL}/guias`,
    publisher: {
      "@type": "Organization",
      name: "trafico.live",
      url: BASE_URL,
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: GUIDES.length,
      itemListElement: GUIDES.map((guide, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${BASE_URL}/guias/${guide.slug}`,
        name: guide.title,
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs
            items={[
              { name: "Inicio", href: "/" },
              { name: "Guias", href: "/guias" },
            ]}
          />

          {/* Hero */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-tl-100 dark:bg-tl-900/30">
                <BookOpen className="w-6 h-6 text-tl-600 dark:text-tl-400" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                Guias de Trafico y Transporte
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
              Guias completas con informacion practica y datos en tiempo real.
              Todo lo que necesitas saber para moverte por Espana: peajes, radares,
              zonas de bajas emisiones, transporte publico y mucho mas.
            </p>
          </div>

          {/* Guide grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {GUIDES.map((guide) => (
              <Link
                key={guide.slug}
                href={`/guias/${guide.slug}`}
                className="group bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 hover:shadow-md hover:border-tl-300 dark:hover:border-tl-700 transition-all"
              >
                {/* Icon + title */}
                <div className="flex items-start gap-4 mb-3">
                  <div className={`p-2.5 rounded-xl flex-shrink-0 ${guide.color}`}>
                    {guide.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 group-hover:text-tl-700 dark:group-hover:text-tl-300 transition-colors">
                      {guide.title}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                      {guide.description}
                    </p>
                  </div>
                </div>

                {/* Meta + CTA */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {guide.readTime}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {guide.audience}
                    </span>
                  </div>
                  <span className="flex items-center gap-1 text-sm font-semibold text-tl-600 dark:text-tl-400 group-hover:text-tl-700 dark:group-hover:text-tl-300 transition-colors">
                    Leer
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* SEO footer */}
          <section className="mt-12 prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-800 pt-8">
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 not-prose mb-3">
              Informacion practica para conductores y viajeros en Espana
            </h2>
            <p className="text-sm leading-relaxed">
              En trafico.live combinamos contenido editorial de calidad con datos en tiempo
              real de fuentes oficiales (DGT, AEMET, CNMC, Renfe, MINETUR). Cada guia incluye
              informacion actualizada automaticamente: precios de combustible, numero de radares,
              lineas de cercanias activas o puntos de recarga disponibles. Asi obtienes informacion
              que no se queda obsoleta.
            </p>
          </section>
        </main>
      </div>
    </>
  );
}
