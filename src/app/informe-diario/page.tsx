import { Metadata } from "next";
import Link from "next/link";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";
import { FileText, Calendar, Newspaper, AlertTriangle, BarChart3, MapPin, FolderOpen } from "lucide-react";

export const revalidate = 300;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Informes Diarios de Tráfico — Archivo histórico",
  description:
    "Archivo de informes diarios de tráfico en España: incidencias, precios de combustible y alertas meteorológicas. Resúmenes automáticos generados con datos oficiales DGT, MITERD y AEMET.",
  alternates: {
    canonical: `${BASE_URL}/informe-diario`,
  },
};

export default async function InformeDiarioIndexPage() {
  // Get all daily reports from insights
  const reports = await prisma.article.findMany({
    where: { category: "DAILY_REPORT" },
    orderBy: { publishedAt: "desc" },
    take: 90, // Last ~3 months
    select: {
      slug: true,
      title: true,
      summary: true,
      publishedAt: true,
    },
  });

  // Group by month
  const grouped: Record<string, typeof reports> = {};
  for (const report of reports) {
    const key = report.publishedAt.toLocaleDateString("es-ES", {
      month: "long",
      year: "numeric",
    });
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(report);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Informes Diarios", href: "/informe-diario" },
          ]}
        />

        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">
            Informes Diarios de Tráfico
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-2xl">
            Resumen diario del estado del tráfico, precios de combustible y meteorología en España.
            Generados automáticamente a partir de datos oficiales.
          </p>
        </div>

        {Object.keys(grouped).length > 0 ? (
          <div className="space-y-8">
            {Object.entries(grouped).map(([month, monthReports]) => (
              <section key={month}>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 capitalize flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-tl-600 dark:text-tl-400" />
                  {month}
                </h2>
                <div className="space-y-2">
                  {monthReports.map((report) => {
                    const dateStr = report.publishedAt.toISOString().split("T")[0];
                    const dayLabel = report.publishedAt.toLocaleDateString("es-ES", {
                      weekday: "long",
                      day: "numeric",
                      month: "short",
                    });

                    return (
                      <Link
                        key={report.slug}
                        href={`/informe-diario/${dateStr}`}
                        className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-tl-300 dark:hover:border-tl-700 transition-colors"
                      >
                        <div className="flex-shrink-0 w-12 h-12 bg-tl-50 dark:bg-tl-900/20 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-tl-600 dark:text-tl-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-gray-100 text-sm capitalize">{dayLabel}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{report.summary}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 dark:text-gray-400">No hay informes diarios disponibles todavía.</p>
            <p className="text-sm text-gray-400 mt-2">Los informes se generan automáticamente al final de cada día.</p>
          </div>
        )}

        <RelatedLinks links={[
          { title: "Noticias de tráfico", description: "Últimas noticias y análisis del tráfico en España", href: "/noticias", icon: <Newspaper className="w-5 h-5" /> },
          { title: "Incidencias en tiempo real", description: "Cortes, obras y accidentes activos en España", href: "/incidencias", icon: <AlertTriangle className="w-5 h-5" /> },
          { title: "Estadísticas de tráfico", description: "Datos históricos de siniestralidad vial", href: "/estadisticas", icon: <BarChart3 className="w-5 h-5" /> },
          { title: "Estado del tráfico hoy", description: "Mapa interactivo con incidencias en tiempo real", href: "/trafico", icon: <MapPin className="w-5 h-5" /> },
          { title: "Todos los informes", description: "Archivo completo de informes de tráfico", href: "/informes", icon: <FolderOpen className="w-5 h-5" /> },
        ]} />
      </main>
    </div>
  );
}
