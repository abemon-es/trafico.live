"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MapPin, Search, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";

export interface StationEntry {
  name: string;
  slug: string | null;
  code: string | null;
  municipality: string | null;
  lines: string[];
}

export default function StationsList({
  stations,
  networkName,
}: {
  stations: StationEntry[];
  networkName: string;
}) {
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return stations;
    const q = search.toLowerCase();
    return stations.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.municipality ?? "").toLowerCase().includes(q) ||
        s.lines.some((l) => l.toLowerCase() === q)
    );
  }, [stations, search]);

  const visible = showAll ? filtered : filtered.slice(0, 30);

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <h2 className="font-heading font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-[var(--tl-primary)]" />
          Estaciones de Cercanías {networkName}
          {stations.length > 0 && (
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
              ({stations.length})
            </span>
          )}
        </h2>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar estación o línea..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-[var(--tl-primary)] focus:ring-1 focus:ring-[var(--tl-primary)]/30 text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {search
              ? `No se encontraron estaciones para "${search}".`
              : "No hay estaciones disponibles para esta red."}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/50">
            {visible.map((station) => {
              const row = (
                <div className="flex items-center gap-2.5 py-2 px-4 group">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 group-hover:text-[var(--tl-primary)] shrink-0 transition-colors" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-gray-100 truncate group-hover:text-[var(--tl-primary)] transition-colors">
                      {station.name}
                    </p>
                    <p className="text-[10px] font-mono text-gray-500 dark:text-gray-400 truncate">
                      {[station.code, station.municipality].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {station.lines.length > 0 && (
                    <div className="flex items-center gap-1 shrink-0">
                      {station.lines.slice(0, 3).map((line) => (
                        <span
                          key={line}
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[var(--tl-primary-bg)] text-[var(--tl-primary)]"
                        >
                          {line}
                        </span>
                      ))}
                      {station.lines.length > 3 && (
                        <span className="text-[10px] text-gray-400">
                          +{station.lines.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[var(--tl-primary)] shrink-0 transition-colors" />
                </div>
              );
              return station.slug ? (
                <Link
                  key={station.slug}
                  href={`/trenes/estacion/${station.slug}`}
                  className="block hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                >
                  {row}
                </Link>
              ) : (
                <div key={station.name}>{row}</div>
              );
            })}
          </div>

          {filtered.length > 30 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 text-sm text-[var(--tl-primary)] font-semibold hover:bg-[var(--tl-primary-bg)] rounded-lg transition-colors"
            >
              {showAll ? (
                <>
                  Mostrar menos <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  Ver todas las {filtered.length} estaciones <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </>
      )}
    </section>
  );
}
