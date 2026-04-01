"use client";

import { fetcher } from "@/lib/fetcher";
import { useState, useEffect } from "react";
import useSWR from "swr";
import { Brain, TrendingUp, AlertTriangle, Shield, X, Loader2 } from "lucide-react";


interface ZoneInsightsProps {
  center: { lat: number; lng: number } | null;
  zoom: number;
  visible: boolean;
  onClose: () => void;
}

const RISK_COLORS = {
  low: { bg: "bg-green-50 dark:bg-green-900/20", text: "text-green-700 dark:text-green-400", label: "Bajo" },
  medium: { bg: "bg-yellow-50 dark:bg-yellow-900/20", text: "text-yellow-700 dark:text-yellow-400", label: "Medio" },
  high: { bg: "bg-red-50 dark:bg-red-900/20", text: "text-red-700 dark:text-red-400", label: "Alto" },
};

export function ZoneInsights({ center, zoom, visible, onClose }: ZoneInsightsProps) {
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed state when center changes significantly
  useEffect(() => { setDismissed(false); }, [center?.lat.toFixed(1), center?.lng.toFixed(1)]);

  const shouldFetch = visible && !dismissed && center && zoom >= 9;
  const radius = zoom >= 12 ? 0.05 : zoom >= 10 ? 0.1 : 0.2;

  const { data, isLoading } = useSWR(
    shouldFetch ? `/api/insights/zone?lat=${center!.lat.toFixed(4)}&lng=${center!.lng.toFixed(4)}&radius=${radius}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  );

  if (!shouldFetch || dismissed || !data?.success) return null;

  const { summary, riskLevel, stats } = data.data;
  const risk = RISK_COLORS[riskLevel as keyof typeof RISK_COLORS] || RISK_COLORS.low;

  return (
    <div className="absolute bottom-4 left-4 z-20 w-80 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-tl-500" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Insights de zona</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${risk.bg} ${risk.text}`}>
            Riesgo {risk.label}
          </span>
          <button onClick={() => { setDismissed(true); onClose(); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        {isLoading ? (
          <div className="flex items-center gap-2 text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Analizando zona...</span>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{summary}</p>

            {/* Quick stats */}
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              {stats.activeIncidents > 0 && (
                <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span className="font-mono">{stats.activeIncidents}</span>
                  <span className="text-gray-400">activas</span>
                </div>
              )}
              {stats.recentIncidents > 0 && (
                <div className="flex items-center gap-1 text-xs text-tl-600 dark:text-tl-400">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span className="font-mono">{stats.recentIncidents}</span>
                  <span className="text-gray-400">7d</span>
                </div>
              )}
              {stats.radars > 0 && (
                <div className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                  <Shield className="w-3.5 h-3.5" />
                  <span className="font-mono">{stats.radars}</span>
                  <span className="text-gray-400">radares</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
