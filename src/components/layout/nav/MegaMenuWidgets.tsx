"use client";

import useSWR from "swr";
import { AlertTriangle, Fuel, Activity, TrendingDown, TrendingUp, Minus } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ─── Traffic hub stats (for Tráfico panel hub column) ─────────────────────────
export function TrafficHubStats() {
  const { data } = useSWR("/api/stats", fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  });

  if (!data || data.isError) return null;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-signal-red opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-signal-red" />
        </span>
        <span className="text-xs text-gray-600 dark:text-gray-300">
          <span className="font-mono font-bold text-gray-900 dark:text-gray-50">
            {data.incidents}
          </span>{" "}
          incidencias
        </span>
      </div>

      <div className="flex items-center gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-signal-amber" />
        <span className="text-xs text-gray-600 dark:text-gray-300">
          <span className="font-mono font-bold text-gray-900 dark:text-gray-50">
            {data.v16Active}
          </span>{" "}
          balizas V16
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Activity className="w-3.5 h-3.5 text-tl-500" />
        <span className="text-xs text-gray-600 dark:text-gray-300">
          <span className="font-mono font-bold text-gray-900 dark:text-gray-50">
            {data.cameras}
          </span>{" "}
          cámaras
        </span>
      </div>

      <p className="text-[10px] text-gray-400 dark:text-gray-500 pt-1">
        {formatRelativeTime(data.lastUpdated)}
      </p>
    </div>
  );
}

// ─── Fuel hub stats (for Combustible panel hub column) ────────────────────────
export function FuelHubStats() {
  const { data } = useSWR("/api/fuel-prices/today", fetcher, {
    refreshInterval: 300_000,
    revalidateOnFocus: false,
  });

  if (!data?.national) return null;

  const { avgGasolina95, avgGasoleoA, gasolina95Change, gasoleoAChange } =
    data.national;

  return (
    <div className="space-y-2.5">
      <HubPriceLine label="Gasolina 95" price={avgGasolina95} change={gasolina95Change} />
      <HubPriceLine label="Diésel A" price={avgGasoleoA} change={gasoleoAChange} />
      <p className="text-[10px] text-gray-400 dark:text-gray-500 pt-1">
        Media nacional hoy
      </p>
    </div>
  );
}

function HubPriceLine({
  label,
  price,
  change,
}: {
  label: string;
  price: number;
  change: number;
}) {
  const TrendIcon =
    change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;
  const trendColor =
    change > 0
      ? "text-signal-red"
      : change < 0
        ? "text-signal-green"
        : "text-gray-400";

  return (
    <div className="flex items-center gap-2">
      <Fuel className="w-3.5 h-3.5 text-tl-amber-500" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">{label}</p>
        <div className="flex items-center gap-1">
          <span className="font-mono text-sm font-bold text-gray-900 dark:text-gray-50">
            {price.toFixed(3)} €
          </span>
          <TrendIcon className={`w-3 h-3 ${trendColor}`} />
        </div>
      </div>
    </div>
  );
}

// ─── Professional hub stats ───────────────────────────────────────────────────
export function ProfessionalHubStats() {
  const { data } = useSWR("/api/stats", fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  });

  if (!data || data.isError) return null;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-signal-green" />
        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
          API operativa
        </span>
      </div>

      <div className="flex items-center gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-signal-amber" />
        <span className="text-xs text-gray-600 dark:text-gray-300">
          <span className="font-mono font-bold text-gray-900 dark:text-gray-50">
            {data.incidents + data.v16Active}
          </span>{" "}
          alertas activas
        </span>
      </div>

      <p className="text-[10px] text-gray-400 dark:text-gray-500 pt-1">
        {formatRelativeTime(data.lastUpdated)}
      </p>
    </div>
  );
}

// ─── Maritime hub stats ───────────────────────────────────────────────────────
export function MaritimeHubStats() {
  const { data } = useSWR("/api/stats", fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  });

  if (!data || data.isError) return null;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-tl-sea-500" />
        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
          Datos costeros en tiempo real
        </span>
      </div>

      <p className="text-[10px] text-gray-400 dark:text-gray-500 pt-1">
        Fuente: AEMET · SASEMAR
      </p>
    </div>
  );
}

// ─── Widget map — keyed by panel id ───────────────────────────────────────────
export const HUB_WIDGETS: Record<string, React.ComponentType> = {
  trafico: TrafficHubStats,
  combustible: FuelHubStats,
  profesional: ProfessionalHubStats,
  maritimo: MaritimeHubStats,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Actualizado ahora";
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  return `Hace ${hours}h`;
}
