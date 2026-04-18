"use client";

import { useState, useMemo } from "react";
import { Search, Circle, Truck } from "lucide-react";

export interface Vehicle {
  id: string;
  externalId: string;
  licensePlate?: string | null;
  label?: string | null;
  status: "ACTIVE" | "INACTIVE";
  lastPosition?: {
    lat: number;
    lon: number;
    speed?: number | null;
    heading?: number | null;
    recordedAt: string;
  } | null;
}

interface VehicleListProps {
  vehicles: Vehicle[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
}

/** Derive motion status from last position age */
function motionStatus(v: Vehicle): "moving" | "stopped" | "idle" | "offline" {
  if (!v.lastPosition) return "offline";
  const ageMs = Date.now() - new Date(v.lastPosition.recordedAt).getTime();
  if (ageMs > 10 * 60 * 1000) return "idle";
  if ((v.lastPosition.speed ?? 0) < 2) return "stopped";
  return "moving";
}

const STATUS_LABELS: Record<string, string> = {
  moving: "En marcha",
  stopped: "Parado",
  idle: "Sin señal reciente",
  offline: "Sin datos",
};

const STATUS_COLORS: Record<string, string> = {
  moving: "text-signal-green",
  stopped: "text-tl-amber-500",
  idle: "text-foreground/40",
  offline: "text-foreground/20",
};

export function VehicleList({ vehicles, selectedId, onSelect }: VehicleListProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "moving" | "stopped" | "idle">("all");

  const filtered = useMemo(() => {
    return vehicles.filter((v) => {
      const q = query.toLowerCase();
      const matchesSearch =
        !q ||
        v.externalId.toLowerCase().includes(q) ||
        (v.licensePlate ?? "").toLowerCase().includes(q) ||
        (v.label ?? "").toLowerCase().includes(q);
      const ms = motionStatus(v);
      const matchesFilter = filter === "all" || ms === filter;
      return matchesSearch && matchesFilter;
    });
  }, [vehicles, query, filter]);

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
        <input
          type="text"
          placeholder="Buscar vehículo…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-tl-100 dark:border-tl-800 bg-white dark:bg-tl-950 text-sm placeholder-foreground/30 focus:outline-none focus:ring-2 focus:ring-tl-500"
        />
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "moving", "stopped", "idle"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={[
              "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
              filter === f
                ? "bg-tl-600 text-white"
                : "bg-tl-50 dark:bg-tl-900 text-foreground/60 hover:text-foreground",
            ].join(" ")}
          >
            {f === "all" ? "Todos" : STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      {/* Count */}
      <p className="text-xs text-foreground/40 font-mono">
        {filtered.length} vehículo{filtered.length !== 1 ? "s" : ""}
      </p>

      {/* List */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-1">
        {filtered.length === 0 && (
          <p className="text-sm text-foreground/40 text-center py-8">Sin resultados</p>
        )}
        {filtered.map((v) => {
          const ms = motionStatus(v);
          const isSelected = v.id === selectedId;
          return (
            <button
              key={v.id}
              onClick={() => onSelect(v.id)}
              className={[
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                isSelected
                  ? "bg-tl-100 dark:bg-tl-800"
                  : "hover:bg-tl-50 dark:hover:bg-tl-900",
              ].join(" ")}
            >
              <Truck className="w-4 h-4 shrink-0 text-tl-600 dark:text-tl-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {v.label || v.externalId}
                </p>
                {v.licensePlate && (
                  <p className="text-xs font-mono text-foreground/50 truncate">{v.licensePlate}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Circle className={`w-2 h-2 fill-current ${STATUS_COLORS[ms]}`} />
                <span className={`text-xs ${STATUS_COLORS[ms]}`}>{STATUS_LABELS[ms]}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
