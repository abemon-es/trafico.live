"use client";

/**
 * VesselStats — punctuality + predictability summary cards
 *
 * Receives pre-computed historical stats from the server component and renders:
 * - Stats strip (total port calls, voyages, days tracked, avg port stay)
 * - Predictability score gauge (0-100)
 * - Time breakdown: in port vs at sea (pie-like display)
 */

import {
  Anchor,
  Navigation,
  Clock,
  BarChart3,
  TrendingUp,
  Target,
  CalendarDays,
} from "lucide-react";
import type { VesselHistoricalStats } from "@/lib/maritimo/punctuality";

interface VesselStatsProps {
  stats: VesselHistoricalStats;
}

function fmtDuration(h: number | null | undefined): string {
  if (h == null) return "N/D";
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 24) return `${h.toFixed(1).replace(".", ",")} h`;
  const days = Math.floor(h / 24);
  const rem = Math.round(h - days * 24);
  return rem > 0 ? `${days} d ${rem} h` : `${days} d`;
}

function ScoreGauge({ score }: { score: number }) {
  const color =
    score >= 75
      ? "text-emerald-600 dark:text-emerald-400"
      : score >= 50
      ? "text-tl-amber-600 dark:text-tl-amber-400"
      : "text-red-600 dark:text-red-400";

  const trackColor =
    score >= 75
      ? "bg-emerald-100 dark:bg-emerald-900/40"
      : score >= 50
      ? "bg-tl-amber-100 dark:bg-tl-amber-900/40"
      : "bg-red-100 dark:bg-red-900/40";

  const barColor =
    score >= 75
      ? "bg-emerald-500"
      : score >= 50
      ? "bg-tl-amber-500"
      : "bg-red-500";

  const label =
    score >= 80
      ? "Muy predecible"
      : score >= 60
      ? "Bastante predecible"
      : score >= 40
      ? "Moderadamente predecible"
      : "Poco predecible";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between">
        <span className={`font-mono text-4xl font-bold [font-family:var(--font-jetbrains-mono)] ${color}`}>
          {score}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">/ 100</span>
      </div>
      <div className={`h-2.5 rounded-full ${trackColor} overflow-hidden`}>
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
    </div>
  );
}

export function VesselStats({ stats }: VesselStatsProps) {
  const {
    totalPortCalls,
    totalVoyages,
    daysTracked,
    avgPortStayH,
    predictabilityScore,
    predictabilityRouteCount,
    timeBreakdown,
  } = stats;

  const totalTrackedH = timeBreakdown.hoursInPort + timeBreakdown.hoursAtSea;
  const portPct =
    totalTrackedH > 0
      ? Math.round((timeBreakdown.hoursInPort / totalTrackedH) * 100)
      : 0;
  const seaPct = 100 - portPct;

  return (
    <div className="space-y-6">
      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile
          icon={Anchor}
          label="Escalas totales"
          value={totalPortCalls.toLocaleString("es-ES")}
          sub="historico"
        />
        <StatTile
          icon={Navigation}
          label="Viajes totales"
          value={totalVoyages.toLocaleString("es-ES")}
          sub="historico"
        />
        <StatTile
          icon={CalendarDays}
          label="Dias seguidos"
          value={daysTracked.toLocaleString("es-ES")}
          sub="desde primera senal"
        />
        <StatTile
          icon={Clock}
          label="Estancia media en puerto"
          value={fmtDuration(avgPortStayH)}
          sub="por escala"
        />
      </div>

      {/* Predictability + time breakdown side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Predictability */}
        <div className="rounded-2xl border border-tl-sea-100 dark:border-tl-sea-900/40 bg-white dark:bg-gray-900 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-tl-sea-500" />
            <h3 className="font-heading text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Predecibilidad
            </h3>
          </div>
          {predictabilityScore !== null ? (
            <div className="space-y-3">
              <ScoreGauge score={predictabilityScore} />
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Calculado a partir de {predictabilityRouteCount}{" "}
                {predictabilityRouteCount === 1 ? "ruta" : "rutas"} con ≥3 viajes.
                Mide la consistencia de las duraciones de travesia por par origen→destino.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 mt-2">
              <BarChart3 className="w-4 h-4" />
              <span>Sin datos suficientes (se necesitan ≥3 viajes por ruta)</span>
            </div>
          )}
        </div>

        {/* Time breakdown */}
        <div className="rounded-2xl border border-tl-sea-100 dark:border-tl-sea-900/40 bg-white dark:bg-gray-900 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-tl-sea-500" />
            <h3 className="font-heading text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Distribucion del tiempo (30d)
            </h3>
          </div>
          {totalTrackedH > 0 ? (
            <div className="space-y-4">
              {/* Bar */}
              <div className="h-4 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-tl-sea-500 transition-all"
                  style={{ width: `${seaPct}%` }}
                  title={`Navegando: ${seaPct}%`}
                />
                <div
                  className="h-full bg-emerald-400 transition-all"
                  style={{ width: `${portPct}%` }}
                  title={`En puerto: ${portPct}%`}
                />
              </div>
              {/* Legend */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-tl-sea-500 flex-shrink-0" />
                  <div>
                    <div className="font-mono text-sm font-bold text-gray-900 dark:text-gray-100 [font-family:var(--font-jetbrains-mono)]">
                      {seaPct}%
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Navegando ({fmtDuration(timeBreakdown.hoursAtSea)})
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 flex-shrink-0" />
                  <div>
                    <div className="font-mono text-sm font-bold text-gray-900 dark:text-gray-100 [font-family:var(--font-jetbrains-mono)]">
                      {portPct}%
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      En puerto ({fmtDuration(timeBreakdown.hoursInPort)})
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
              <BarChart3 className="w-4 h-4" />
              <span>Sin datos suficientes en los ultimos 30 dias</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatTile
// ---------------------------------------------------------------------------

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Anchor;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-tl-sea-100 dark:border-tl-sea-900/40 bg-white dark:bg-gray-900 p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-tl-sea-500" />
        <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{label}</span>
      </div>
      <div className="font-mono text-2xl font-bold text-gray-900 dark:text-gray-100 [font-family:var(--font-jetbrains-mono)]">
        {value}
      </div>
      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</div>
    </div>
  );
}
