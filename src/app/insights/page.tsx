import { Metadata } from "next";
import Link from "next/link";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { Newspaper, TrendingUp, CloudLightning, AlertTriangle, Fuel, FileText } from "lucide-react";

export const revalidate = 300;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Insights — Noticias y análisis de tráfico en España",
  description:
    "Análisis automáticos del tráfico en España: alertas de precios de combustible, picos de incidencias, avisos meteorológicos y resúmenes diarios. Datos oficiales DGT, AEMET y MITERD.",
  alternates: {
    canonical: `${BASE_URL}/insights`,
  },
  openGraph: {
    title: "Insights — Noticias y análisis de tráfico",
    description: "Alertas de precios, picos de incidencias, avisos meteorológicos y resúmenes diarios del tráfico en España.",
    url: `${BASE_URL}/insights`,
    type: "website",
  },
};

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  REGULATORY: { label: "Normativa", icon: <FileText className="w-4 h-4" />, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/20" },
  PRICE_ALERT: { label: "Precios", icon: <Fuel className="w-4 h-4" />, color: "text-tl-amber-600 dark:text-tl-amber-400", bg: "bg-tl-amber-50 dark:bg-tl-amber-900/20" },
  INCIDENT_DIGEST: { label: "Incidencias", icon: <AlertTriangle className="w-4 h-4" />, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/20" },
  WEATHER_ALERT: { label: "Meteorología", icon: <CloudLightning className="w-4 h-4" />, color: "text-tl-600 dark:text-tl-400", bg: "bg-tl-50 dark:bg-tl-900/20" },
  NEW_STATION: { label: "Nuevas estaciones", icon: <TrendingUp className="w-4 h-4" />, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/20" },
  DAILY_REPORT: { label: "Informe diario", icon: <Newspaper className="w-4 h-4" />, color: "text-gray-600 dark:text-gray-400", bg: "bg-gray-50 dark:bg-gray-900" },
};

export default async function InsightsPage() {
  const insights = await prisma.insight.findMany({
    orderBy: { publishedAt: "desc" },
    take: 50,
  });

  // Group by category for filter chips
  const categoryCounts: Record<string, number> = {};
  for (const insight of insights) {
    categoryCounts[insight.category] = (categoryCounts[insight.category] || 0) + 1;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Insights", href: "/insights" },
          ]}
        />

        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">
            Insights
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-2xl">
            Análisis automáticos generados a partir de datos oficiales de tráfico, precios de combustible y meteorología en España.
          </p>
        </div>

        {/* Category chips */}
        <div className="flex flex-wrap gap-2 mb-8">
          {Object.entries(categoryCounts).map(([cat, count]) => {
            const config = CATEGORY_CONFIG[cat];
            if (!config) return null;
            return (
              <span
                key={cat}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${config.bg} ${config.color}`}
              >
                {config.icon}
                {config.label} ({count})
              </span>
            );
          })}
        </div>

        {/* Insights list */}
        {insights.length > 0 ? (
          <div className="space-y-4">
            {insights.map((insight) => {
              const config = CATEGORY_CONFIG[insight.category] || CATEGORY_CONFIG.DAILY_REPORT;
              return (
                <Link
                  key={insight.id}
                  href={`/insights/${insight.slug}`}
                  className="block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:shadow-md hover:border-tl-300 dark:hover:border-tl-700 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 p-2.5 rounded-lg ${config.bg}`}>
                      <span className={config.color}>{config.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium ${config.color}`}>
                          {config.label}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(insight.publishedAt).toLocaleDateString("es-ES", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        {insight.source && (
                          <span className="text-xs text-gray-400">· {insight.source}</span>
                        )}
                      </div>
                      <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        {insight.title}
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {insight.summary}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            <Newspaper className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 dark:text-gray-400">No hay insights disponibles todavía.</p>
            <p className="text-sm text-gray-400 mt-2">Los insights se generan automáticamente a partir de datos de tráfico.</p>
          </div>
        )}
      </main>
    </div>
  );
}
