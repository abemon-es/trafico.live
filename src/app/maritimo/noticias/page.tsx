import { Metadata } from "next";
import Link from "next/link";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import {
  Anchor, Newspaper, Fuel, CloudLightning, AlertTriangle,
  BarChart3, Calendar, Clock, Tag, ChevronRight, ArrowRight,
  BookOpen, Waves,
} from "lucide-react";
import { ArticleCategory } from "@prisma/client";

export const revalidate = 300;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Noticias Marítimas — Combustible, Puertos y Alertas Costeras",
  description:
    "Informes marítimos diarios, precios de combustible naval, alertas costeras AEMET y noticias sobre puertos españoles. Datos oficiales actualizados.",
  keywords: [
    "noticias marítimas España",
    "combustible naval precio",
    "alertas costeras AEMET",
    "gasoleo marino precio",
    "puertos España",
    "informe marítimo",
  ],
  alternates: {
    canonical: `${BASE_URL}/maritimo/noticias`,
  },
  openGraph: {
    title: "Noticias Marítimas — trafico.live",
    description:
      "Informes automáticos de combustible naval, alertas costeras y noticias sobre la actividad marítima en España.",
    url: `${BASE_URL}/maritimo/noticias`,
    type: "website",
  },
};

const CATEGORY_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; color: string; bg: string }
> = {
  DAILY_REPORT: {
    label: "Informe diario",
    icon: <Newspaper className="w-4 h-4" />,
    color: "text-gray-600 dark:text-gray-400",
    bg: "bg-gray-100 dark:bg-gray-800",
  },
  WEEKLY_REPORT: {
    label: "Informe semanal",
    icon: <BarChart3 className="w-4 h-4" />,
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-900/20",
  },
  PRICE_ALERT: {
    label: "Precios",
    icon: <Fuel className="w-4 h-4" />,
    color: "text-tl-amber-600 dark:text-tl-amber-400",
    bg: "bg-tl-amber-50 dark:bg-tl-amber-900/20",
  },
  WEATHER_ALERT: {
    label: "Alerta costera",
    icon: <CloudLightning className="w-4 h-4" />,
    color: "text-tl-600 dark:text-tl-400",
    bg: "bg-tl-50 dark:bg-tl-900/20",
  },
  INCIDENT_DIGEST: {
    label: "Incidencias",
    icon: <AlertTriangle className="w-4 h-4" />,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-900/20",
  },
  GUIDE: {
    label: "Guía",
    icon: <BookOpen className="w-4 h-4" />,
    color: "text-tl-600 dark:text-tl-400",
    bg: "bg-tl-50 dark:bg-tl-900/20",
  },
  NEWS: {
    label: "Noticia",
    icon: <Newspaper className="w-4 h-4" />,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-900/20",
  },
  ANALYSIS: {
    label: "Análisis",
    icon: <BarChart3 className="w-4 h-4" />,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-900/20",
  },
};

export default async function MaritimoNoticiasPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.pagina || "1"));
  const perPage = 18;

  const where = {
    status: "PUBLISHED" as const,
    OR: [
      { slug: { contains: "maritim" } },
      { slug: { contains: "costera" } },
      { slug: { contains: "puerto" } },
      { slug: { contains: "naval" } },
      {
        tags: {
          some: {
            tag: {
              slug: {
                in: ["maritimo", "costera", "puertos", "combustible-naval"],
              },
            },
          },
        },
      },
    ],
  };

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      take: perPage,
      skip: (page - 1) * perPage,
      include: { tags: { include: { tag: true } } },
    }),
    prisma.article.count({ where }),
  ]);

  const totalPages = Math.ceil(total / perPage);

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Noticias Marítimas — trafico.live",
    description:
      "Informes automáticos de combustible naval, alertas costeras y noticias marítimas en España.",
    url: `${BASE_URL}/maritimo/noticias`,
    publisher: {
      "@type": "Organization",
      name: "trafico.live",
      url: BASE_URL,
    },
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <StructuredData data={collectionSchema} />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Marítimo", href: "/maritimo" },
            { name: "Noticias", href: "/maritimo/noticias" },
          ]}
        />

        {/* Hero */}
        <div className="relative mb-8 rounded-2xl overflow-hidden bg-gradient-to-br from-tl-700 via-tl-600 to-tl-500 p-8 text-white">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 30 Q15 20 30 30 Q45 40 60 30' stroke='white' stroke-width='2' fill='none'/%3E%3C/svg%3E\")",
              backgroundSize: "60px 60px",
            }}
          />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Anchor className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-white/80 uppercase tracking-wider">
                Sección marítima
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              Noticias Marítimas
            </h1>
            <p className="text-lg text-white/85 max-w-2xl">
              Informes diarios de combustible naval, alertas costeras AEMET y
              noticias sobre puertos y actividad marítima en España.
            </p>
          </div>
        </div>

        {/* Quick access pills */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Link
            href="/maritimo/combustible"
            className="px-4 py-2 rounded-full text-sm font-medium bg-tl-amber-50 dark:bg-tl-amber-900/20 text-tl-amber-700 dark:text-tl-amber-400 border border-tl-amber-200 dark:border-tl-amber-800 hover:bg-tl-amber-100 dark:hover:bg-tl-amber-900/30 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Fuel className="w-3.5 h-3.5" />
              Combustible naval
            </span>
          </Link>
          <Link
            href="/maritimo/mapa"
            className="px-4 py-2 rounded-full text-sm font-medium bg-tl-50 dark:bg-tl-900/20 text-tl-600 dark:text-tl-400 border border-tl-200 dark:border-tl-800 hover:bg-tl-100 dark:hover:bg-tl-900/30 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Waves className="w-3.5 h-3.5" />
              Mapa marítimo
            </span>
          </Link>
          <Link
            href="/maritimo/meteorologia"
            className="px-4 py-2 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <CloudLightning className="w-3.5 h-3.5" />
              Meteorología costera
            </span>
          </Link>
          <Link
            href="/noticias"
            className="px-4 py-2 rounded-full text-sm font-medium bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:border-tl-300 dark:hover:border-tl-700 transition-colors"
          >
            Todas las noticias →
          </Link>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {articles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {articles.map((article) => {
                  const config =
                    CATEGORY_CONFIG[article.category] || CATEGORY_CONFIG.NEWS;
                  return (
                    <Link
                      key={article.id}
                      href={`/noticias/${article.slug}`}
                      className="group flex flex-col bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-tl-300 dark:hover:border-tl-700 transition-all overflow-hidden"
                    >
                      <div className="flex flex-col flex-1 p-5">
                        {/* Category badge */}
                        <div className="flex items-center gap-2 mb-3">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}
                          >
                            {config.icon}
                            {config.label}
                          </span>
                          {article.isAutoGenerated && (
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                              Auto
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 leading-snug mb-2 group-hover:text-tl-600 dark:group-hover:text-tl-400 transition-colors line-clamp-2">
                          {article.title}
                        </h2>

                        {/* Summary */}
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed flex-1 line-clamp-3 mb-4">
                          {article.summary}
                        </p>

                        {/* Meta */}
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-auto pt-3 border-t border-gray-100 dark:border-gray-800">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {article.publishedAt.toLocaleDateString("es-ES", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                          {article.readTime && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {article.readTime}
                            </span>
                          )}
                          {article.source && (
                            <span className="ml-auto">{article.source}</span>
                          )}
                        </div>

                        {/* Tags */}
                        {article.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {article.tags.slice(0, 3).map((at) => (
                              <span
                                key={at.tag.slug}
                                className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded"
                              >
                                {at.tag.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              /* Próximamente placeholder */
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-10 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-tl-50 dark:bg-tl-900/20 flex items-center justify-center mb-4">
                  <Anchor className="w-8 h-8 text-tl-500 dark:text-tl-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Informes marítimos en desarrollo
                </h2>
                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
                  Los informes diarios de combustible naval, alertas costeras y
                  resúmenes de actividad portuaria se generarán automáticamente
                  próximamente. Mientras tanto, consulta nuestras secciones de
                  datos en tiempo real.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href="/maritimo/combustible"
                    className="inline-flex items-center gap-2 bg-tl-600 hover:bg-tl-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
                  >
                    <Fuel className="w-4 h-4" />
                    Combustible naval
                  </Link>
                  <Link
                    href="/noticias"
                    className="inline-flex items-center gap-2 text-sm font-medium text-tl-600 dark:text-tl-400 hover:underline"
                  >
                    Ver todas las noticias
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center gap-2">
                {page > 1 && (
                  <Link
                    href={`/maritimo/noticias?pagina=${page - 1}`}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-tl-300 transition-colors"
                  >
                    ← Anterior
                  </Link>
                )}
                <span className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                  Página {page} de {totalPages}
                </span>
                {page < totalPages && (
                  <Link
                    href={`/maritimo/noticias?pagina=${page + 1}`}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-tl-300 transition-colors"
                  >
                    Siguiente →
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="w-full lg:w-72 flex-shrink-0 space-y-6">
            <div className="sticky top-6 space-y-6">
              {/* Maritime sections */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-5">
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <Anchor className="w-4 h-4 text-tl-600 dark:text-tl-400" />
                  Sección marítima
                </h3>
                <ul className="space-y-2">
                  {[
                    { href: "/maritimo/combustible", label: "Combustible naval" },
                    { href: "/maritimo/mapa", label: "Mapa de estaciones" },
                    { href: "/maritimo/meteorologia", label: "Meteorología costera" },
                    { href: "/maritimo/puertos", label: "Puertos" },
                  ].map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-tl-600 dark:hover:text-tl-400 transition-colors"
                      >
                        <ChevronRight className="w-3.5 h-3.5 text-tl-400" />
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Noticias generales */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-5">
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-tl-600 dark:text-tl-400" />
                  Otras noticias
                </h3>
                <ul className="space-y-2">
                  {[
                    { href: "/noticias", label: "Noticias de tráfico" },
                    { href: "/profesional/noticias", label: "Noticias profesionales" },
                    { href: "/alertas-meteo", label: "Alertas meteorológicas" },
                    { href: "/precio-gasolina-hoy", label: "Precio gasolina hoy" },
                    { href: "/precio-diesel-hoy", label: "Precio diesel hoy" },
                  ].map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-tl-600 dark:hover:text-tl-400 transition-colors"
                      >
                        <ChevronRight className="w-3.5 h-3.5 text-tl-400" />
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA */}
              <div className="bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-800 rounded-xl p-5 text-center">
                <Waves className="w-8 h-8 mx-auto mb-2 text-tl-500 dark:text-tl-400" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Consulta precios de combustible naval y estaciones marítimas
                  en tiempo real.
                </p>
                <Link
                  href="/maritimo/combustible"
                  className="inline-flex items-center gap-2 bg-tl-600 hover:bg-tl-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  Ver precios
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
