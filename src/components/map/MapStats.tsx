"use client";

import { AlertTriangle, Camera, Loader2 } from "lucide-react";

interface MapStatsProps {
  v16Count?: number;
  incidentCount?: number;
  cameraCount?: number;
  lastUpdated?: Date;
  isLoading: boolean;
  isFullscreen?: boolean;
}

export function MapStats({
  v16Count = 0,
  incidentCount = 0,
  cameraCount = 0,
  lastUpdated,
  isLoading,
  isFullscreen = false,
}: MapStatsProps) {
  return (
    <div
      className={`
        flex items-center justify-between px-4 py-2 text-sm
        ${isFullscreen
          ? "bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200"
          : "bg-gray-50 border-t border-gray-200"
        }
      `}
    >
      {/* Counts */}
      <div className="flex items-center gap-4 flex-wrap">
        {v16Count > 0 && (
          <div className="flex items-center gap-1.5 text-gray-700">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="font-medium">{v16Count}</span>
            <span className="text-gray-500">balizas V16</span>
          </div>
        )}

        {incidentCount > 0 && (
          <div className="flex items-center gap-1.5 text-gray-700">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <span className="font-medium">{incidentCount}</span>
            <span className="text-gray-500">incidencias</span>
          </div>
        )}

        {cameraCount > 0 && (
          <div className="flex items-center gap-1.5 text-gray-700">
            <Camera className="w-4 h-4 text-blue-500" />
            <span className="font-medium">{cameraCount}</span>
            <span className="text-gray-500">cámaras</span>
          </div>
        )}

        {v16Count === 0 && incidentCount === 0 && cameraCount === 0 && (
          <span className="text-gray-500">Sin datos visibles</span>
        )}
      </div>

      {/* Last updated / Loading */}
      <div className="flex items-center gap-2 text-gray-500">
        {isLoading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Actualizando...</span>
          </span>
        ) : lastUpdated ? (
          <span>
            Actualizado: {lastUpdated.toLocaleTimeString("es-ES", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        ) : null}
      </div>
    </div>
  );
}
