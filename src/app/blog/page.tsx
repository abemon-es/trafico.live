import { Metadata } from "next";
import Link from "next/link";
import { Calendar, Clock, BookOpen, ChevronRight } from "lucide-react";
import {
  ARTICLES,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  formatDate,
} from "./articles";

export const metadata: Metadata = {
  title: "Blog — Noticias y Guías de Tráfico en España",
  description:
    "Guías prácticas, noticias y consejos sobre tráfico en España: baliza V16, zonas de bajas emisiones, cómo ahorrar gasolina y mucho más.",
  keywords: [
    "blog tráfico",
    "guías tráfico España",
    "baliza V16",
    "zonas bajas emisiones",
    "ahorrar gasolina",
    "noticias DGT",
  ],
  openGraph: {
    title: "Blog — Noticias y Guías de Tráfico en España | trafico.live",
    description:
      "Guías prácticas, noticias y consejos sobre tráfico en España.",
    type: "website",
  },
  alternates: {
    canonical: "https://trafico.live/blog",
  },
};

// Article placeholder colors by category (no external images needed)
const CATEGORY_GRADIENT: Record<string, string> = {
  guía: "from-tl-500 to-tl-700",
  actualidad: "from-orange-500 to-orange-700",
  seguridad: "from-red-500 to-red-700",
  combustible: "from-tl-amber-500 to-tl-amber-700",
};

const CATEGORY_ICON: Record<string, string> = {
  guía: "📖",
  actualidad: "📰",
  seguridad: "⚠️",
  combustible: "⛽",
};

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav aria-label="Ruta de navegación" className="mb-6">
          <ol className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <li>
              <Link href="/" className="hover:text-tl-600 dark:text-tl-400 transition-colors">
                Inicio
              </Link>
            </li>
            <li>
              <ChevronRight className="w-3.5 h-3.5" />
            </li>
            <li className="text-gray-900 dark:text-gray-100 font-medium">Blog</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-tl-100 dark:bg-tl-900/30 rounded-lg">
              <BookOpen className="w-6 h-6 text-tl-600 dark:text-tl-400" />
            </div>
            <span className="text-sm font-medium text-tl-600 dark:text-tl-400 uppercase tracking-wider">
              Blog
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            Blog de Tráfico
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl">
            Guías prácticas, noticias y consejos sobre circulación, normativa vial
            y combustible en España.
          </p>
        </div>

        {/* Articles grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ARTICLES.map((article) => (
            <Link
              key={article.slug}
              href={`/blog/${article.slug}`}
              className="group flex flex-col bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-tl-300 transition-all duration-200 overflow-hidden"
            >
              {/* Image placeholder */}
              <div
                className={`h-40 bg-gradient-to-br ${CATEGORY_GRADIENT[article.category]} flex items-center justify-center`}
              >
                <span className="text-5xl" role="img" aria-hidden="true">
                  {CATEGORY_ICON[article.category]}
                </span>
              </div>

              {/* Content */}
              <div className="flex flex-col flex-1 p-5">
                {/* Category badge */}
                <span
                  className={`self-start text-xs font-semibold px-2 py-0.5 rounded-full mb-3 ${CATEGORY_COLORS[article.category]}`}
                >
                  {CATEGORY_LABELS[article.category]}
                </span>

                {/* Title */}
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 leading-snug mb-2 group-hover:text-tl-600 dark:text-tl-400 transition-colors line-clamp-2">
                  {article.title}
                </h2>

                {/* Excerpt */}
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed flex-1 line-clamp-3 mb-4">
                  {article.excerpt}
                </p>

                {/* Meta */}
                <div className="flex items-center gap-4 text-xs text-gray-400 mt-auto pt-3 border-t border-gray-100 dark:border-gray-800">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(article.date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {article.readTime} lectura
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-800 rounded-xl p-6 text-center">
          <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">
            ¿Quieres el tráfico en tiempo real?
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Consulta incidencias, cámaras DGT y precios de combustible actualizados
            cada minuto.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-tl-600 hover:bg-tl-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
          >
            Ver tráfico ahora
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}
