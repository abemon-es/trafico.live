"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import {
  Cloud,
  CloudRain,
  CloudSnow,
  Wind,
  Thermometer,
  Zap,
  Waves,
  Eye,
  Snowflake,
  RefreshCw,
  AlertTriangle,
  Filter,
  MapPin,
  Clock,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";

// ─── Types ────────────────────────────────────────────────────────────────────

type WeatherAlertType =
  | "RAIN"
  | "SNOW"
  | "ICE"
  | "FOG"
  | "WIND"
  | "TEMPERATURE"
  | "STORM"
  | "COASTAL"
  | "OTHER";

type Severity = "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";

interface WeatherAlert {
  id: string;
  type: WeatherAlertType;
  severity: Severity;
  province: string;
  provinceName: string | null;
  startedAt: string;
  endedAt: string | null;
  description: string | null;
  isActive: boolean;
}

interface WeatherAlertsResponse {
  totalActive: number;
  count: number;
  lastUpdated: string;
  counts: {
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
    byProvince: Record<string, { count: number; name: string | null }>;
  };
  alerts: WeatherAlert[];
}

// ─── Config maps ──────────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<
  Severity,
  { label: string; color: string; bg: string; border: string; badge: string }
> = {
  VERY_HIGH: {
    label: "Extremo",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-500",
    badge: "bg-red-600 text-white",
  },
  HIGH: {
    label: "Severo",
    color: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-500",
    badge: "bg-orange-500 text-white",
  },
  MEDIUM: {
    label: "Moderado",
    color: "text-yellow-700",
    bg: "bg-yellow-50",
    border: "border-yellow-500",
    badge: "bg-yellow-400 text-yellow-900",
  },
  LOW: {
    label: "Bajo",
    color: "text-green-700",
    bg: "bg-green-50",
    border: "border-green-500",
    badge: "bg-green-500 text-white",
  },
};

const TYPE_CONFIG: Record<
  WeatherAlertType,
  { label: string; Icon: React.ElementType }
> = {
  RAIN: { label: "Lluvia", Icon: CloudRain },
  SNOW: { label: "Nieve", Icon: CloudSnow },
  ICE: { label: "Hielo", Icon: Snowflake },
  FOG: { label: "Niebla", Icon: Eye },
  WIND: { label: "Viento", Icon: Wind },
  TEMPERATURE: { label: "Temperaturas", Icon: Thermometer },
  STORM: { label: "Tormentas", Icon: Zap },
  COASTAL: { label: "Oleaje", Icon: Waves },
  OTHER: { label: "Otros", Icon: AlertTriangle },
};

const SEVERITY_ORDER: Severity[] = ["VERY_HIGH", "HIGH", "MEDIUM", "LOW"];

// ─── Fetcher ──────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ─── Helper components ────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: Severity }) {
  const cfg = SEVERITY_CONFIG[severity];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.badge}`}
    >
      {cfg.label}
    </span>
  );
}

function TypeIcon({
  type,
  className = "w-5 h-5",
}: {
  type: WeatherAlertType;
  className?: string;
}) {
  const { Icon } = TYPE_CONFIG[type];
  return <Icon className={className} />;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  });
}

// ─── Alert card ───────────────────────────────────────────────────────────────

function AlertCard({ alert }: { alert: WeatherAlert }) {
  const sev = SEVERITY_CONFIG[alert.severity];
  const typ = TYPE_CONFIG[alert.type];
  const TypeIconCmp = typ.Icon;

  return (
    <article
      className={`rounded-xl border border-l-4 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow ${sev.border}`}
    >
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className={`${sev.color} flex-shrink-0`}>
              <TypeIconCmp className="w-5 h-5" />
            </span>
            <span className="font-semibold text-gray-900 text-sm">
              {typ.label}
            </span>
            <SeverityBadge severity={alert.severity} />
          </div>
        </div>

        {/* Province */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="font-medium text-gray-700">
            {alert.provinceName ?? alert.province}
          </span>
        </div>

        {/* Description */}
        {alert.description && (
          <p className="text-sm text-gray-600 leading-relaxed mb-3 line-clamp-3">
            {alert.description}
          </p>
        )}

        {/* Timing */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Desde {formatTime(alert.startedAt)}
          </span>
          {alert.endedAt && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Hasta {formatTime(alert.endedAt)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

// ─── Main content ─────────────────────────────────────────────────────────────

export function AlertasMeteoContent() {
  const [filterSeverity, setFilterSeverity] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterProvince, setFilterProvince] = useState<string>("");

  // Build API URL with filters
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (filterProvince) params.set("province", filterProvince);
    if (filterSeverity) params.set("severity", filterSeverity);
    if (filterType) params.set("type", filterType);
    const qs = params.toString();
    return `/api/weather-alerts${qs ? `?${qs}` : ""}`;
  }, [filterProvince, filterSeverity, filterType]);

  const { data, error, isLoading, mutate } = useSWR<WeatherAlertsResponse>(
    apiUrl,
    fetcher,
    {
      refreshInterval: 5 * 60 * 1000, // 5 minutes
      revalidateOnFocus: true,
    }
  );

  const lastUpdated = data?.lastUpdated
    ? formatDateTime(data.lastUpdated)
    : null;

  // Sort alerts: most severe first, then most recent
  const sortedAlerts = useMemo(() => {
    if (!data?.alerts) return [];
    return [...data.alerts].sort((a, b) => {
      const severityRank: Record<Severity, number> = {
        VERY_HIGH: 0,
        HIGH: 1,
        MEDIUM: 2,
        LOW: 3,
      };
      const sevDiff =
        (severityRank[a.severity] ?? 4) - (severityRank[b.severity] ?? 4);
      if (sevDiff !== 0) return sevDiff;
      return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
    });
  }, [data?.alerts]);

  // Unique provinces from counts for filter dropdown
  const provinces = useMemo(() => {
    if (!data?.counts.byProvince) return [];
    return Object.entries(data.counts.byProvince)
      .map(([code, { name }]) => ({ code, name: name ?? code }))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [data?.counts.byProvince]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Alertas Meteorológicas", href: "/alertas-meteo" },
          ]}
        />

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Cloud className="w-8 h-8 text-tl-600 flex-shrink-0" />
              Alertas Meteorológicas
            </h1>
            <p className="mt-1 text-gray-500 text-sm">
              Avisos AEMET en tiempo real para carreteras españolas
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {lastUpdated && (
              <span className="text-xs text-gray-400 hidden sm:block">
                Act. {lastUpdated}
              </span>
            )}
            <button
              onClick={() => mutate()}
              disabled={isLoading}
              aria-label="Actualizar alertas"
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          </div>
        </div>

        {/* Severity summary badges */}
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {SEVERITY_ORDER.map((sev) => {
              const count = data.counts.bySeverity[sev] ?? 0;
              const cfg = SEVERITY_CONFIG[sev];
              return (
                <button
                  key={sev}
                  onClick={() =>
                    setFilterSeverity(filterSeverity === sev ? "" : sev)
                  }
                  className={`rounded-xl border-2 p-4 text-left transition-all ${
                    filterSeverity === sev
                      ? `${cfg.border} ${cfg.bg} shadow-sm`
                      : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                  }`}
                >
                  <div
                    className={`text-2xl font-bold ${
                      filterSeverity === sev ? cfg.color : "text-gray-900"
                    }`}
                  >
                    {count}
                  </div>
                  <div className="text-xs font-semibold text-gray-500 mt-0.5">
                    {cfg.label}
                  </div>
                  <div
                    className={`h-1 rounded-full mt-2 ${
                      filterSeverity === sev
                        ? cfg.border.replace("border-", "bg-")
                        : "bg-gray-100"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        )}

        {/* Alert type breakdown */}
        {data && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Por tipo de fenómeno
            </h2>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(TYPE_CONFIG) as WeatherAlertType[]).map((type) => {
                const count = data.counts.byType[type] ?? 0;
                if (count === 0) return null;
                const cfg = TYPE_CONFIG[type];
                const Icon = cfg.Icon;
                const isActive = filterType === type;
                return (
                  <button
                    key={type}
                    onClick={() =>
                      setFilterType(filterType === type ? "" : type)
                    }
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      isActive
                        ? "bg-tl-600 text-white border-tl-600 shadow-sm"
                        : "bg-white text-gray-600 border-gray-200 hover:border-tl-300 hover:text-tl-700"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {cfg.label}
                    <span
                      className={`text-xs font-bold ${
                        isActive ? "text-tl-100" : "text-gray-400"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Filters row */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-600 mr-1">
              <Filter className="w-4 h-4" />
              Filtros
            </div>

            {/* Province filter */}
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Provincia
              </label>
              <select
                value={filterProvince}
                onChange={(e) => setFilterProvince(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-tl-400 focus:border-transparent"
              >
                <option value="">Todas las provincias</option>
                {provinces.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Severity filter */}
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Severidad
              </label>
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-tl-400 focus:border-transparent"
              >
                <option value="">Todas</option>
                {SEVERITY_ORDER.map((sev) => (
                  <option key={sev} value={sev}>
                    {SEVERITY_CONFIG[sev].label}
                  </option>
                ))}
              </select>
            </div>

            {/* Type filter */}
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Tipo
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-tl-400 focus:border-transparent"
              >
                <option value="">Todos los tipos</option>
                {(Object.keys(TYPE_CONFIG) as WeatherAlertType[]).map(
                  (type) => (
                    <option key={type} value={type}>
                      {TYPE_CONFIG[type].label}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Clear filters */}
            {(filterSeverity || filterType || filterProvince) && (
              <button
                onClick={() => {
                  setFilterSeverity("");
                  setFilterType("");
                  setFilterProvince("");
                }}
                className="text-sm text-tl-600 hover:text-tl-800 font-medium underline underline-offset-2 self-end pb-2"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* Results count */}
        {data && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              Mostrando{" "}
              <span className="font-semibold text-gray-900">{data.count}</span>
              {data.totalActive !== data.count && (
                <> de {data.totalActive} alertas activas</>
              )}{" "}
              {data.count === 1 ? "alerta" : "alertas"}
            </p>
            {lastUpdated && (
              <p className="text-xs text-gray-400 sm:hidden">
                Act. {lastUpdated}
              </p>
            )}
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            <span className="text-sm">Cargando alertas...</span>
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-red-700">
              Error al cargar las alertas
            </p>
            <button
              onClick={() => mutate()}
              className="mt-3 text-xs text-red-600 underline hover:text-red-800"
            >
              Intentar de nuevo
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && data && data.alerts.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
            <Cloud className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="text-lg font-semibold text-gray-700">
              Sin alertas activas
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {filterSeverity || filterType || filterProvince
                ? "No hay alertas con los filtros seleccionados."
                : "No hay alertas meteorológicas activas en este momento."}
            </p>
          </div>
        )}

        {/* Alert cards grid */}
        {!isLoading && data && sortedAlerts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sortedAlerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        )}

        {/* Related links */}
        <RelatedLinks
          title="También te puede interesar"
          links={[
            {
              title: "Incidencias de tráfico",
              description:
                "Accidentes, obras y cortes en carreteras en tiempo real.",
              href: "/incidencias",
              icon: <AlertTriangle className="w-5 h-5" />,
            },
            {
              title: "Operaciones de tráfico",
              description:
                "Operaciones especiales DGT: salidas, regresos, puentes.",
              href: "/operaciones",
              icon: <Cloud className="w-5 h-5" />,
            },
            {
              title: "Cámaras de tráfico",
              description:
                "Imágenes en directo de la DGT en las principales carreteras.",
              href: "/camaras",
              icon: <Eye className="w-5 h-5" />,
            },
            {
              title: "Carreteras de España",
              description:
                "Consulta el estado de autopistas, autovías y nacionales.",
              href: "/carreteras",
              icon: <MapPin className="w-5 h-5" />,
            },
          ]}
        />
      </div>
    </div>
  );
}
