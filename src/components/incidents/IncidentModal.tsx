"use client";

import { useEffect } from "react";
import {
  X,
  MapPin,
  ExternalLink,
  Clock,
  Route,
  AlertTriangle,
  Ban,
  Car,
  CircleSlash,
  ArrowLeftRight,
  HelpCircle,
  Construction,
  CloudRain,
  TrafficCone,
} from "lucide-react";
import type { IncidentEffect, IncidentCause } from "@/lib/parsers/datex2";

// Effect colors
const EFFECT_COLORS: Record<IncidentEffect, string> = {
  ROAD_CLOSED: "#dc2626",
  SLOW_TRAFFIC: "#f97316",
  RESTRICTED: "#eab308",
  DIVERSION: "#3b82f6",
  OTHER_EFFECT: "#6b7280",
};

// Cause colors
const CAUSE_COLORS: Record<IncidentCause, string> = {
  ROADWORK: "#d97706",
  ACCIDENT: "#dc2626",
  WEATHER: "#2563eb",
  RESTRICTION: "#9333ea",
  OTHER_CAUSE: "#6b7280",
};

// Labels
const EFFECT_LABELS: Record<IncidentEffect, string> = {
  ROAD_CLOSED: "Carretera cortada",
  SLOW_TRAFFIC: "Tráfico lento",
  RESTRICTED: "Circulación restringida",
  DIVERSION: "Desvío",
  OTHER_EFFECT: "Otra afección",
};

const CAUSE_LABELS: Record<IncidentCause, string> = {
  ROADWORK: "Obras",
  ACCIDENT: "Accidente",
  WEATHER: "Meteorológico",
  RESTRICTION: "Restricción",
  OTHER_CAUSE: "Otra causa",
};

// Icons for effects
const EFFECT_ICONS: Record<IncidentEffect, React.ReactNode> = {
  ROAD_CLOSED: <Ban className="w-6 h-6" />,
  SLOW_TRAFFIC: <Car className="w-6 h-6" />,
  RESTRICTED: <CircleSlash className="w-6 h-6" />,
  DIVERSION: <ArrowLeftRight className="w-6 h-6" />,
  OTHER_EFFECT: <HelpCircle className="w-6 h-6" />,
};

// Icons for causes
const CAUSE_ICONS: Record<IncidentCause, React.ReactNode> = {
  ROADWORK: <Construction className="w-5 h-5" />,
  ACCIDENT: <AlertTriangle className="w-5 h-5" />,
  WEATHER: <CloudRain className="w-5 h-5" />,
  RESTRICTION: <TrafficCone className="w-5 h-5" />,
  OTHER_CAUSE: <HelpCircle className="w-5 h-5" />,
};

export interface IncidentData {
  situationId: string;
  type: string;
  effect: IncidentEffect;
  cause: IncidentCause;
  startedAt: string;
  endedAt: string | null;
  roadNumber: string | null;
  kmPoint: number | null;
  direction: string | null;
  province: string | null;
  community: string | null;
  severity: string;
  description: string | null;
  laneInfo: string | null;
  source: string;
  coordinates: [number, number]; // [lng, lat]
}

interface IncidentModalProps {
  incident: IncidentData;
  onClose: () => void;
}

export function IncidentModal({ incident, onClose }: IncidentModalProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const effectColor = EFFECT_COLORS[incident.effect];
  const causeColor = CAUSE_COLORS[incident.cause];

  // Google Maps link
  const [lng, lat] = incident.coordinates;
  const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

  // Format dates
  const startDate = new Date(incident.startedAt);
  const endDate = incident.endedAt ? new Date(incident.endedAt) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with effect color */}
        <div
          className="px-5 py-4 text-white"
          style={{ backgroundColor: effectColor }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                {EFFECT_ICONS[incident.effect]}
              </div>
              <div>
                <h2 className="font-bold text-lg">
                  {EFFECT_LABELS[incident.effect]}
                </h2>
                {incident.roadNumber && (
                  <p className="text-white/90 text-sm flex items-center gap-1">
                    <Route className="w-4 h-4" />
                    {incident.roadNumber}
                    {incident.kmPoint !== null && ` · km ${incident.kmPoint}`}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Cause badge */}
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white"
              style={{ backgroundColor: causeColor }}
            >
              {CAUSE_ICONS[incident.cause]}
              {CAUSE_LABELS[incident.cause]}
            </span>
            <span className="text-sm text-gray-500">
              Severidad: {incident.severity}
            </span>
          </div>

          {/* Description */}
          {incident.description && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-1">
                Descripción
              </h3>
              <p className="text-gray-800">{incident.description}</p>
            </div>
          )}

          {/* Location */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
              Ubicación
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {incident.province && (
                <div>
                  <span className="text-gray-500">Provincia</span>
                  <p className="font-medium">{incident.province}</p>
                </div>
              )}
              {incident.community && (
                <div>
                  <span className="text-gray-500">Comunidad</span>
                  <p className="font-medium">{incident.community}</p>
                </div>
              )}
              {incident.direction && (
                <div>
                  <span className="text-gray-500">Dirección</span>
                  <p className="font-medium">{incident.direction}</p>
                </div>
              )}
              <div>
                <span className="text-gray-500">Coordenadas</span>
                <p className="font-mono text-xs">
                  {lat.toFixed(5)}, {lng.toFixed(5)}
                </p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
              Tiempo
            </h3>
            <div className="flex items-center gap-3 text-sm">
              <Clock className="w-4 h-4 text-gray-400" />
              <div>
                <span className="text-gray-500">Desde: </span>
                <span className="font-medium">
                  {startDate.toLocaleString("es-ES", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {endDate && (
                <div>
                  <span className="text-gray-500">Hasta: </span>
                  <span className="font-medium">
                    {endDate.toLocaleString("es-ES", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Lane info */}
          {incident.laneInfo && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-1">
                Carriles afectados
              </h3>
              <p className="text-gray-800">{incident.laneInfo}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            Fuente: {incident.source} · ID: {incident.situationId.slice(0, 12)}...
          </span>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 hover:underline"
          >
            <MapPin className="w-4 h-4" />
            Ver en Google Maps
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
