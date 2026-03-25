"use client";

import useSWR from "swr";
import { AlertTriangle } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface HealthData {
  status: "healthy" | "degraded" | "unhealthy";
  checks: {
    collectors?: {
      v16: { lastUpdate: string | null; stale: boolean };
      incidents: { lastUpdate: string | null; stale: boolean };
      gasStations: { lastUpdate: string | null; stale: boolean };
    };
  };
}

function formatAge(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `hace ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
}

export function StaleDataBanner() {
  const { data } = useSWR<HealthData>("/api/health", fetcher, {
    refreshInterval: 120000,
    revalidateOnFocus: false,
  });

  if (!data || data.status === "healthy") return null;

  const staleCollectors = data.checks.collectors
    ? Object.entries(data.checks.collectors)
        .filter(([, v]) => v.stale && v.lastUpdate)
        .map(([key, v]) => {
          const labels: Record<string, string> = {
            v16: "V16",
            incidents: "Incidencias",
            gasStations: "Gasolineras",
          };
          return `${labels[key] || key} (${formatAge(v.lastUpdate!)})`;
        })
    : [];

  if (staleCollectors.length === 0) return null;

  return (
    <div className="bg-tl-amber-50 dark:bg-tl-amber-700/20 border border-tl-amber-200 dark:border-tl-amber-600/30 rounded-lg px-4 py-3 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-tl-amber-500 shrink-0 mt-0.5" />
      <div className="text-sm text-tl-amber-700 dark:text-tl-amber-300">
        <span className="font-semibold font-heading">Datos desactualizados</span>
        {" — "}
        {staleCollectors.join(", ")}. Los datos mostrados pueden no reflejar el estado actual del tráfico.
      </div>
    </div>
  );
}
