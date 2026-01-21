"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  RefreshCw,
  MapPin,
  ExternalLink,
  AlertCircle,
  Play,
  Pause,
} from "lucide-react";
import type { Camera } from "./CameraCard";

interface CameraModalProps {
  camera: Camera;
  onClose: () => void;
}

export function CameraModal({ camera, onClose }: CameraModalProps) {
  const [imageKey, setImageKey] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const refreshImage = useCallback(() => {
    setImageKey((k) => k + 1);
    setImageError(false);
    setLastRefresh(new Date());
  }, []);

  // Auto-refresh every 30 seconds when enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(refreshImage, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshImage]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // Add cache-busting to force reload
  const imageUrl = `${camera.imageUrl}?t=${imageKey}`;

  // Google Maps link
  const mapsUrl = `https://www.google.com/maps?q=${camera.lat},${camera.lng}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div>
            <h2 className="font-semibold text-gray-900">{camera.name}</h2>
            <p className="text-sm text-gray-500">{camera.province}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Cerrar"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Image */}
        <div className="relative aspect-video bg-gray-900">
          {!imageError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={imageKey}
              src={imageUrl}
              alt={camera.name}
              className="w-full h-full object-contain"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
              <AlertCircle className="w-12 h-12 mb-2" />
              <span>Imagen no disponible</span>
            </div>
          )}

          {/* Auto-refresh indicator */}
          {autoRefresh && (
            <div className="absolute top-3 left-3 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              Auto-refresh activo
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="px-4 py-3 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {/* Manual refresh */}
            <button
              onClick={refreshImage}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </button>

            {/* Auto-refresh toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                autoRefresh
                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {autoRefresh ? (
                <>
                  <Pause className="w-4 h-4" />
                  Parar
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Auto (30s)
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>
              Última actualización: {lastRefresh.toLocaleTimeString("es-ES")}
            </span>

            {/* View on map */}
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline"
            >
              <MapPin className="w-4 h-4" />
              Ver en mapa
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Details */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Carretera</span>
            <p className="font-medium">{camera.road || "-"}</p>
          </div>
          <div>
            <span className="text-gray-500">Punto km</span>
            <p className="font-medium">
              {camera.kmPoint !== null ? camera.kmPoint : "-"}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Dirección</span>
            <p className="font-medium">{camera.direction || "-"}</p>
          </div>
          <div>
            <span className="text-gray-500">Coordenadas</span>
            <p className="font-medium font-mono text-xs">
              {camera.lat.toFixed(4)}, {camera.lng.toFixed(4)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
