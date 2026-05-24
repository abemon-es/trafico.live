"use client";

/**
 * VoyageTable — sortable table of recent voyages (last 50)
 *
 * Receives voyage data from the server and renders a sortable table with:
 * Origin → Destination, departure date, arrival date, duration, distance km, avg speed
 */

import { useState } from "react";
import {
  ArrowRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Navigation,
  Anchor,
} from "lucide-react";

interface Voyage {
  id: string;
  departurePort: string | null;
  arrivalPort: string | null;
  departedAt: string | null;
  arrivedAt: string | null;
  durationH: number | null;
  distanceNm: number | null;
  avgSpeedKn: number | null;
  status: "IN_TRANSIT" | "ARRIVED";
}

interface VoyageTableProps {
  voyages: Voyage[];
}

type SortKey = "departedAt" | "durationH" | "distanceNm" | "avgSpeedKn";
type SortDir = "asc" | "desc";

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtDuration(h: number | null | undefined): string {
  if (h == null) return "—";
  if (h < 1) return `${Math.round(h * 60)}min`;
  if (h < 24) return `${h.toFixed(1).replace(".", ",")}h`;
  const days = Math.floor(h / 24);
  const rem = Math.round(h - days * 24);
  return rem > 0 ? `${days}d ${rem}h` : `${days}d`;
}

function fmtNm(nm: number | null | undefined): string {
  if (nm == null) return "—";
  return `${nm.toFixed(0)} nm`;
}

function fmtKn(kn: number | null | undefined): string {
  if (kn == null) return "—";
  return `${kn.toFixed(1)} kn`;
}

function SortIcon({
  col,
  active,
  dir,
}: {
  col: SortKey;
  active: SortKey;
  dir: SortDir;
}) {
  if (col !== active) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
  return dir === "asc" ? (
    <ArrowUp className="w-3 h-3 text-tl-sea-500" />
  ) : (
    <ArrowDown className="w-3 h-3 text-tl-sea-500" />
  );
}

export function VoyageTable({ voyages }: VoyageTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("departedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  if (voyages.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center">
        <Navigation className="w-8 h-8 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Sin viajes registrados para este buque todavia.
        </p>
      </div>
    );
  }

  const sorted = [...voyages].sort((a, b) => {
    let va: number | null = null;
    let vb: number | null = null;
    if (sortKey === "departedAt") {
      va = a.departedAt ? new Date(a.departedAt).getTime() : null;
      vb = b.departedAt ? new Date(b.departedAt).getTime() : null;
    } else if (sortKey === "durationH") {
      va = a.durationH;
      vb = b.durationH;
    } else if (sortKey === "distanceNm") {
      va = a.distanceNm;
      vb = b.distanceNm;
    } else if (sortKey === "avgSpeedKn") {
      va = a.avgSpeedKn;
      vb = b.avgSpeedKn;
    }
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    return sortDir === "asc" ? va - vb : vb - va;
  });

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const ThSort = ({
    col,
    label,
    className = "",
  }: {
    col: SortKey;
    label: string;
    className?: string;
  }) => (
    <th
      className={`px-4 py-3 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors select-none ${className}`}
      onClick={() => handleSort(col)}
    >
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
        <SortIcon col={col} active={sortKey} dir={sortDir} />
      </div>
    </th>
  );

  return (
    <div className="rounded-2xl border border-tl-sea-100 dark:border-tl-sea-900/40 bg-white dark:bg-gray-900 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-tl-sea-100 dark:border-tl-sea-900/40 bg-gray-50/50 dark:bg-gray-800/30">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Ruta
              </th>
              <ThSort col="departedAt" label="Salida" />
              <ThSort col="durationH" label="Duracion" className="hidden sm:table-cell" />
              <ThSort col="distanceNm" label="Distancia" className="hidden md:table-cell" />
              <ThSort col="avgSpeedKn" label="Vel. media" className="hidden lg:table-cell" />
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Estado
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {sorted.map((v) => {
              const isInTransit = v.status === "IN_TRANSIT";
              return (
                <tr
                  key={v.id}
                  className="hover:bg-tl-sea-50/30 dark:hover:bg-tl-sea-900/10 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 font-medium text-gray-900 dark:text-gray-100">
                      <span className="truncate max-w-[110px]">
                        {v.departurePort ?? "—"}
                      </span>
                      <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      <span className="truncate max-w-[110px]">
                        {v.arrivalPort ?? (isInTransit ? "En ruta" : "—")}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 font-mono sm:hidden">
                      {fmtDuration(v.durationH)} · {fmtNm(v.distanceNm)}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {fmtDate(v.departedAt)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300 hidden sm:table-cell">
                    {fmtDuration(v.durationH)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300 hidden md:table-cell">
                    {fmtNm(v.distanceNm)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300 hidden lg:table-cell">
                    {fmtKn(v.avgSpeedKn)}
                  </td>
                  <td className="px-4 py-3">
                    {isInTransit ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-tl-sea-100 dark:bg-tl-sea-900/50 text-tl-sea-700 dark:text-tl-sea-300">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tl-sea-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-tl-sea-500" />
                        </span>
                        En curso
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                        <Anchor className="w-3 h-3" />
                        Llegado
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
