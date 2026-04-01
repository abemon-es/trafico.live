"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Camera, Loader2, Radio, Fuel, Zap, Radar, Monitor } from "lucide-react";

function useRelativeTime(date: Date | null | undefined): string {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!date) return;
    const interval = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(interval);
  }, [date]);

  if (!date) return "";

  const diffSec = Math.floor((now - date.getTime()) / 1000);
  if (diffSec < 5) return "ahora mismo";
  if (diffSec < 60) return `hace ${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `hace ${diffMin}min`;
  return date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

interface MapStatsProps {
  v16Count?: number;
  incidentCount?: number;
  cameraCount?: number;
  panelCount?: number;
  radarCount?: number;
  chargerCount?: number;
  gasStationCount?: number;
  lastUpdated?: Date | null;
  isLoading: boolean;
  isFullscreen?: boolean;
  isStreaming?: boolean;
}

export function MapStats({
  v16Count = 0,
  incidentCount = 0,
  cameraCount = 0,
  panelCount = 0,
  radarCount = 0,
  chargerCount = 0,
  gasStationCount = 0,
  lastUpdated,
  isLoading,
  isFullscreen = false,
  isStreaming = false,
}: MapStatsProps) {
  const relativeTime = useRelativeTime(lastUpdated);

  const stats = [
    { count: v16Count, icon: <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />, label: "V16", show: v16Count > 0 },
    { count: incidentCount, icon: <AlertTriangle className="w-3.5 h-3.5 text-tl-amber-400" />, label: "incidencias", show: incidentCount > 0 },
    { count: cameraCount, icon: <Camera className="w-3.5 h-3.5 text-tl-400" />, label: "cámaras", show: cameraCount > 0 },
    { count: radarCount, icon: <Radar className="w-3.5 h-3.5 text-yellow-500" />, label: "radares", show: radarCount > 0 },
    { count: gasStationCount, icon: <Fuel className="w-3.5 h-3.5 text-tl-amber-400" />, label: "gasolineras", show: gasStationCount > 0 },
    { count: chargerCount, icon: <Zap className="w-3.5 h-3.5 text-green-500" />, label: "cargadores", show: chargerCount > 0 },
    { count: panelCount, icon: <Monitor className="w-3.5 h-3.5 text-cyan-500" />, label: "paneles", show: panelCount > 0 },
  ];

  const visibleStats = stats.filter((s) => s.show);

  return (
    <div
      className={`
        flex items-center justify-between px-4 py-2 text-sm
        ${isFullscreen
          ? "bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 dark:border-gray-800"
          : "bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800"
        }
      `}
    >
      {/* Counts */}
      <div className="flex items-center gap-3 md:gap-4 flex-wrap overflow-x-auto">
        {visibleStats.length > 0 ? (
          visibleStats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 whitespace-nowrap">
              {stat.icon}
              <span className="font-medium font-mono text-xs">{stat.count.toLocaleString("es-ES")}</span>
              <span className="text-gray-400 dark:text-gray-500 text-xs hidden sm:inline">{stat.label}</span>
            </div>
          ))
        ) : (
          <span className="text-gray-400 dark:text-gray-500 text-xs">Sin datos visibles</span>
        )}
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 flex-shrink-0 ml-2">
        {isStreaming && (
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400" title="Conexión en tiempo real activa">
            <Radio className="w-3 h-3" />
            <span className="text-xs font-medium font-mono">LIVE</span>
          </span>
        )}
        {isLoading ? (
          <span className="flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="text-xs hidden sm:inline">Actualizando...</span>
          </span>
        ) : relativeTime ? (
          <span className="tabular-nums text-xs">{relativeTime}</span>
        ) : null}
      </div>
    </div>
  );
}
