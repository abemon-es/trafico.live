import { Metadata } from "next";
import Link from "next/link";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import {
  Newspaper, TrendingUp, CloudLightning, AlertTriangle,
  Fuel, FileText, BookOpen, Megaphone, BarChart3, Scale,
  Calendar, Clock, Tag, ChevronRight, ArrowRight,
} from "lucide-react";
import { ArticleCategory } from "@prisma/client";

export const revalidate = 300;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Noticias de Tráfico en España — Informes, Guías y Alertas",
  description:
    "Informes diarios automáticos, alertas de precios de combustible, guías prácticas y noticias sobre tráfico en España. Datos oficiales DGT, AEMET y MITERD.",
  keywords: [
    "noticias tráfico España",
    "informe diario tráfico",
    "precio combustible hoy",
    "alertas tráfico",
    "guías tráfico DGT",
  ],
  alternates: {
    canonical: `${BASE_URL}/noticias`,
  },
  openGraph: {
    title: "Noticias de Tráfico en España",
    description:
      "Informes automáticos, alertas de precios, guías y análisis del tráfico en España.",
    url: `${BASE_URL}/noticias`,
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
  INCIDENT_DIGEST: {
    label: "Incidencias",
    icon: <AlertTriangle className="w-4 h-4" />,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-900/20",
  },
  WEATHER_ALERT: {
    label: "Meteorología",
    icon: <CloudLightning className="w-4 h-4" />,
    color: "text-tl-600 dark:text-tl-400",
    bg: "bg-tl-50 dark:bg-tl-900/20",
  },
  FUEL_TREND: {
    label: "Tendencia combustible",
    icon: <TrendingUp className="w-4 h-4" />,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
  },
  GUIDE: {
    label: "Guía",
    icon: <BookOpen className="w-4 h-4" />,
    color: "text-tl-600 dark:text-tl-400",
    bg: "bg-tl-50 dark:bg-tl-900/20",
  },
  NEWS: {
    label: "Noticia",
    icon: <Megaphone className="w-4 h-4" />,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-900/20",
  },
  ANALYSIS: {
    label: "Análisis",
    icon: <BarChart3 className="w-4 h-4" />,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-900/20",
  },
  REGULATORY: {
    label: "Normativa",
    icon: <Scale className="w-4 h-4" />,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-900/20",
  },
};

type FilterKey = "todos" | "informes" | "alertas" | "guias" | "noticias";

const FILTERS: { key: FilterKey; label: string; categories: ArticleCategory[] }[] = [
  { key: "todos", label: "Todos", categories: [] },
  {
    key: "informes",
    label: "Informes",
    categories: ["DAILY_REPORT", "WEEKLY_REPORT", "FUEL_TREND"],
  },
  {
    key: "alertas",
    label: "Alertas",
    categories: ["PRICE_ALERT", "WEATHER_ALERT", "INCIDENT_DIGEST"],
  },
  { key: "guias", label: "Guías", categories: ["GUIDE"] },
  { key: "noticias", label: "Noticias", categories: ["NEWS", "ANALYSIS", "REGULATORY"] },
];

export default async function NoticiasPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string; pagina?: string }>;
}) {
  const params = await searchParams;
  const activeFilter = (params.filtro as FilterKey) || "todos";
  const page = Math.max(1, parseInt(params.pagina || "1"));
  const perPage = 18;

  const filterConfig = FILTERS.find((f) => f.key === activeFilter);
  const categoryFilter =
    filterConfig && filterConfig.categories.length > 0
      ? { category: { in: filterConfig.categories } }
      : {};

  const where = {
    status: "PUBLISHED" as const,
    ...categoryFilter,
  };

  const [articles, total, featuredArticle, tags] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: [{ editorialWeight: "desc" }, { publishedAt: "desc" }],
      take: perPage,
      skip: (page - 1) * perPage,
      include: { tags: { include: { tag: true } } },
    }),
    prisma.article.count({ where }),
    prisma.article.findFirst({
      where: { status: "PUBLISHED", featured: true },
      orderBy: { publishedAt: "desc" },
      include: { tags: { include: { tag: true } } },
    }),
    prisma.tag.findMany({
      include: { _count: { select: { articles: true } } },
      orderBy: { articles: { _count: "desc" } },
      take: 15,
    }),
  ]);

  const totalPages = Math.ceil(total / perPage);

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Noticias de Tráfico en España",
    description:
      "Informes automáticos, alertas, guías y noticias sobre tráfico en España.",
    url: `${BASE_URL}/noticias`,
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
            { name: "Noticias", href: "/noticias" },
          ]}
        />

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-tl-100 dark:bg-tl-900/30 rounded-lg">
              <Newspaper className="w-6 h-6 text-tl-600 dark:text-tl-400" />
            </div>
            <span className="text-sm font-medium text-tl-600 dark:text-tl-400 uppercase tracking-wider">
              Noticias
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            Noticias de Tráfico
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl">
            Informes diarios automáticos, alertas de precios, guías prácticas y
            análisis del tráfico en España.
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {FILTERS.map((f) => {
            const isActive = f.key === activeFilter;
            return (
              <Link
                key={f.key}
                href={f.key === "todos" ? "/noticias" : `/noticias?filtro=${f.key}`}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-tl-600 text-white"
                    : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:border-tl-300 dark:hover:border-tl-700"
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Featured article */}
            {featuredArticle && page === 1 && activeFilter === "todos" && (
              <Link
                href={`/noticias/${featuredArticle.slug}`}
                className="group block mb-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden hover:shadow-lg hover:border-tl-300 dark:hover:border-tl-700 transition-all"
              >
                <div className="p-6 sm:p-8">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold text-tl-600 dark:text-tl-400 uppercase tracking-wider">
                      Destacado
                    </span>
                    {(() => {
                      const config = CATEGORY_CONFIG[featuredArticle.category];
                      return config ? (
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}
                        >
                          {config.icon}
                          {config.label}
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-tl-600 dark:group-hover:text-tl-400 transition-colors">
                    {featuredArticle.title}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {featuredArticle.summary}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {featuredArticle.publishedAt.toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                    {featuredArticle.readTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {featuredArticle.readTime}
                      </span>
                    )}
                    {featuredArticle.tags.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5" />
                        {featuredArticle.tags
                          .slice(0, 3)
                          .map((at) => at.tag.name)
                          .join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            )}

            {/* Articles grid */}
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
              <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                <Newspaper className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 dark:text-gray-400">
                  No hay noticias disponibles con este filtro.
                </p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                {page > 1 && (
                  <Link
                    href={`/noticias?${activeFilter !== "todos" ? `filtro=${activeFilter}&` : ""}pagina=${page - 1}`}
                    className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm hover:border-tl-300 transition-colors"
                  >
                    Anterior
                  </Link>
                )}
                <span className="px-4 py-2 text-sm text-gray-500">
                  {page} / {totalPages}
                </span>
                {page < totalPages && (
                  <Link
                    href={`/noticias?${activeFilter !== "todos" ? `filtro=${activeFilter}&` : ""}pagina=${page + 1}`}
                    className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm hover:border-tl-300 transition-colors"
                  >
                    Siguiente
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="w-full lg:w-72 flex-shrink-0 space-y-6">
            <div className="sticky top-6 space-y-6">
              {/* Popular tags */}
              {tags.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-5">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-tl-600 dark:text-tl-400" />
                    Temas populares
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Link
                        key={tag.slug}
                        href={`/noticias/tag/${tag.slug}`}
                        className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-tl-50 hover:text-tl-600 dark:hover:bg-tl-900/20 dark:hover:text-tl-400 px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-700 transition-colors"
                      >
                        {tag.name}
                        <span className="ml-1 text-gray-400">
                          ({tag._count.articles})
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick links */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-5">
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">
                  Datos en tiempo real
                </h3>
                <ul className="space-y-2">
                  {[
                    { href: "/", label: "Tráfico en tiempo real" },
                    { href: "/precio-gasolina-hoy", label: "Precio gasolina hoy" },
                    { href: "/precio-diesel-hoy", label: "Precio diesel hoy" },
                    { href: "/incidencias", label: "Incidencias activas" },
                    { href: "/alertas-meteo", label: "Alertas meteorológicas" },
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
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Consulta incidencias, cámaras y precios actualizados cada
                  minuto.
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 bg-tl-600 hover:bg-tl-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  Ver tráfico ahora
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
