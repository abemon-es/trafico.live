"use client";

import { Radio, Loader2 } from "lucide-react";

interface HeroOverlayProps {
  trainCount: number;
  totalStations: number;
  totalRoutes: number;
  alerts: unknown[];
  punctuality: number;
  avgDelay: number;
  maxDelay: number | null;
  p50Delay: number | null;
  loading: boolean;
}

export default function HeroOverlay({
  trainCount,
  totalStations,
  totalRoutes,
  alerts,
  punctuality,
  avgDelay,
  maxDelay,
  p50Delay,
  loading,
}: HeroOverlayProps) {
  return (
    <>
      {/* Top gradient */}
      <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-white/80 dark:from-gray-950/80 to-transparent pointer-events-none z-10" />

      {/* Header */}
      <div className="absolute top-0 inset-x-0 z-20 px-4 sm:px-6 lg:px-8 pt-4">
        <div className="max-w-7xl mx-auto">
          <nav className="text-xs text-gray-500 mb-1">
            <a href="/" className="hover:text-[var(--tl-primary)]">Inicio</a>
            <span className="mx-1.5">/</span>
            <span className="text-gray-800 dark:text-gray-200 font-medium">Red Ferroviaria</span>
          </nav>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-gray-900 dark:text-gray-50 tracking-tight">
                Trenes en Tiempo Real
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                {totalStations.toLocaleString("es-ES")} estaciones · {totalRoutes.toLocaleString("es-ES")} rutas · 14 marcas
              </p>
            </div>
            <div className="flex items-center gap-2">
              {trainCount > 0 && (
                <span className="flex items-center gap-1.5 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm">
                  <Radio className="w-3 h-3 animate-pulse" />
                  {trainCount} trenes
                </span>
              )}
              {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom gradient */}
      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-white dark:from-gray-950 to-transparent pointer-events-none z-10" />

      {/* Stats bar */}
      <div className="absolute bottom-0 inset-x-0 z-20 px-4 sm:px-6 lg:px-8 pb-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg px-4 py-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-center">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Puntualidad</p>
                <p className={`text-xl font-heading font-bold font-mono ${punctuality >= 80 ? "text-[var(--tl-success)]" : punctuality >= 60 ? "text-yellow-600" : "text-[var(--tl-danger)]"}`}>
                  {punctuality > 0 ? `${punctuality.toFixed(1)}%` : "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Retraso medio</p>
                <p className="text-xl font-heading font-bold font-mono text-gray-900 dark:text-gray-100">
                  {avgDelay > 0 ? `${avgDelay.toFixed(1)}m` : "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">En circulación</p>
                <p className="text-xl font-heading font-bold font-mono text-[var(--tl-success)]">{trainCount}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Alertas</p>
                <p className={`text-xl font-heading font-bold font-mono ${alerts.length > 0 ? "text-[var(--tl-danger)]" : "text-gray-400"}`}>
                  {alerts.length}
                </p>
              </div>
              <div className="hidden lg:block">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Max retraso</p>
                <p className="text-xl font-heading font-bold font-mono text-gray-900 dark:text-gray-100">
                  {maxDelay ? `${maxDelay}m` : "—"}
                </p>
              </div>
              <div className="hidden lg:block">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Mediana</p>
                <p className="text-xl font-heading font-bold font-mono text-gray-900 dark:text-gray-100">
                  {p50Delay != null ? `${p50Delay}m` : "—"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 text-[10px] text-gray-400">
              {[["#059669","Puntual"],["#ca8a04","<5m"],["#ea580c","5-15m"],["#dc2626",">15m"]].map(([c,l]) => (
                <span key={l} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />{l}
                </span>
              ))}
              <span className="mx-1">·</span>
              {[["#dc2626","AVE"],["#d48139","Alvia"],["#366cf8","MD"],["#059669","Cercanías"]].map(([c,l]) => (
                <span key={l} className="flex items-center gap-1">
                  <span className="w-3 h-0.5 rounded" style={{ backgroundColor: c }} />{l}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
