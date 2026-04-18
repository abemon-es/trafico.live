"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { Download, RefreshCw, Truck } from "lucide-react";
import { FleetMap, type VehicleFeature } from "@/components/flotas/FleetMap";
import { VehicleList, type Vehicle } from "@/components/flotas/VehicleList";

const fetcher = (url: string) =>
  fetch(url, {
    headers: {
      // In production the browser session cookie is enough (same-origin);
      // keep x-api-key for external API access.
    },
  }).then((r) => r.json());

interface FleetClient {
  id: string;
  name: string;
  plan: string;
}

interface DashboardClientProps {
  fleetClient: FleetClient;
  initialVehicles: Vehicle[];
}

export function DashboardClient({ fleetClient, initialVehicles }: DashboardClientProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ── Live positions (15s polling) ──────────────────────────────────────────
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // last hour
  const { data: positionsGeoJSON, isLoading } = useSWR(
    `/api/flotas/positions?since=${since}`,
    fetcher,
    { refreshInterval: 15_000, fallbackData: null }
  );

  // ── Vehicles with last position overlay ───────────────────────────────────
  const vehicleFeatures: VehicleFeature[] = initialVehicles.map((v) => ({
    id: v.id,
    externalId: v.externalId,
    label: v.label,
    licensePlate: v.licensePlate,
    lat: v.lastPosition?.lat ?? 40.4,
    lon: v.lastPosition?.lon ?? -3.7,
    speed: v.lastPosition?.speed,
    heading: v.lastPosition?.heading,
    recordedAt: v.lastPosition?.recordedAt ?? new Date().toISOString(),
  }));

  // Merge live GeoJSON positions on top of initial list
  const enrichedFeatures: VehicleFeature[] = positionsGeoJSON?.features
    ? positionsGeoJSON.features.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (f: any): VehicleFeature => {
          const base = vehicleFeatures.find(
            (v) => v.externalId === f.properties.vehicleId
          );
          return {
            id: base?.id ?? f.properties.vehicleId,
            externalId: f.properties.vehicleId,
            label: base?.label,
            licensePlate: base?.licensePlate,
            lat: f.geometry.coordinates[1],
            lon: f.geometry.coordinates[0],
            speed: f.properties.speed,
            heading: f.properties.heading,
            recordedAt: f.properties.recordedAt,
          };
        }
      )
    : vehicleFeatures;

  // ── Selected vehicle detail ───────────────────────────────────────────────
  const selectedVehicle = enrichedFeatures.find((v) => v.id === selectedId) ?? null;

  // ── CSV export ────────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const ids = selectedId
      ? [selectedId]
      : enrichedFeatures.map((v) => v.id);

    const params = new URLSearchParams({ since: since24h });
    ids.forEach((id) => params.append("vehicleId", id));

    const res = await fetch(`/api/flotas/positions?${params}`);
    if (!res.ok) return;

    const json = await res.json();
    const features = json.features ?? [];

    const rows = [
      ["vehicleId", "lat", "lon", "speed", "heading", "recordedAt"].join(","),
      ...features.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (f: any) =>
          [
            f.properties.vehicleId,
            f.geometry.coordinates[1],
            f.geometry.coordinates[0],
            f.properties.speed ?? "",
            f.properties.heading ?? "",
            f.properties.recordedAt,
          ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flotas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [enrichedFeatures, selectedId]);

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* ── Left sidebar: vehicle list ────────────────────────────── */}
      <aside className="w-72 shrink-0 flex flex-col bg-white dark:bg-tl-900 border-r border-tl-100 dark:border-tl-800 p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-heading font-semibold text-sm truncate">{fleetClient.name}</p>
            <p className="text-xs text-foreground/40 font-mono uppercase">{fleetClient.plan}</p>
          </div>
          {isLoading && (
            <RefreshCw className="w-4 h-4 text-tl-400 animate-spin" />
          )}
        </div>
        <VehicleList
          vehicles={initialVehicles}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </aside>

      {/* ── Main: fleet map ────────────────────────────────────────── */}
      <main className="flex-1 relative min-w-0">
        <FleetMap
          vehicles={enrichedFeatures}
          selectedId={selectedId}
          onVehicleSelect={setSelectedId}
          className="absolute inset-0"
        />

        {/* Export button overlay */}
        <button
          onClick={handleExport}
          className="absolute top-4 right-4 z-10 flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-tl-900 border border-tl-100 dark:border-tl-800 shadow text-sm font-medium hover:bg-tl-50 dark:hover:bg-tl-800 transition-colors"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </main>

      {/* ── Right panel: selected vehicle ──────────────────────────── */}
      {selectedVehicle && (
        <aside className="w-72 shrink-0 flex flex-col bg-white dark:bg-tl-900 border-l border-tl-100 dark:border-tl-800 p-5 gap-4 overflow-y-auto">
          <div className="flex items-center gap-3">
            <Truck className="w-6 h-6 text-tl-600 dark:text-tl-400 shrink-0" />
            <div>
              <p className="font-heading font-semibold">
                {selectedVehicle.label ?? selectedVehicle.externalId}
              </p>
              {selectedVehicle.licensePlate && (
                <p className="text-xs font-mono text-foreground/50">{selectedVehicle.licensePlate}</p>
              )}
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex flex-col gap-0.5 p-3 rounded-lg bg-tl-50 dark:bg-tl-800">
              <dt className="text-xs text-foreground/40">Latitud</dt>
              <dd className="font-mono">{selectedVehicle.lat.toFixed(5)}</dd>
            </div>
            <div className="flex flex-col gap-0.5 p-3 rounded-lg bg-tl-50 dark:bg-tl-800">
              <dt className="text-xs text-foreground/40">Longitud</dt>
              <dd className="font-mono">{selectedVehicle.lon.toFixed(5)}</dd>
            </div>
            <div className="flex flex-col gap-0.5 p-3 rounded-lg bg-tl-50 dark:bg-tl-800">
              <dt className="text-xs text-foreground/40">Velocidad</dt>
              <dd className="font-mono">
                {selectedVehicle.speed != null ? `${selectedVehicle.speed.toFixed(1)} km/h` : "—"}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5 p-3 rounded-lg bg-tl-50 dark:bg-tl-800">
              <dt className="text-xs text-foreground/40">Rumbo</dt>
              <dd className="font-mono">
                {selectedVehicle.heading != null ? `${selectedVehicle.heading.toFixed(0)}°` : "—"}
              </dd>
            </div>
          </dl>

          <div className="flex flex-col gap-0.5 p-3 rounded-lg bg-tl-50 dark:bg-tl-800 text-sm">
            <p className="text-xs text-foreground/40">Última posición</p>
            <p className="font-mono text-xs">
              {new Date(selectedVehicle.recordedAt).toLocaleString("es-ES", {
                day: "2-digit",
                month: "2-digit",
                year: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </p>
          </div>

          <button
            onClick={() => setSelectedId(null)}
            className="mt-auto text-sm text-foreground/40 hover:text-foreground transition-colors"
          >
            Cerrar panel
          </button>
        </aside>
      )}
    </div>
  );
}
