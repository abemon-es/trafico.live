"use client";

import dynamic from "next/dynamic";
import { fetcher } from "@/lib/fetcher";
import { useState, useMemo } from "react";

const TransitMap = dynamic(() => import("./transit-map"), { ssr: false });
import useSWR from "swr";
import Link from "next/link";
import {
  Bus,
  Train,
  MapPin,
  Route,
  Building2,
  ArrowRight,
  Loader2,
  AlertTriangle,
  Info,
  Users,
} from "lucide-react";

// ── Mode config ────────────────────────────────────────────────────────────────

const MODES = [
  { key: "all", label: "Todos" },
  { key: "metro", label: "Metro" },
  { key: "bus", label: "Autobús" },
  { key: "tram", label: "Tranvía" },
  { key: "rail", label: "Ferrocarril" },
  { key: "funicular", label: "Funicular" },
] as const;

type ModeKey = (typeof MODES)[number]["key"];

const MODE_COLORS: Record<string, string> = {
  metro: "#7c3aed",
  bus: "#1b4bd5",
  tram: "#059669",
  rail: "#d48139",
  funicular: "#6b7280",
};

const MODE_LABELS: Record<string, string> = {
  metro: "Metro",
  bus: "Autobús",
  tram: "Tranvía",
  rail: "Ferrocarril",
  funicular: "Funicular",
};

const SORT_OPTIONS = [
  { key: "name", label: "Nombre" },
  { key: "city", label: "Ciudad" },
  { key: "routes", label: "Líneas" },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]["key"];

// ── Types ──────────────────────────────────────────────────────────────────────

interface Operator {
  id: string;
  mdbId?: string;
  name: string;
  city: string;
  province?: string;
  mode: string;
  routeCount: number;
  stopCount: number;
}

interface ApiData {
  operators?: Operator[];
  stats?: {
    totalOperators?: number;
    metroLines?: number;
    busLines?: number;
    totalStops?: number;
    citiesCovered?: number;
  };
}

// ── Mode badge ─────────────────────────────────────────────────────────────────

function ModeBadge({ mode }: { mode: string }) {
  const color = MODE_COLORS[mode] ?? "#6b7280";
  const label = MODE_LABELS[mode] ?? mode;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold text-white"
      style={{ backgroundColor: color }}
    >
      {label}
    </span>
  );
}

// ── Operator card ──────────────────────────────────────────────────────────────

function OperatorCard({ op }: { op: Operator }) {
  const slug = op.mdbId ?? op.id;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-[var(--tl-primary)] hover:shadow-md transition-all flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${MODE_COLORS[op.mode] ?? "#6b7280"}18` }}
        >
          {op.mode === "metro" || op.mode === "tram" || op.mode === "rail" ? (
            <Train className="w-5 h-5" style={{ color: MODE_COLORS[op.mode] ?? "#6b7280" }} />
          ) : (
            <Bus className="w-5 h-5" style={{ color: MODE_COLORS[op.mode] ?? "#6b7280" }} />
          )}
        </div>
        <ModeBadge mode={op.mode} />
      </div>

      {/* Name */}
      <div>
        <h3 className="font-heading font-bold text-gray-900 dark:text-gray-100 leading-tight">
          {op.name}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {op.city}
          {op.province && op.province !== op.city ? `, ${op.province}` : ""}
        </p>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <Route className="w-3.5 h-3.5" />
          <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
            {op.routeCount.toLocaleString("es-ES")}
          </span>{" "}
          líneas
        </span>
        <span className="flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" />
          <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
            {op.stopCount.toLocaleString("es-ES")}
          </span>{" "}
          paradas
        </span>
      </div>

      {/* CTA */}
      <Link
        href={`/transporte-publico/${slug}`}
        className="mt-auto flex items-center gap-1 text-sm font-semibold text-[var(--tl-primary)] hover:underline"
      >
        Ver detalle
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function TransportePublicoContent() {
  const [activeMode, setActiveMode] = useState<ModeKey>("all");
  const [sortBy, setSortBy] = useState<SortKey>("name");

  const { data, isLoading, error } = useSWR<ApiData>(
    "/api/transporte?include=operators",
    fetcher,
    { revalidateOnFocus: false }
  );

  const operators: Operator[] = data?.operators ?? [];
  const stats = data?.stats ?? {};

  const filtered = useMemo(() => {
    let list = activeMode === "all" ? operators : operators.filter((o) => o.mode === activeMode);
    return [...list].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name, "es");
      if (sortBy === "city") return a.city.localeCompare(b.city, "es");
      if (sortBy === "routes") return b.routeCount - a.routeCount;
      return 0;
    });
  }, [operators, activeMode, sortBy]);

  // ── Stats strip data ───────────────────────────────────────────────────────
  const stripStats = [
    {
      icon: Building2,
      label: "Operadores",
      value: (stats.totalOperators ?? operators.length).toLocaleString("es-ES"),
      color: "text-[var(--tl-primary)]",
    },
    {
      icon: Train,
      label: "Líneas Metro",
      value: (stats.metroLines ?? 0).toLocaleString("es-ES"),
      color: "text-[#7c3aed]",
    },
    {
      icon: Bus,
      label: "Líneas Bus",
      value: (stats.busLines ?? 0).toLocaleString("es-ES"),
      color: "text-[var(--tl-info)]",
    },
    {
      icon: MapPin,
      label: "Paradas",
      value: (stats.totalStops ?? 0).toLocaleString("es-ES"),
      color: "text-gray-900 dark:text-gray-100",
    },
    {
      icon: Users,
      label: "Ciudades",
      value: (stats.citiesCovered ?? 0).toLocaleString("es-ES"),
      color: "text-[var(--tl-success)]",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold text-gray-900 dark:text-gray-100">
          Transporte Público en España
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Metro, autobús y tranvía · Rutas, paradas y horarios GTFS
        </p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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

      {/* Map */}
      <section className="mb-8">
        <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          Mapa de transporte público
        </h2>
        <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
          <TransitMap height="450px" />
        </div>
      </section>

      {/* Filters + Sort */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Mode tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setActiveMode(m.key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                activeMode === m.key
                  ? "bg-[var(--tl-primary)] text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 shrink-0">
          <span>Ordenar por:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[var(--tl-primary)]"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm">Cargando operadores…</span>
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-700 dark:text-red-400">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-sm">No se pudo cargar el directorio de operadores. Inténtalo de nuevo.</p>
        </div>
      )}

      {/* Empty: API not yet populated */}
      {!isLoading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <div className="w-14 h-14 rounded-full bg-tl-50 dark:bg-tl-900/20 flex items-center justify-center">
            <Bus className="w-7 h-7 text-[var(--tl-primary)]" />
          </div>
          <p className="font-heading font-semibold text-gray-900 dark:text-gray-100">
            Datos en proceso de carga
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
            Los operadores de transporte público se sincronizan diariamente desde las fuentes GTFS
            oficiales.
          </p>
        </div>
      )}

      {/* Operator grid */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((op) => (
            <OperatorCard key={op.id} op={op} />
          ))}
        </div>
      )}

      {/* Attribution */}
      <p className="flex items-center gap-1.5 text-[11px] text-gray-400 pb-4">
        <Info className="w-3 h-3" />
        Fuentes: datos GTFS de operadores públicos españoles. Actualización diaria.
      </p>
    </div>
  );
}
