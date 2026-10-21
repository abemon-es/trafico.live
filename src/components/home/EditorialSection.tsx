import Link from "next/link";
import type { HomeArticle } from "./counts";

// Four made-up articles («Tráfico hoy: miércoles 2 de abril — 342 incidencias
// activas») sat here from the April redesign, all four linking to a 404. The
// cards are now the latest published articles, and no section without them.
const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  DAILY_REPORT: { label: "Informe diario", color: "text-tl-600" },
  WEEKLY_REPORT: { label: "Informe semanal", color: "text-tl-600" },
  MONTHLY_REPORT: { label: "Informe mensual", color: "text-tl-600" },
  ANNUAL_REPORT: { label: "Informe anual", color: "text-tl-600" },
  PRICE_ALERT: { label: "Precios", color: "text-tl-amber-500" },
  FUEL_TREND: { label: "Combustible", color: "text-tl-amber-500" },
  INCIDENT_DIGEST: { label: "Incidencias", color: "text-signal-red" },
  WEATHER_ALERT: { label: "Meteorología", color: "text-signal-red" },
  ROAD_ANALYSIS: { label: "Carreteras", color: "text-signal-green" },
  ANALYSIS: { label: "Análisis", color: "text-tl-amber-500" },
  GUIDE: { label: "Guía", color: "text-signal-green" },
  REGULATORY: { label: "Normativa", color: "text-signal-green" },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Madrid",
  });
}

export function EditorialSection({ articles }: { articles: HomeArticle[] }) {
  if (articles.length === 0) return null;

  return (
    <section className="py-18 px-4 sm:px-6 lg:px-8 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between mb-7">
          <div>
            <p className="font-heading text-xs font-semibold uppercase tracking-widest text-tl-600 mb-1">
              Publicaciones
            </p>
            <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">
              Análisis y noticias
            </h2>
          </div>
          <Link
            href="/noticias"
            className="text-xs font-medium text-tl-600 hover:text-tl-700 dark:text-tl-400 dark:hover:text-tl-300 whitespace-nowrap"
          >
            Ver todas &rarr;
          </Link>
        </div>

        {/* 4-column article grid — 1px gap pattern */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-gray-200 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          {articles.map((article) => {
            const category = CATEGORY_LABELS[article.category] ?? { label: "Noticias", color: "text-tl-600" };
            return (
              <Link
                key={article.slug}
                href={`/noticias/${article.slug}`}
                className="bg-white dark:bg-gray-900 p-5 flex flex-col hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <p className={`font-heading text-xs font-semibold uppercase tracking-wider mb-2 ${category.color}`}>
                  {category.label}
                </p>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug mb-1.5">
                  {article.title}
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed line-clamp-3 flex-1">
                  {article.summary}
                </p>
                <time dateTime={article.publishedAt} className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                  {formatDate(article.publishedAt)}
                </time>
              </Link>
            );
          })}
        </div>

        {/* SEO paragraph */}
        <p className="mt-6 text-xs text-gray-400 dark:text-gray-500 leading-relaxed max-w-3xl">
          trafico.live publica informes diarios de tráfico, análisis de precios de combustible, reportajes de seguridad vial y noticias sobre movilidad urbana y zonas de bajas emisiones. Nuestro contenido se genera a partir de datos oficiales de la DGT, AEMET y el Ministerio de Transportes.
        </p>
      </div>
    </section>
  );
}
