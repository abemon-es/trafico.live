"use client";

import { fetcher } from "@/lib/fetcher";
import useSWR from "swr";
import {
  Train,
  MapPin,
  Route,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Info,
} from "lucide-react";

const NETWORKS: { slug: string; name: string; region: string }[] = [
  { slug: "madrid", name: "Madrid", region: "Comunidad de Madrid" },
  { slug: "barcelona", name: "Barcelona", region: "Cataluña" },
  { slug: "valencia", name: "Valencia", region: "Comunidad Valenciana" },
  { slug: "sevilla", name: "Sevilla", region: "Andalucía" },
  { slug: "malaga", name: "Málaga", region: "Andalucía" },
  { slug: "bilbao", name: "Bilbao", region: "País Vasco" },
  { slug: "asturias", name: "Asturias", region: "Principado de Asturias" },
  { slug: "santander", name: "Santander", region: "Cantabria" },
  { slug: "cadiz", name: "Cádiz", region: "Andalucía" },
  { slug: "murcia-alicante", name: "Murcia/Alicante", region: "Murcia · C. Valenciana" },
  { slug: "zaragoza", name: "Zaragoza", region: "Aragón" },
  { slug: "san-sebastian", name: "San Sebastián", region: "País Vasco" },
];

// Network accent colors — one per network for visual distinction
const NETWORK_COLORS: Record<string, string> = {
  madrid: "#dc2626",
  barcelona: "#7c3aed",
  valencia: "#d97706",
  sevilla: "#059669",
  malaga: "#0891b2",
  bilbao: "#16a34a",
  asturias: "#ca8a04",
  santander: "#0369a1",
  cadiz: "#c026d3",
  "murcia-alicante": "#ea580c",
  zaragoza: "#0d9488",
  "san-sebastian": "#4f46e5",
};

function NetworkCard({ network, stats }: {
  network: typeof NETWORKS[0];
  stats: { stations: number; routes: number; alerts: number } | null;
}) {
  const color = NETWORK_COLORS[network.slug] || "var(--tl-primary)";

  return (
    <a
      href={`/trenes/cercanias/${network.slug}`}
      className="group flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-[var(--tl-primary)] hover:shadow-md transition-all duration-200"
    >
      {/* Color bar */}
      <div
        className="h-1 w-full rounded-full mb-4 opacity-80"
        style={{ backgroundColor: color }}
      />

      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="font-heading font-bold text-lg text-gray-900 dark:text-gray-100 group-hover:text-[var(--tl-primary)] transition-colors">
            {network.name}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{network.region}</p>
        </div>
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}18` }}
        >
          <Train className="w-5 h-5" style={{ color }} />
        </div>
      </div>

      {/* Stats */}
      {stats ? (
        <div className="grid grid-cols-3 gap-2 mt-auto">
          <div className="text-center">
            <p className="text-lg font-heading font-bold font-mono text-gray-900 dark:text-gray-100">
              {stats.stations}
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center justify-center gap-0.5">
              <MapPin className="w-2.5 h-2.5" />
              Estaciones
            </p>
          </div>
          <div className="text-center">
            <p className="text-lg font-heading font-bold font-mono text-gray-900 dark:text-gray-100">
              {stats.routes}
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center justify-center gap-0.5">
              <Route className="w-2.5 h-2.5" />
              Líneas
            </p>
          </div>
          <div className="text-center">
            <p className={`text-lg font-heading font-bold font-mono ${stats.alerts > 0 ? "text-[var(--tl-danger)]" : "text-[var(--tl-success)]"}`}>
              {stats.alerts}
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center justify-center gap-0.5">
              <AlertTriangle className="w-2.5 h-2.5" />
              Alertas
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center py-3 mt-auto">
          <Loader2 className="w-4 h-4 animate-spin text-gray-300" />
        </div>
      )}

      <div className="flex items-center gap-1 mt-4 text-xs text-[var(--tl-primary)] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
        Ver red <ArrowRight className="w-3.5 h-3.5" />
      </div>
    </a>
  );
}

function NetworkCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 animate-pulse">
      <div className="h-1 w-full rounded-full mb-4 bg-gray-200 dark:bg-gray-700" />
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-2">
          <div className="h-5 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-3 w-20 bg-gray-100 dark:bg-gray-700 rounded" />
        </div>
        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700" />
      </div>
      <div className="grid grid-cols-3 gap-2 mt-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="text-center space-y-1">
            <div className="h-6 w-8 mx-auto bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-3 w-12 mx-auto bg-gray-100 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CercaniasContent() {
  // Fetch global route stats (byNetwork breakdown)
  const { data: routeStatsData } = useSWR(
    `/api/trenes/rutas?limit=1`,
    fetcher,
    { revalidateOnFocus: false }
  );

  // Fetch active alerts
  const { data: alertsData } = useSWR(
    `/api/trenes/alertas?active=true`,
    fetcher,
    { refreshInterval: 120000 }
  );

  const byNetwork: Record<string, number> = routeStatsData?.data?.stats?.byNetwork || {};
  const alerts: { routeIds?: string[]; network?: string }[] = alertsData?.data?.alerts || [];

  // Count alerts per network (best-effort: check if alert mentions network name)
  function alertsForNetwork(name: string): number {
    return alerts.filter((a) => {
      const desc = JSON.stringify(a).toLowerCase();
      return desc.includes(name.toLowerCase().split("/")[0]);
    }).length;
  }

  // Build stats per network from the fetched data
  function statsForNetwork(slug: string, name: string) {
    if (!routeStatsData) return null;
    // Try to match by network name or slug in byNetwork map
    const key = Object.keys(byNetwork).find(
      (k) => k.toLowerCase() === name.toLowerCase() ||
             k.toLowerCase() === slug.toLowerCase() ||
             k.toLowerCase().replace(/\s/g, "-") === slug
    );
    return {
      stations: 0, // Stations fetched per-page to avoid 12 extra requests on overview
      routes: key ? byNetwork[key] : 0,
      alerts: alertsForNetwork(name),
    };
  }

  const loaded = !!routeStatsData;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold text-gray-900 dark:text-gray-100">
          Cercanías de España
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1.5">
          12 redes regionales · Estaciones, líneas y alertas en tiempo real
        </p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { icon: Train, label: "Redes operativas", value: "12", color: "text-[var(--tl-primary)]" },
          {
            icon: Route,
            label: "Líneas totales",
            value: loaded
              ? Object.values(byNetwork).reduce((a, b) => a + b, 0).toLocaleString("es-ES")
              : "—",
            color: "text-gray-900 dark:text-gray-100",
          },
          {
            icon: AlertTriangle,
            label: "Alertas activas",
            value: loaded ? String(alerts.length) : "—",
            color: alerts.length > 0 ? "text-[var(--tl-danger)]" : "text-[var(--tl-success)]",
          },
        ].map((s, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-lg bg-[var(--tl-primary-bg)] flex items-center justify-center shrink-0">
              <s.icon className="w-4.5 h-4.5 text-[var(--tl-primary)]" />
            </div>
            <div>
              <p className={`text-xl font-heading font-bold font-mono ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Network grid */}
      <div>
        <h2 className="font-heading font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wider mb-4">
          Redes de Cercanías
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {NETWORKS.map((network) =>
            loaded ? (
              <NetworkCard
                key={network.slug}
                network={network}
                stats={statsForNetwork(network.slug, network.name)}
              />
            ) : (
              <NetworkCardSkeleton key={network.slug} />
            )
          )}
        </div>
      </div>

      {/* Active alerts banner (if any) */}
      {alerts.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <h3 className="flex items-center gap-2 font-heading font-semibold text-red-700 dark:text-red-400 mb-3">
            <AlertTriangle className="w-4.5 h-4.5" />
            Alertas activas en la red ({alerts.length})
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {alerts.slice(0, 10).map((a: Record<string, unknown>, i) => (
              <div
                key={i}
                className="text-sm text-red-700 dark:text-red-300 flex items-start gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 mt-1.5" />
                {String(a.description || a.header || "Incidencia activa")}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Link back to full map */}
      <div className="bg-[var(--tl-primary-bg)] dark:bg-[var(--tl-primary-bg)] border border-[var(--tl-primary)]/20 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <p className="font-heading font-semibold text-[var(--tl-primary)] text-sm">
            Mapa interactivo ferroviario
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
            Visualiza todas las redes, estaciones y trenes en tiempo real en el mapa nacional
          </p>
        </div>
        <a
          href="/trenes"
          className="shrink-0 flex items-center gap-1.5 bg-[var(--tl-primary)] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[var(--tl-primary-hover)] transition-colors"
        >
          <Train className="w-4 h-4" />
          Ir al mapa
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Attribution */}
      <p className="flex items-center gap-1.5 text-[11px] text-gray-400">
        <Info className="w-3 h-3 shrink-0" />
        Datos: Renfe Operadora (CC-BY 4.0). Alertas actualizadas cada 2 minutos.
      </p>
    </div>
  );
}
