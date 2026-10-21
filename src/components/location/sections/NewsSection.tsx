import { Newspaper } from "lucide-react";
import { GeoEntity } from "@/lib/geo/types";
import { getLocationNews } from "@/lib/data/location-data";

interface NewsSectionProps {
  entity: GeoEntity;
  limit?: number;
  spokeHref?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  DAILY_REPORT: "Informe diario",
  WEEKLY_REPORT: "Informe semanal",
  PRICE_ALERT: "Alerta precio",
  INCIDENT_DIGEST: "Resumen incidencias",
  WEATHER_ALERT: "Alerta meteo",
  FUEL_TREND: "Tendencia combustible",
  MONTHLY_REPORT: "Informe mensual",
  ANNUAL_REPORT: "Informe anual",
  ROAD_ANALYSIS: "Análisis vía",
  GUIDE: "Guía",
  NEWS: "Noticia",
  ANALYSIS: "Análisis",
  REGULATORY: "Normativa",
};

const CATEGORY_COLORS: Record<string, string> = {
  DAILY_REPORT: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300",
  WEEKLY_REPORT: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200",
  MONTHLY_REPORT: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200",
  ANNUAL_REPORT: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300",
  PRICE_ALERT: "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200",
  INCIDENT_DIGEST: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300",
  WEATHER_ALERT: "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200",
  FUEL_TREND: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300",
  ROAD_ANALYSIS: "bg-tl-100 dark:bg-tl-900/30 text-tl-800 dark:text-tl-200",
  GUIDE: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300",
  NEWS: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
  ANALYSIS: "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300",
  REGULATORY: "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200",
};

export async function NewsSection({
  entity,
  limit = 4,
  spokeHref,
}: NewsSectionProps) {
  const { items, total } = await getLocationNews(entity, limit);

  if (items.length === 0) return null;

  return (
    <section
      id="noticias"
      className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-tl-600 dark:text-tl-400" />
          <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-gray-100">
            Noticias sobre {entity.name}
          </h2>
          <span className="w-1.5 h-1.5 rounded-full bg-tl-amber-400 shrink-0" title="Actualizado frecuentemente"></span>
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500 font-data">
          {total} artículo{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Horizontal scroll of article cards */}
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
        {items.map((article) => (
          <a
            key={article.id}
            href={`/noticias/${article.slug}`}
            className="flex-shrink-0 w-64 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 overflow-hidden hover:border-tl-200 dark:hover:border-tl-700 hover:shadow-sm transition-all group"
          >
            {/* Image placeholder or article image */}
            {article.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={article.imageUrl}
                alt={article.title}
                loading="lazy"
                className="w-full h-32 object-cover"
              />
            )}

            <div className="p-3">
              {/* Category tag */}
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  CATEGORY_COLORS[article.category] ??
                  "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                }`}
              >
                {CATEGORY_LABELS[article.category] ?? article.category}
              </span>

              {/* Title */}
              <h3 className="font-heading text-sm font-semibold text-gray-900 dark:text-gray-100 mt-2 line-clamp-2 group-hover:text-tl-700 transition-colors">
                {article.title}
              </h3>

              {/* Summary */}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                {article.summary}
              </p>

              {/* Date */}
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-data mt-2">
                {new Date(article.publishedAt).toLocaleDateString("es-ES", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </a>
        ))}
      </div>

      {/* CTA */}
      {spokeHref && total > limit && (
        <a
          href={
            spokeHref ?? `/noticias/tag/${entity.slug}`
          }
          className="mt-4 inline-flex items-center gap-1 text-sm text-tl-600 dark:text-tl-400 hover:text-tl-700 dark:hover:text-tl-300 font-medium"
        >
          Ver los {total} artículos →
        </a>
      )}
    </section>
  );
}
