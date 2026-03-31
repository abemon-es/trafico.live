"use client";

import { useState, useMemo } from "react";
import { Route, AlertTriangle, Camera, Radar, Fuel, ChevronDown, X, MapPin } from "lucide-react";
import type { Incident, Camera as CameraType, Radar as RadarType, GasStation } from "./TrafficMap";

interface CorridorViewProps {
  incidents: Incident[];
  cameras: CameraType[];
  radars: RadarType[];
  gasStations: GasStation[];
  onFlyTo: (lng: number, lat: number, zoom?: number) => void;
  onClose: () => void;
}

interface CorridorItem {
  type: "incident" | "camera" | "radar" | "gasStation";
  km: number;
  lat: number;
  lng: number;
  label: string;
  sublabel?: string;
  color: string;
  icon: React.ReactNode;
}

const EFFECT_COLORS: Record<string, string> = {
  ROAD_CLOSED: "#dc2626",
  SLOW_TRAFFIC: "#f97316",
  RESTRICTED: "#eab308",
  DIVERSION: "#3b82f6",
  OTHER_EFFECT: "#6b7280",
};

export function CorridorView({ incidents, cameras, radars, gasStations, onFlyTo, onClose }: CorridorViewProps) {
  const [selectedRoad, setSelectedRoad] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Extract unique roads from all data sources
  const roads = useMemo(() => {
    const roadSet = new Set<string>();
    for (const inc of incidents) { if (inc.road) roadSet.add(inc.road); }
    for (const cam of cameras) { if (cam.road) roadSet.add(cam.road); }
    for (const rad of radars) { if (rad.road) roadSet.add(rad.road); }
    return [...roadSet].sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
  }, [incidents, cameras, radars]);

  // Build corridor items for selected road
  const corridorItems = useMemo(() => {
    if (!selectedRoad) return [];

    const items: CorridorItem[] = [];

    // Incidents on this road
    for (const inc of incidents) {
      if (inc.road !== selectedRoad) continue;
      items.push({
        type: "incident",
        km: inc.km || 0,
        lat: inc.lat,
        lng: inc.lng,
        label: inc.description || inc.type,
        sublabel: inc.effect,
        color: EFFECT_COLORS[inc.effect] || "#6b7280",
        icon: <AlertTriangle className="w-4 h-4" />,
      });
    }

    // Cameras on this road
    for (const cam of cameras) {
      if (cam.road !== selectedRoad) continue;
      items.push({
        type: "camera",
        km: 0,
        lat: cam.lat,
        lng: cam.lng,
        label: cam.name,
        color: "#3b82f6",
        icon: <Camera className="w-4 h-4" />,
      });
    }

    // Radars on this road
    for (const rad of radars) {
      if (rad.road !== selectedRoad) continue;
      items.push({
        type: "radar",
        km: rad.kmPoint,
        lat: rad.lat,
        lng: rad.lng,
        label: `Radar ${rad.speedLimit ? `${rad.speedLimit} km/h` : ""}`,
        sublabel: rad.type,
        color: "#eab308",
        icon: <Radar className="w-4 h-4" />,
      });
    }

    // Sort by km
    return items.sort((a, b) => a.km - b.km);
  }, [selectedRoad, incidents, cameras, radars]);

  return (
    <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Route className="w-4 h-4 text-tl-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Vista corredor</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Road selector */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5" />
              {selectedRoad || "Seleccionar carretera"}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDropdown ? "rotate-180" : ""}`} />
            </button>
            {showDropdown && (
              <div className="absolute top-full right-0 mt-1 w-48 max-h-64 overflow-y-auto bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-800 z-50 py-1">
                {roads.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-gray-400">No hay carreteras con datos</p>
                ) : (
                  roads.map((road) => (
                    <button
                      key={road}
                      onClick={() => { setSelectedRoad(road); setShowDropdown(false); }}
                      className={`w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 ${selectedRoad === road ? "text-tl-600 dark:text-tl-400 font-medium" : "text-gray-700 dark:text-gray-300"}`}
                    >
                      {road}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Corridor items */}
      {selectedRoad && (
        <div className="max-h-48 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
          {corridorItems.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400">Sin datos en {selectedRoad}</p>
          ) : (
            corridorItems.map((item, i) => (
              <button
                key={`${item.type}-${i}`}
                onClick={() => onFlyTo(item.lng, item.lat, 14)}
                className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
              >
                <span className="flex-shrink-0" style={{ color: item.color }}>{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{item.label}</p>
                  {item.sublabel && <p className="text-xs text-gray-400">{item.sublabel}</p>}
                </div>
                <span className="text-xs text-gray-400 font-mono tabular-nums flex-shrink-0">
                  km {item.km.toFixed(1)}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
