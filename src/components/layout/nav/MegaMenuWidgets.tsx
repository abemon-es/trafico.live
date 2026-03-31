"use client";

import useSWR from "swr";
import { AlertTriangle, Fuel, Activity, TrendingDown, TrendingUp, Minus } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ─── Traffic stats widget (for Tráfico panel) ───────────────────────────────
export function TrafficStatsWidget() {
  const { data } = useSWR("/api/stats", fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  });

  if (!data || data.isError) return null;

  return (
    <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800/50">
      <div className="flex items-center gap-6">
        {/* Live incidents count */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-signal-red opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-signal-red" />
          </span>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
              {data.incidents}
            </span>{" "}
            incidencias
          </span>
        </div>

        {/* Active V16 beacons */}
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3 text-signal-amber" />
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
              {data.v16Active}
            </span>{" "}
            V16
          </span>
        </div>

        {/* Cameras */}
        <div className="flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-tl-500" />
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
              {data.cameras}
            </span>{" "}
            cámaras
          </span>
        </div>

        {/* Last updated — relative time */}
        <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">
          {formatRelativeTime(data.lastUpdated)}
        </span>
      </div>
    </div>
  );
}

// ─── Fuel price ticker (for Combustible panel) ──────────────────────────────
export function FuelPriceWidget() {
  const { data } = useSWR("/api/fuel-prices/today", fetcher, {
    refreshInterval: 300_000, // 5 min
    revalidateOnFocus: false,
  });

  if (!data?.national) return null;

  const { avgGasolina95, avgGasoleoA, gasolina95Change, gasoleoAChange } =
    data.national;

  return (
    <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800/50">
      <div className="flex items-center gap-6">
        <PricePill
          label="Gasolina 95"
          price={avgGasolina95}
          change={gasolina95Change}
        />

        <PricePill
          label="Diésel"
          price={avgGasoleoA}
          change={gasoleoAChange}
        />

        <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">
          Media nacional
        </span>
      </div>
    </div>
  );
}

function PricePill({
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
    <div className="flex items-center gap-1.5">
      <Fuel className="w-3 h-3 text-tl-amber-500" />
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <span className="font-mono text-xs font-semibold text-gray-900 dark:text-gray-100">
        {price.toFixed(3)} €
      </span>
      <TrendIcon className={`w-3 h-3 ${trendColor}`} />
    </div>
  );
}

// ─── Professional stats widget (for Profesional panel) ──────────────────────
export function ProfessionalStatsWidget() {
  const { data } = useSWR("/api/stats", fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  });

  if (!data || data.isError) return null;

  return (
    <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800/50">
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-signal-green" />
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            API operativa
          </span>
        </div>

        <span className="text-xs text-gray-500 dark:text-gray-400">
          <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
            {data.incidents + data.v16Active}
          </span>{" "}
          alertas activas
        </span>

        <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">
          Actualizado {formatRelativeTime(data.lastUpdated)}
        </span>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  return `hace ${hours}h`;
}
