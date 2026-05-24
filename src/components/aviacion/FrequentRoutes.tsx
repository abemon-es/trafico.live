"use client";

/**
 * FrequentRoutes — top 5 rutas origen→destino con puntuación de predecibilidad.
 * Muestra frecuencia, duración media y desviación estándar como indicador
 * de puntualidad/regularidad.
 */

import { ArrowRight, TrendingUp } from "lucide-react";
import type { FrequentRoute } from "@/lib/aviacion/flight-grouping";

interface Props {
  routes: FrequentRoute[];
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function predictabilityLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Muy regular", color: "text-green-600 dark:text-green-400" };
  if (score >= 60) return { label: "Regular", color: "text-tl-600 dark:text-tl-400" };
  if (score >= 40) return { label: "Variable", color: "text-tl-amber-500 dark:text-tl-amber-400" };
  return { label: "Irregular", color: "text-red-500 dark:text-red-400" };
}

export function FrequentRoutes({ routes }: Props) {
  if (routes.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Sin rutas frecuentes detectadas. Se necesitan al menos 2 vuelos en la misma ruta.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {routes.map((r, i) => {
        const { label, color } = predictabilityLabel(r.predictabilityScore);
        return (
          <div
            key={`${r.departure.icao}-${r.arrival.icao}`}
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex flex-col sm:flex-row sm:items-center gap-3"
          >
            {/* Rank */}
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-tl-50 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300 text-xs font-bold flex items-center justify-center">
              {i + 1}
            </span>

            {/* Route */}
            <div className="flex-1 flex items-center gap-2 flex-wrap">
              <div className="text-center">
                <span className="font-mono text-base font-bold text-gray-900 dark:text-gray-100">
                  {r.departure.iata ?? r.departure.icao}
                </span>
                {r.departure.city && (
                  <p className="text-[10px] text-gray-400 leading-none">
                    {r.departure.city}
                  </p>
                )}
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="text-center">
                <span className="font-mono text-base font-bold text-gray-900 dark:text-gray-100">
                  {r.arrival.iata ?? r.arrival.icao}
                </span>
                {r.arrival.city && (
                  <p className="text-[10px] text-gray-400 leading-none">
                    {r.arrival.city}
                  </p>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm">
              <div className="text-center">
                <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
                  {r.count}
                </span>
                <p className="text-[10px] text-gray-400">vuelos</p>
              </div>
              <div className="text-center">
                <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
                  {formatDuration(r.avgDurationSeconds)}
                </span>
                <p className="text-[10px] text-gray-400">duración media</p>
              </div>
              <div className="text-center">
                <span className="font-mono text-xs text-gray-500">
                  ±{formatDuration(r.stdDevSeconds)}
                </span>
                <p className="text-[10px] text-gray-400">desv. típica</p>
              </div>
            </div>

            {/* Predictability */}
            <div className="flex-shrink-0 text-right">
              <span className={`inline-flex items-center gap-1 text-xs font-semibold ${color}`}>
                <TrendingUp className="w-3.5 h-3.5" />
                {label}
              </span>
              <p className="text-[10px] text-gray-400">
                Pred. {r.predictabilityScore}/100
              </p>
            </div>
          </div>
        );
      })}
      <p className="text-[11px] text-gray-400 dark:text-gray-500">
        Predecibilidad: basada en el coeficiente de variación de la duración de vuelo (CV bajo = más regular).
      </p>
    </div>
  );
}
