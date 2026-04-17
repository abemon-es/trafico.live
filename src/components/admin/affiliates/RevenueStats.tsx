"use client";

import { MousePointerClick, TrendingUp, Euro, Percent } from "lucide-react";

interface RevenueSummary {
  totalClicks: number;
  totalConversions: number;
  totalRevenueEur: number;
  averageEpc: number;
}

interface RevenueStatsProps {
  summary: RevenueSummary;
}

interface StatTile {
  label: string;
  value: string;
  icon: typeof MousePointerClick;
  color: string;
}

export function RevenueStats({ summary }: RevenueStatsProps) {
  const tiles: StatTile[] = [
    {
      label: "Clicks totales",
      value: summary.totalClicks.toLocaleString("es-ES"),
      icon: MousePointerClick,
      color: "bg-tl-100 text-tl-700 dark:bg-tl-900/40 dark:text-tl-300",
    },
    {
      label: "Conversiones",
      value: summary.totalConversions.toLocaleString("es-ES"),
      icon: Percent,
      color:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    },
    {
      label: "EPC medio",
      value: `${summary.averageEpc.toFixed(3)} €`,
      icon: TrendingUp,
      color:
        "bg-tl-amber-100 text-tl-amber-600 dark:bg-tl-amber-900/40 dark:text-tl-amber-300",
    },
    {
      label: "Ingresos totales",
      value: `${summary.totalRevenueEur.toFixed(2)} €`,
      icon: Euro,
      color: "bg-tl-100 text-tl-700 dark:bg-tl-900/40 dark:text-tl-300",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {tiles.map((tile) => {
        const Icon = tile.icon;
        return (
          <div
            key={tile.label}
            className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${tile.color}`}>
              <Icon className="w-4 h-4" aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold font-mono text-gray-900 dark:text-gray-100 tabular-nums">
              {tile.value}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{tile.label}</p>
          </div>
        );
      })}
    </div>
  );
}
