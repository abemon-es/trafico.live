"use client";

import Link from "next/link";
import { FileText, ExternalLink } from "lucide-react";
import { KPIGrid, type MunicipalKPIs } from "./KPIGrid";
import type { MunicipalBranding } from "./BrandingShell";

interface MunicipalDashboardProps {
  slug: string;
  name: string;
  branding: MunicipalBranding | null;
  kpis: MunicipalKPIs;
  latitude?: number | null;
  longitude?: number | null;
  hasReport: boolean;
}

export function MunicipalDashboard({
  slug,
  name,
  kpis,
  latitude,
  longitude,
  hasReport,
}: MunicipalDashboardProps) {
  // Map embed URL focused on municipality bounds
  const mapUrl =
    latitude && longitude
      ? `/?lat=${latitude}&lng=${longitude}&zoom=12`
      : "/";

  return (
    <div className="space-y-8">
      {/* KPI Grid */}
      <section>
        <h2 className="text-base font-heading font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wide">
          Estado actual · {name}
        </h2>
        <KPIGrid kpis={kpis} municipioName={name} />
      </section>

      {/* Map preview CTA */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-gray-50 dark:bg-gray-900">
        <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-heading font-semibold text-gray-900 dark:text-white">
              Mapa de tráfico en directo
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Incidencias DGT, cámaras y balizas V16 en {name} y alrededores.
            </p>
          </div>
          <Link
            href={mapUrl}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-tl-600 hover:bg-tl-700 text-white text-sm font-semibold font-heading transition-colors shrink-0"
          >
            Abrir mapa
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* Monthly report CTA */}
      {hasReport && (
        <section className="rounded-xl border border-tl-100 dark:border-tl-900/40 bg-tl-50 dark:bg-tl-900/10 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-tl-600 dark:text-tl-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-heading font-semibold text-gray-900 dark:text-white">
                Informe mensual de movilidad
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Estadísticas de tráfico, incidencias y combustible de los últimos 30 días.
              </p>
            </div>
          </div>
          <Link
            href={`/ayuntamiento/${slug}/informe`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-tl-200 dark:border-tl-700 bg-white dark:bg-gray-900 hover:bg-tl-50 dark:hover:bg-tl-900/20 text-tl-600 dark:text-tl-400 text-sm font-semibold font-heading transition-colors shrink-0"
          >
            Ver informes
          </Link>
        </section>
      )}

      {/* Commercial CTA */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 px-5 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <h3 className="font-heading font-semibold text-gray-900 dark:text-white">
              ¿Quieres la versión branded para tu ayuntamiento?
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Portal personalizado con el logo y colores municipales, informes PDF mensuales
              automáticos y acceso a la API de datos de movilidad.
              Desde <span className="font-mono font-semibold text-tl-600 dark:text-tl-400">499 €/mes</span>.
            </p>
          </div>
          <Link
            href="/api-landing"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-tl-amber-500 hover:bg-tl-amber-600 text-white text-sm font-semibold font-heading transition-colors shrink-0"
          >
            Solicitar información
          </Link>
        </div>
      </section>
    </div>
  );
}
