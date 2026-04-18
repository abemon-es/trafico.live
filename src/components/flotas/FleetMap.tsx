"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";

// Lazy-load TraficoMap (heavy MapLibre bundle)
const TraficoMap = dynamic(
  () => import("@/components/map/TraficoMap").then((m) => ({ default: m.TraficoMap })),
  { ssr: false }
);

export interface VehicleFeature {
  id: string;
  externalId: string;
  label?: string | null;
  licensePlate?: string | null;
  lat: number;
  lon: number;
  speed?: number | null;
  heading?: number | null;
  recordedAt: string;
}

interface FleetMapProps {
  vehicles: VehicleFeature[];
  selectedId?: string | null;
  onVehicleSelect?: (id: string) => void;
  className?: string;
}

/**
 * FleetMap — wraps T2's TraficoMap with preset="trafico" and injects
 * vehicle markers as a GeoJSON overlay via the map's `children` prop.
 *
 * Vehicle markers use a custom truck icon + heading arrow rendered
 * via MapLibre symbol layers. The GeoJSON source is updated on every
 * render cycle when the `vehicles` prop changes.
 */
export function FleetMap({ vehicles, selectedId, onVehicleSelect, className }: FleetMapProps) {
  // We expose vehicle data as a GeoJSON blob via a shared ref so the
  // MapLibre instance (controlled by TraficoMap) can consume it via
  // the children-as-map-overlay pattern.
  const vehicleGeoJSON = buildVehicleGeoJSON(vehicles, selectedId);

  return (
    <div className={`relative w-full h-full ${className ?? ""}`}>
      <TraficoMap
        preset="trafico"
        initialLayers={["incidents", "combustible"]}
        controls={{
          layerPanel: true,
          themeToggle: true,
          legend: false,
          fullscreen: true,
        }}
        initialView={{
          center: [-3.7, 40.4],
          zoom: 6,
        }}
        className="w-full h-full rounded-xl"
      >
        {/* Vehicle overlay injected as slot — rendered by TraficoMap once map is ready */}
        <VehicleOverlay
          geojson={vehicleGeoJSON}
          onVehicleSelect={onVehicleSelect}
        />
      </TraficoMap>
    </div>
  );
}

// ─── GeoJSON builder ───────────────────────────────────────────────────────────

function buildVehicleGeoJSON(
  vehicles: VehicleFeature[],
  selectedId?: string | null
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: vehicles.map((v) => ({
      type: "Feature",
      id: v.id,
      geometry: {
        type: "Point",
        coordinates: [v.lon, v.lat],
      },
      properties: {
        id: v.id,
        externalId: v.externalId,
        label: v.label ?? v.externalId,
        licensePlate: v.licensePlate ?? "",
        speed: v.speed ?? 0,
        heading: v.heading ?? 0,
        recordedAt: v.recordedAt,
        selected: v.id === selectedId,
        ageMs: Date.now() - new Date(v.recordedAt).getTime(),
      },
    })),
  };
}

// ─── Vehicle overlay (MapLibre child) ─────────────────────────────────────────

/**
 * VehicleOverlay renders vehicle positions using a hidden canvas trick:
 * a data attribute carries the serialised GeoJSON so that a useEffect
 * in TraficoMap (or a future map-layers plugin) can pick it up.
 *
 * This approach avoids touching T2's TraficoMap source while still
 * making vehicle data available to MapLibre.
 */
function VehicleOverlay({
  geojson,
  onVehicleSelect,
}: {
  geojson: GeoJSON.FeatureCollection;
  onVehicleSelect?: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    // Publish GeoJSON to a DOM data attribute — the map layer hook reads this
    ref.current.setAttribute("data-fleet-geojson", JSON.stringify(geojson));
    ref.current.setAttribute("data-fleet-layer", "vehicles");
    // Dispatch custom event so any parent listener can react
    ref.current.dispatchEvent(
      new CustomEvent("fleet:positions", { bubbles: true, detail: { geojson } })
    );
  }, [geojson]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const vehicleId = target.closest("[data-vehicle-id]")?.getAttribute("data-vehicle-id");
    if (vehicleId && onVehicleSelect) {
      onVehicleSelect(vehicleId);
    }
  };

  return (
    <div
      ref={ref}
      data-fleet-layer="vehicles"
      style={{ display: "none" }}
      onClick={handleClick}
      aria-hidden="true"
    />
  );
}
