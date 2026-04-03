"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  Fuel,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  MapPin,
  BarChart3,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { PROVINCE_NAMES } from "@/lib/geo/ine-codes";

// ─── Types ────────────────────────────────────────────────────────────────────

type FuelKey = "gasoleoA" | "gasolina95" | "gasolina98";

interface PricePoint {
  date: string;
  price: number | null;
  priceBeforeTax?: number | null;
}

interface HistoricoResponse {
  success: boolean;
  data: PricePoint[];
  meta: {
    province: string | null;
    fuel: FuelKey;
    from: string;
    to: string;
    groupBy: string;
    count: number;
  };
}

interface TrendEntry {
  current: number | null;
  d7: number | null;
  d30: number | null;
  d90: number | null;
  y1: number | null;
  direction: "up" | "down" | "stable" | null;
  changePercent: number | null;
  changeAbsolute: number | null;
}

interface TendenciaResponse {
  success: boolean;
  gasoleoA: TrendEntry;
  gasolina95: TrendEntry;
  gasolina98: TrendEntry;
  meta: { province: string | null; asOf: string };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FUEL_TABS: { key: FuelKey; label: string; color: string; shortLabel: string }[] = [
  {
    key: "gasolina95",
    label: "Gasolina 95",
    shortLabel: "G-95",
    color: "var(--tl-primary)",
  },
  {
    key: "gasolina98",
    label: "Gasolina 98",
    shortLabel: "G-98",
    color: "#8b5cf6",
  },
  {
    key: "gasoleoA",
    label: "Gasóleo A",
    shortLabel: "G-A",
    color: "var(--tl-warning)",
  },
];

const PERIODS: { key: string; label: string; months: number | null }[] = [
  { key: "1m", label: "1 mes", months: 1 },
  { key: "3m", label: "3 meses", months: 3 },
  { key: "6m", label: "6 meses", months: 6 },
  { key: "1y", label: "1 año", months: 12 },
  { key: "all", label: "Todo", months: null },
];

// Province dropdown options: sorted by name
const PROVINCE_OPTIONS = [
  { code: "", name: "España (media nacional)" },
  ...Object.entries(PROVINCE_NAMES)
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "es")),
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(value: number | null | undefined): string {
  if (value == null) return "—";
  return value.toLocaleString("es-ES", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }) + " €/L";
}

function formatPercent(value: number | null | undefined): string {
  if (value == null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function formatAbsolute(value: number | null | undefined): string {
  if (value == null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString("es-ES", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} €`;
}

function periodToFromDate(periodKey: string): string {
  const now = new Date();
  const map: Record<string, number> = { "1m": 1, "3m": 3, "6m": 6, "1y": 12 };
  const months = map[periodKey];
  if (!months) {
    // "all" → from 2016-01-01
    return "2016-01-01";
  }
  const d = new Date(now);
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

function groupByForPeriod(periodKey: string): "day" | "week" | "month" {
  if (periodKey === "1m") return "day";
  if (periodKey === "3m") return "week";
  if (periodKey === "6m") return "week";
  if (periodKey === "1y") return "month";
  return "month"; // "all"
}

function formatDateLabel(dateStr: string, groupBy: "day" | "week" | "month"): string {
  const d = new Date(dateStr + "T00:00:00");
  if (groupBy === "month") {
    return d.toLocaleDateString("es-ES", { month: "short", year: "2-digit" });
  }
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

// ─── Trend Card ───────────────────────────────────────────────────────────────

function TrendCard({
  label,
  trend,
  fuelKey,
}: {
  label: string;
  trend: TrendEntry | undefined;
  fuelKey: FuelKey;
}) {
  const fuelTab = FUEL_TABS.find((f) => f.key === fuelKey);

  if (!trend) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 animate-pulse h-28" />
    );
  }

  const dirIcon =
    trend.direction === "up" ? (
      <ArrowUp className="w-4 h-4 text-[var(--tl-danger)]" />
    ) : trend.direction === "down" ? (
      <ArrowDown className="w-4 h-4 text-[var(--tl-success)]" />
    ) : (
      <Minus className="w-4 h-4 text-gray-400" />
    );

  const changeColor =
    trend.direction === "up"
      ? "text-[var(--tl-danger)]"
      : trend.direction === "down"
      ? "text-[var(--tl-success)]"
      : "text-gray-500 dark:text-gray-400";

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      <div className="flex items-center gap-2 mb-1">
        <Fuel className="w-4 h-4" style={{ color: fuelTab?.color }} />
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className="font-mono text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
        {formatPrice(trend.current)}
      </div>
      <div className={`flex items-center gap-1 mt-1 text-sm font-medium ${changeColor}`}>
        {dirIcon}
        <span>{formatPercent(trend.changePercent)}</span>
        <span className="text-gray-400 font-normal">vs 7d</span>
        <span className="ml-1 font-mono">{formatAbsolute(trend.changeAbsolute)}</span>
      </div>
    </div>
  );
}

// ─── Price Chart (CSS-only spark line) ───────────────────────────────────────

function PriceChart({
  data,
  showNoTax,
  fuelColor,
  groupBy,
}: {
  data: PricePoint[];
  showNoTax: boolean;
  fuelColor: string;
  groupBy: "day" | "week" | "month";
}) {
  const prices = data.map((d) =>
    showNoTax ? (d.priceBeforeTax ?? d.price) : d.price
  );
  const validPrices = prices.filter((p): p is number => p !== null);

  if (validPrices.length === 0) return null;

  const minP = Math.min(...validPrices);
  const maxP = Math.max(...validPrices);
  const rangeP = maxP - minP || 0.01;

  // Subsample for performance — max 120 points rendered
  const step = Math.max(1, Math.floor(data.length / 120));
  const sampled = data.filter((_, i) => i % step === 0 || i === data.length - 1);

  const CHART_H = 160; // px
  const CHART_W = 100; // % relative

  const points = sampled
    .map((d, i) => {
      const p = showNoTax ? (d.priceBeforeTax ?? d.price) : d.price;
      if (p === null) return null;
      const x = (i / (sampled.length - 1)) * 100;
      const y = CHART_H - ((p - minP) / rangeP) * (CHART_H - 16) - 8;
      return { x, y, p, date: d.date };
    })
    .filter(Boolean) as { x: number; y: number; p: number; date: string }[];

  const polylinePoints = points.map((pt) => `${pt.x},${pt.y}`).join(" ");

  // Fill polygon: close to bottom
  const fillPoints = [
    `0,${CHART_H}`,
    ...points.map((pt) => `${pt.x},${pt.y}`),
    `100,${CHART_H}`,
  ].join(" ");

  // X-axis labels: pick ~5 evenly spaced
  const labelIndexes = [0, Math.floor(sampled.length * 0.25), Math.floor(sampled.length * 0.5), Math.floor(sampled.length * 0.75), sampled.length - 1];

  return (
    <div className="relative w-full" style={{ height: `${CHART_H + 32}px` }}>
      <svg
        viewBox={`0 0 100 ${CHART_H}`}
        preserveAspectRatio="none"
        className="absolute inset-0 w-full"
        style={{ height: `${CHART_H}px` }}
        aria-hidden="true"
      >
        {/* Fill area */}
        <polygon
          points={fillPoints}
          fill={fuelColor}
          fillOpacity={0.08}
        />
        {/* Price line */}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke={fuelColor}
          strokeWidth="0.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* Min/max indicators */}
        {points.length > 0 && (() => {
          const maxIdx = points.reduce((best, pt, i) => pt.p > points[best].p ? i : best, 0);
          const minIdx = points.reduce((best, pt, i) => pt.p < points[best].p ? i : best, 0);
          return (
            <>
              <circle cx={points[maxIdx].x} cy={points[maxIdx].y} r="1" fill={fuelColor} opacity="0.7" vectorEffect="non-scaling-stroke" />
              <circle cx={points[minIdx].x} cy={points[minIdx].y} r="1" fill="var(--tl-success)" opacity="0.7" vectorEffect="non-scaling-stroke" />
            </>
          );
        })()}
      </svg>

      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 flex flex-col justify-between h-full pointer-events-none" style={{ height: `${CHART_H}px` }}>
        <span className="text-[10px] font-mono text-gray-400 leading-none">{maxP.toFixed(3)}</span>
        <span className="text-[10px] font-mono text-gray-400 leading-none">{minP.toFixed(3)}</span>
      </div>

      {/* X-axis labels */}
      <div
        className="absolute w-full flex justify-between pointer-events-none"
        style={{ top: `${CHART_H + 4}px` }}
      >
        {labelIndexes.map((idx) => {
          const pt = sampled[idx];
          if (!pt) return null;
          return (
            <span
              key={pt.date}
              className="text-[10px] text-gray-400 font-mono leading-none"
            >
              {formatDateLabel(pt.date, groupBy)}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─── Trend Period Row ─────────────────────────────────────────────────────────

function TrendPeriodRow({
  label,
  current,
  reference,
}: {
  label: string;
  current: number | null;
  reference: number | null;
}) {
  const diff = current !== null && reference !== null ? current - reference : null;
  const pct =
    diff !== null && reference !== null && reference !== 0
      ? (diff / reference) * 100
      : null;

  const isUp = diff !== null && diff > 0.001;
  const isDown = diff !== null && diff < -0.001;

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
          {formatPrice(reference)}
        </span>
        <span
          className={`flex items-center gap-0.5 text-sm font-medium font-mono tabular-nums ${
            isUp ? "text-[var(--tl-danger)]" : isDown ? "text-[var(--tl-success)]" : "text-gray-400"
          }`}
        >
          {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : isDown ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
          {pct !== null
            ? `${pct > 0 ? "+" : ""}${pct.toFixed(2)}%`
            : "—"}
        </span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function HistoricoContent() {
  const [fuelKey, setFuelKey] = useState<FuelKey>("gasolina95");
  const [period, setPeriod] = useState("1y");
  const [province, setProvince] = useState("");
  const [showNoTax, setShowNoTax] = useState(false);

  const fromDate = periodToFromDate(period);
  const groupBy = groupByForPeriod(period);

  // Build API URLs
  const historicoUrl = `/api/combustible/historico?fuel=${fuelKey}&from=${fromDate}&groupBy=${groupBy}${province ? `&province=${province}` : ""}`;
  const tendenciaUrl = `/api/combustible/tendencia${province ? `?province=${province}` : ""}`;

  const { data: historicoData, isLoading: isLoadingHistorico } =
    useSWR<HistoricoResponse>(historicoUrl, fetcher);

  const { data: tendenciaData, isLoading: isLoadingTendencia } =
    useSWR<TendenciaResponse>(tendenciaUrl, fetcher);

  // National comparison only shown when a province is selected
  const { data: nationalData } = useSWR<HistoricoResponse>(
    province
      ? `/api/combustible/historico?fuel=${fuelKey}&from=${fromDate}&groupBy=${groupBy}`
      : null,
    fetcher
  );

  const priceData = historicoData?.data ?? [];
  const fuelTab = FUEL_TABS.find((f) => f.key === fuelKey)!;

  // Stats
  const stats = useMemo(() => {
    const prices = priceData
      .map((d) => (showNoTax ? (d.priceBeforeTax ?? d.price) : d.price))
      .filter((p): p is number => p !== null);
    if (!prices.length) return null;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const current = prices[prices.length - 1] ?? null;
    return { min, max, avg, current };
  }, [priceData, showNoTax]);

  const currentTrend = tendenciaData?.[fuelKey] ?? undefined;
  const provinceName = province
    ? PROVINCE_NAMES[province] ?? province
    : "España";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-heading text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Histórico de Precios de Combustible
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Evolución de precios desde 2016 — datos oficiales de la CNMC por provincia.
        </p>
      </div>

      {/* Fuel type tabs */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Tipo de combustible">
        {FUEL_TABS.map((tab) => {
          const isActive = fuelKey === tab.key;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setFuelKey(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                isActive
                  ? "border-transparent text-white"
                  : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
              style={isActive ? { backgroundColor: tab.color, borderColor: tab.color } : {}}
            >
              <Fuel className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Controls row: period + province */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Period buttons */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg" role="group" aria-label="Período">
          <Calendar className="w-4 h-4 text-gray-400 ml-1" />
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                period === p.key
                  ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Province dropdown */}
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <select
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[var(--tl-primary)] focus:outline-none"
            aria-label="Seleccionar provincia"
          >
            {PROVINCE_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Trend cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {FUEL_TABS.map((tab) => (
          <TrendCard
            key={tab.key}
            label={tab.label}
            trend={isLoadingTendencia ? undefined : tendenciaData?.[tab.key]}
            fuelKey={tab.key}
          />
        ))}
      </div>

      {/* Chart card */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" style={{ color: fuelTab.color }} />
            <h2 className="font-heading text-lg font-semibold text-gray-900 dark:text-gray-100">
              {fuelTab.label} — {provinceName}
            </h2>
          </div>
          {/* Price with/without tax toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-600 dark:text-gray-400">
            <span>Sin impuestos (PAI)</span>
            <button
              type="button"
              role="switch"
              aria-checked={showNoTax}
              onClick={() => setShowNoTax((v) => !v)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--tl-primary)] focus:ring-offset-2 ${
                showNoTax
                  ? "bg-[var(--tl-primary)]"
                  : "bg-gray-300 dark:bg-gray-600"
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                  showNoTax ? "translate-x-4" : "translate-x-1"
                }`}
              />
            </button>
          </label>
        </div>

        {isLoadingHistorico ? (
          <div className="h-48 flex items-center justify-center text-gray-400 dark:text-gray-500">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-gray-200 dark:border-gray-700 border-t-[var(--tl-primary)] rounded-full animate-spin" />
              <span className="text-sm">Cargando histórico de precios...</span>
            </div>
          </div>
        ) : priceData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-400 dark:text-gray-500 text-center">
            <div>
              <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Datos en proceso de carga</p>
              <p className="text-xs mt-1 opacity-70">Inténtalo de nuevo en unos momentos</p>
            </div>
          </div>
        ) : (
          <div className="pl-12 pr-2">
            <PriceChart
              data={priceData}
              showNoTax={showNoTax}
              fuelColor={fuelTab.color}
              groupBy={groupBy}
            />

            {/* National comparison line note */}
            {province && nationalData?.data?.length ? (
              <p className="mt-4 text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                <span className="inline-block w-3 h-0.5 bg-gray-400 rounded" />
                La línea representa {provinceName}. Media nacional: {formatPrice(
                  nationalData.data[nationalData.data.length - 1]?.price
                )}
              </p>
            ) : null}
          </div>
        )}
      </div>

      {/* Stats summary */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Precio actual", value: stats.current, icon: <Fuel className="w-4 h-4" style={{ color: fuelTab.color }} /> },
            { label: "Precio mínimo", value: stats.min, icon: <ArrowDown className="w-4 h-4 text-[var(--tl-success)]" /> },
            { label: "Precio máximo", value: stats.max, icon: <ArrowUp className="w-4 h-4 text-[var(--tl-danger)]" /> },
            { label: "Precio medio", value: stats.avg, icon: <BarChart3 className="w-4 h-4 text-gray-400" /> },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4"
            >
              <div className="flex items-center gap-2 mb-1">
                {item.icon}
                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
                  {item.label}
                </span>
              </div>
              <div className="font-mono text-xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
                {formatPrice(item.value)}
              </div>
              <div className="text-xs text-gray-400 mt-1">{provinceName}</div>
            </div>
          ))}
        </div>
      )}

      {/* Trend detail table */}
      {currentTrend && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="font-heading text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: fuelTab.color }} />
            Comparativa temporal — {fuelTab.label}
          </h3>
          <TrendPeriodRow label="Hace 7 días" current={currentTrend.current} reference={currentTrend.d7} />
          <TrendPeriodRow label="Hace 30 días" current={currentTrend.current} reference={currentTrend.d30} />
          <TrendPeriodRow label="Hace 90 días" current={currentTrend.current} reference={currentTrend.d90} />
          <TrendPeriodRow label="Hace 1 año" current={currentTrend.current} reference={currentTrend.y1} />
        </div>
      )}

      {/* Attribution */}
      <p className="text-xs text-gray-400 dark:text-gray-500 text-center pb-4">
        Fuente: CNMC (Comisión Nacional de los Mercados y la Competencia). Datos diarios provinciales desde 2016.
        <br />
        Los precios sin impuestos corresponden al Precio Antes de Impuestos (PAI) incluido en los informes CNMC.
      </p>
    </div>
  );
}
