"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Camera, Loader2, Radio } from "lucide-react";

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
  lastUpdated,
  isLoading,
  isFullscreen = false,
  isStreaming = false,
}: MapStatsProps) {
  const relativeTime = useRelativeTime(lastUpdated);

  return (
    <div
      className={`
        flex items-center justify-between px-4 py-2 text-sm
        ${isFullscreen
          ? "bg-white dark:bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 dark:border-gray-800"
          : "bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800"
        }
      `}
    >
      {/* Counts */}
      <div className="flex items-center gap-4 flex-wrap">
        {v16Count > 0 && (
          <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="font-medium font-mono">{v16Count}</span>
            <span className="text-gray-500 dark:text-gray-400">balizas V16</span>
          </div>
        )}

        {incidentCount > 0 && (
          <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
            <AlertTriangle className="w-4 h-4 text-orange-500 dark:text-orange-400" />
            <span className="font-medium font-mono">{incidentCount}</span>
            <span className="text-gray-500 dark:text-gray-400">incidencias</span>
          </div>
        )}

        {cameraCount > 0 && (
          <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
            <Camera className="w-4 h-4 text-tl-500" />
            <span className="font-medium font-mono">{cameraCount}</span>
            <span className="text-gray-500 dark:text-gray-400">cámaras</span>
          </div>
        )}

        {panelCount > 0 && (
          <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
            <span className="font-medium font-mono">{panelCount}</span>
            <span className="text-gray-500 dark:text-gray-400">paneles</span>
          </div>
        )}

        {v16Count === 0 && incidentCount === 0 && cameraCount === 0 && panelCount === 0 && (
          <span className="text-gray-500 dark:text-gray-400">Sin datos visibles</span>
        )}
      </div>

      {/* Last updated / Loading */}
      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
        {isStreaming && (
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400" title="Conexión en tiempo real activa">
            <Radio className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">LIVE</span>
          </span>
        )}
        {isLoading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Actualizando...</span>
          </span>
        ) : relativeTime ? (
          <span className="tabular-nums">{relativeTime}</span>
        ) : null}
      </div>
    </div>
  );
}
