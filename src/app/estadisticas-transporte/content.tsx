"use client";

import { fetcher } from "@/lib/fetcher";
import useSWR from "swr";
import {
  BarChart3,
  Database,
  Layers,
  Calendar,
  Info,
  Loader2,
  AlertTriangle,
  Train,
  Bus,
  Plane,
  Ship,
  TrendingUp,
  ArrowRight,
  Route,
} from "lucide-react";

// ── Mode config ────────────────────────────────────────────────────────────────

const MODE_COLORS: Record<string, string> = {
  metro: "var(--color-mode-metro)",
  bus: "var(--color-mode-bus)",
  rail: "var(--color-mode-rail)",
  air: "var(--color-mode-air)",
  maritime: "var(--color-mode-maritime)",
  interurban_bus: "var(--color-mode-funicular)",
};

const MODE_LABELS: Record<string, string> = {
  metro: "Metro",
  bus: "Autobús urbano",
  rail: "Ferrocarril",
  air: "Avión",
  maritime: "Marítimo",
  interurban_bus: "Bus interurbano",
};

function ModeIcon({ mode, className }: { mode: string; className?: string }) {
  const cls = className ?? "w-4 h-4";
  if (mode === "air") return <Plane className={cls} />;
  if (mode === "maritime") return <Ship className={cls} />;
  if (mode === "metro" || mode === "rail") return <Train className={cls} />;
  return <Bus className={cls} />;
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface ModeStats {
  mode: string;
  totalPassengers: number;
  sharePercent: number;
  lastPeriod?: string;
  trend?: "up" | "down" | "flat";
  trendPct?: number;
}

interface MonthlyRow {
  period: string; // e.g. "2024-01"
  [mode: string]: string | number;
}

// The API returns a flat array of TransportStatistic records
interface TransportStatRecord {
  mode: string;
  value: number;
  unit: string;
  periodStart: string;
  periodEnd: string;
  source: string;
}

type StatsApiData = TransportStatRecord[];

interface ModalApiData {
  total_passengers?: number;
  period?: string;
  [key: string]: unknown;
}

// ── CSS bar chart ──────────────────────────────────────────────────────────────

function ModalBar({ item, maxPct }: { item: ModeStats; maxPct: number }) {
  const color = MODE_COLORS[item.mode] ?? "#6b7280";
  const label = MODE_LABELS[item.mode] ?? item.mode;
  const barWidth = maxPct > 0 ? (item.sharePercent / maxPct) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      {/* Mode label + icon */}
      <div className="flex items-center gap-2 w-36 shrink-0">
        <span className="w-6 h-6 rounded flex items-center justify-center text-white shrink-0" style={{ backgroundColor: color }}>
          <ModeIcon mode={item.mode} className="w-3.5 h-3.5" />
        </span>
        <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{label}</span>
      </div>

      {/* Bar */}
      <div className="flex-1 flex items-center gap-2">
        <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${barWidth}%`, backgroundColor: color }}
          />
        </div>
        <span className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100 w-14 text-right">
          {item.sharePercent.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

// ── Placeholder ───────────────────────────────────────────────────────────────

function DataPendingPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="w-16 h-16 rounded-full bg-tl-50 dark:bg-tl-900/20 flex items-center justify-center">
        <Database className="w-8 h-8 text-[var(--tl-primary)]" />
      </div>
      <div>
        <p className="font-heading font-semibold text-gray-900 dark:text-gray-100 text-lg">
          En proceso de carga
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mt-1">
          Los datos se actualizan diariamente desde el INE, CNMC y AENA. Vuelve más tarde para
          consultar las series históricas.
        </p>
      </div>
    </div>
  );
}

// ── Corridor types ────────────────────────────────────────────────────────────

interface Corridor {
  originProvince: string;
  originName: string;
  destProvince: string;
  destName: string;
  tripCount: number;
  avgDistanceKm: number | null;
}

interface CorredoresApiData {
  data: Corridor[];
  meta: { date: string; limit: number; excludeSelf: boolean };
}

// ── Mobility corridors section ────────────────────────────────────────────────

function FlujosMovilidadSection() {
  const { data, isLoading, error } = useSWR<CorredoresApiData>(
    "/api/movilidad/corredores?limit=10&exclude_self=true",
    fetcher,
    { revalidateOnFocus: false }
  );

  if (isLoading) {
    return (
      <section className="space-y-4">
        <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Route className="w-5 h-5 text-[var(--tl-primary)]" />
          Flujos de movilidad interprovincial
        </h2>
        <div className="flex items-center justify-center py-12 gap-3 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Cargando corredores…</span>
        </div>
      </section>
    );
  }

  if (error || !data?.data?.length) return null;

  const corridors = data.data;
  const totalTrips = corridors.reduce((sum, c) => sum + c.tripCount, 0);
  const maxTrips = corridors[0]?.tripCount ?? 1;

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Route className="w-5 h-5 text-[var(--tl-primary)]" />
            Flujos de movilidad interprovincial
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Top 10 corredores por volumen de viajes · {data.meta.date}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-center shrink-0">
          <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Total viajes (top 10)
          </p>
          <p className="text-2xl font-heading font-bold font-mono text-[var(--tl-primary)]">
            {totalTrips.toLocaleString("es-ES")}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
        {corridors.map((c, i) => {
          const barWidth = (c.tripCount / maxTrips) * 100;
          return (
            <div key={`${c.originProvince}-${c.destProvince}`} className="px-4 py-3 flex items-center gap-3">
              {/* Rank */}
              <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold font-mono text-gray-600 dark:text-gray-300 shrink-0">
                {i + 1}
              </span>

              {/* Origin → Destination */}
              <div className="flex items-center gap-1.5 w-48 sm:w-56 shrink-0 min-w-0">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {c.originName || c.originProvince}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {c.destName || c.destProvince}
                </span>
              </div>

              {/* Bar + count */}
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--tl-primary)] transition-all duration-500"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <span className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100 w-20 text-right shrink-0">
                  {c.tripCount.toLocaleString("es-ES")}
                </span>
              </div>

              {/* Distance badge */}
              {c.avgDistanceKm != null && (
                <span className="hidden sm:inline text-[11px] font-mono text-gray-400 w-14 text-right shrink-0">
                  {Number(c.avgDistanceKm).toFixed(0)} km
                </span>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-gray-400 flex items-center gap-1">
        <Info className="w-3 h-3 shrink-0" />
        Fuente: Ministerio de Transportes, Movilidad y Agenda Urbana — Estudio de movilidad BigData.
      </p>
    </section>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function EstadisticasTransporteContent() {
  const { data: rawStats, isLoading: loadingStats, error: statsError } = useSWR<StatsApiData>(
    "/api/estadisticas?limit=500",
    fetcher,
    { revalidateOnFocus: false }
  );

  const isLoading = loadingStats;

  // Transform flat API array into ModeStats[] grouped by mode (latest value per mode)
  const rawArray = Array.isArray(rawStats) ? rawStats : [];

  // Group by mode, pick latest period per mode, compute total for share %
  const byMode = new Map<string, { totalPassengers: number; lastPeriod: string }>();
  for (const rec of rawArray) {
    const existing = byMode.get(rec.mode);
    const period = rec.periodStart?.slice(0, 7) ?? "";
    if (!existing || period > existing.lastPeriod) {
      byMode.set(rec.mode, { totalPassengers: Number(rec.value) || 0, lastPeriod: period });
    }
  }
  const grandTotal = Array.from(byMode.values()).reduce((s, v) => s + v.totalPassengers, 0);

  const records: ModeStats[] = Array.from(byMode.entries()).map(([mode, data]) => ({
    mode,
    totalPassengers: data.totalPassengers,
    sharePercent: grandTotal > 0 ? (data.totalPassengers / grandTotal) * 100 : 0,
    lastPeriod: data.lastPeriod,
  }));

  // Use records as modal split too
  const modal: ModeStats[] = records.filter(r => r.totalPassengers > 0);
  const maxModalPct = modal.reduce((max, m) => Math.max(max, m.sharePercent), 0);

  const summary = {
    totalRecords: rawArray.length,
    dataSources: 1,
    modesCovered: byMode.size,
    lastPeriod: records.length > 0 ? records.reduce((latest, r) => (r.lastPeriod ?? "") > latest ? (r.lastPeriod ?? "") : latest, "") : undefined,
  };

  // Build monthly table from raw records
  const monthlyModes = Array.from(new Set(rawArray.map((r) => r.mode)));
  const monthlyPeriods = Array.from(
    new Set(rawArray.map((r) => r.periodStart?.slice(0, 7)).filter(Boolean) as string[])
  ).sort();

  // Aggregate into rows (one row per period, from raw API data)
  const monthlyRows: MonthlyRow[] = monthlyPeriods.slice(-24).map((period) => {
    const row: MonthlyRow = { period };
    for (const mode of monthlyModes) {
      const match = rawArray.find((r) => r.mode === mode && r.periodStart?.slice(0, 7) === period);
      row[mode] = match ? Number(match.value) || 0 : 0;
    }
    return row;
  });

  // Stats strip values
  const stripStats = [
    {
      icon: Database,
      label: "Total registros",
      value: (summary.totalRecords ?? records.length).toLocaleString("es-ES"),
      color: "text-[var(--tl-primary)]",
    },
    {
      icon: Layers,
      label: "Fuentes de datos",
      value: (summary.dataSources ?? 3).toLocaleString("es-ES"),
      color: "text-gray-900 dark:text-gray-100",
    },
    {
      icon: BarChart3,
      label: "Modos cubiertos",
      value: (summary.modesCovered ?? (modal.length || Object.keys(MODE_LABELS).length)).toLocaleString("es-ES"),
      color: "text-[var(--tl-success)]",
    },
    {
      icon: Calendar,
      label: "Último periodo",
      value: summary.lastPeriod ?? "—",
      color: "text-gray-900 dark:text-gray-100",
    },
  ];

  const isEmpty = !isLoading && !statsError && records.length === 0 && modal.length === 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold text-gray-900 dark:text-gray-100">
          Estadísticas de Transporte
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Viajeros por modo · Series históricas · INE · CNMC · AENA
        </p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stripStats.map((s) => (
          <div
            key={s.label}
            className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs mb-0.5">
              <s.icon className="w-3.5 h-3.5" />
              <span>{s.label}</span>
            </div>
            <p className={`text-xl font-heading font-bold font-mono ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm">Cargando estadísticas…</span>
        </div>
      )}

      {/* Error */}
      {statsError && !isLoading && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-700 dark:text-red-400">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-sm">No se pudieron cargar los datos estadísticos. Inténtalo de nuevo.</p>
        </div>
      )}

      {/* Empty placeholder */}
      {isEmpty && <DataPendingPlaceholder />}

      {/* Modal split section */}
      {!isLoading && modal.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[var(--tl-primary)]" />
            Reparto modal de viajeros
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
            {modal
              .slice()
              .sort((a, b) => b.sharePercent - a.sharePercent)
              .map((item) => (
                <ModalBar key={item.mode} item={item} maxPct={maxModalPct} />
              ))}
          </div>
        </section>
      )}

      {/* Records summary cards — show when modal is absent but records exist */}
      {!isLoading && records.length > 0 && modal.length === 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[var(--tl-primary)]" />
            Viajeros por modo
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {records.map((r) => {
              const color = MODE_COLORS[r.mode] ?? "#6b7280";
              const label = MODE_LABELS[r.mode] ?? r.mode;
              return (
                <div
                  key={r.mode}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-start gap-4"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    <ModeIcon mode={r.mode} className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
                    <p className="text-2xl font-heading font-bold font-mono text-gray-900 dark:text-gray-100">
                      {r.totalPassengers.toLocaleString("es-ES")}
                    </p>
                    {r.lastPeriod && (
                      <p className="text-[11px] text-gray-400 font-mono">{r.lastPeriod}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Monthly time series table */}
      {!isLoading && monthlyRows.length > 1 && (
        <section className="space-y-4">
          <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[var(--tl-primary)]" />
            Serie temporal mensual
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
                  <th className="px-4 py-3 text-left font-heading font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Periodo
                  </th>
                  {monthlyModes.map((mode) => (
                    <th
                      key={mode}
                      className="px-4 py-3 text-right font-heading font-semibold text-xs uppercase tracking-wider"
                      style={{ color: MODE_COLORS[mode] ?? "#6b7280" }}
                    >
                      {MODE_LABELS[mode] ?? mode}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthlyRows.map((row, i) => (
                  <tr
                    key={row.period}
                    className={`border-b border-gray-50 dark:border-gray-700/50 ${
                      i % 2 === 0
                        ? "bg-white dark:bg-gray-800"
                        : "bg-gray-50 dark:bg-gray-800/60"
                    }`}
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500 dark:text-gray-400">
                      {row.period}
                    </td>
                    {monthlyModes.map((mode) => (
                      <td key={mode} className="px-4 py-2.5 text-right font-mono text-gray-900 dark:text-gray-100">
                        {typeof row[mode] === "number" && row[mode] !== 0
                          ? (row[mode] as number).toLocaleString("es-ES")
                          : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Interprovincial mobility corridors */}
      {!isLoading && <FlujosMovilidadSection />}

      {/* Attribution footer */}
      <footer className="flex items-start gap-2 text-[11px] text-gray-400 pb-4">
        <Info className="w-3 h-3 mt-0.5 shrink-0" />
        <span>
          Fuentes: INE (Instituto Nacional de Estadística), CNMC, AENA, Ministerio de Transportes. Datos actualizados diariamente.
        </span>
      </footer>
    </div>
  );
}
