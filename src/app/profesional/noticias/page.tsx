import { Metadata } from "next";
import Link from "next/link";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import {
  Truck, Newspaper, Fuel, AlertTriangle, TrendingUp,
  BarChart3, Calendar, Clock, ChevronRight, FileText,
  CloudLightning, BookOpen, Megaphone, Scale,
} from "lucide-react";

export const revalidate = 300;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Noticias para Profesionales del Transporte",
  description:
    "Informes de combustible, alertas de incidencias, tendencias semanales y novedades regulatorias para flotas y transportistas profesionales.",
  keywords: [
    "noticias transporte profesional",
    "precios diesel flotas",
    "alertas tráfico transportistas",
    "tendencia combustible semanal",
    "normativa transporte España",
  ],
  alternates: {
    canonical: `${BASE_URL}/profesional/noticias`,
  },
  openGraph: {
    title: "Noticias para Profesionales del Transporte",
    description:
      "Informes, alertas y tendencias para flotas y transportistas.",
    url: `${BASE_URL}/profesional/noticias`,
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
  WEATHER_ALERT: {
    label: "Meteorología",
    icon: <CloudLightning className="w-4 h-4" />,
    color: "text-tl-600 dark:text-tl-400",
    bg: "bg-tl-50 dark:bg-tl-900/20",
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

export default async function ProfesionalNoticiasPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.pagina || "1"));
  const perPage = 18;

  // Find the profesional tag
  const proTag = await prisma.tag.findUnique({
    where: { slug: "profesional" },
  });

  // Query articles tagged as profesional
  const where = {
    status: "PUBLISHED" as const,
    ...(proTag
      ? { tags: { some: { tagId: proTag.id } } }
      : { id: "none" }), // no tag yet → no results (graceful)
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
    name: "Noticias para Profesionales del Transporte",
    description:
      "Informes, alertas y tendencias para flotas y transportistas.",
    url: `${BASE_URL}/profesional/noticias`,
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
            { name: "Profesional", href: "/profesional" },
            { name: "Noticias", href: "/profesional/noticias" },
          ]}
        />

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-tl-100 dark:bg-tl-900/30 rounded-lg">
              <Truck className="w-6 h-6 text-tl-600 dark:text-tl-400" />
            </div>
            <span className="text-sm font-medium text-tl-600 dark:text-tl-400 uppercase tracking-wider">
              Profesional
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            Noticias para profesionales
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl">
            Informes de combustible, alertas de incidencias y tendencias
            semanales para flotas y transportistas.
          </p>
        </div>

        {/* Quick access pills */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Link
            href="/profesional/diesel"
            className="px-4 py-2 rounded-full text-sm font-medium bg-tl-amber-50 dark:bg-tl-amber-900/20 text-tl-amber-600 dark:text-tl-amber-400 border border-tl-amber-200 dark:border-tl-amber-800 hover:bg-tl-amber-100 dark:hover:bg-tl-amber-900/30 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Fuel className="w-3.5 h-3.5" />
              Diésel más barato
            </span>
          </Link>
          <Link
            href="/profesional/areas"
            className="px-4 py-2 rounded-full text-sm font-medium bg-tl-50 dark:bg-tl-900/20 text-tl-600 dark:text-tl-400 border border-tl-200 dark:border-tl-800 hover:bg-tl-100 dark:hover:bg-tl-900/30 transition-colors"
          >
            Áreas de descanso
          </Link>
          <Link
            href="/restricciones"
            className="px-4 py-2 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Restricciones
          </Link>
          <Link
            href="/noticias"
            className="px-4 py-2 rounded-full text-sm font-medium bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:border-tl-300 dark:hover:border-tl-700 transition-colors"
          >
            Todas las noticias →
          </Link>
        </div>

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
                  className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden hover:shadow-md hover:border-tl-300 dark:hover:border-tl-700 transition-all"
                >
                  <div className="p-5">
                    {/* Category badge */}
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}
                      >
                        {config.icon}
                        {config.label}
                      </span>
                      {article.source && (
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                          {article.source}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2 group-hover:text-tl-600 dark:group-hover:text-tl-400 transition-colors">
                      {article.title}
                    </h2>

                    {/* Summary */}
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                      {article.summary}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center gap-3 text-[11px] text-gray-400 dark:text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {article.publishedAt?.toLocaleDateString("es-ES", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                      {article.readTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {article.readTime}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            <FileText className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Todavía no hay noticias profesionales
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-sm mx-auto">
              Los informes de combustible, alertas y tendencias para
              profesionales se generan automáticamente. Vuelve pronto.
            </p>
            <Link
              href="/noticias"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-tl-600 dark:text-tl-400 hover:underline"
            >
              Ver todas las noticias
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            {page > 1 && (
              <Link
                href={`/profesional/noticias?pagina=${page - 1}`}
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
                href={`/profesional/noticias?pagina=${page + 1}`}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-tl-300 transition-colors"
              >
                Siguiente →
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
