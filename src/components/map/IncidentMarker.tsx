"use client";

import type { IncidentEffect, IncidentCause } from "@/lib/parsers/datex2";

// Effect colors (what's happening to the road)
export const EFFECT_COLORS: Record<IncidentEffect, string> = {
  ROAD_CLOSED: "#dc2626",     // Red - carreteras cortadas
  SLOW_TRAFFIC: "#f97316",    // Orange - tráfico lento
  RESTRICTED: "#eab308",      // Yellow - circulación restringida
  DIVERSION: "#3b82f6",       // Blue - desvíos
  OTHER_EFFECT: "#6b7280",    // Gray - otras afecciones
};

// Cause colors (why it's happening)
export const CAUSE_COLORS: Record<IncidentCause, string> = {
  ROADWORK: "#d97706",        // Amber - obras
  ACCIDENT: "#dc2626",        // Red - accidentes
  WEATHER: "#2563eb",         // Blue - meteorológicos
  RESTRICTION: "#9333ea",     // Purple - restricciones
  OTHER_CAUSE: "#6b7280",     // Gray - otras
};

// SVG path data for effect icons
const EFFECT_ICONS: Record<IncidentEffect, string> = {
  // X mark for road closed
  ROAD_CLOSED: "M6 6L18 18M6 18L18 6",
  // Slow waves for traffic
  SLOW_TRAFFIC: "M4 12h4l2-4 2 8 2-4h6",
  // Minus/restriction
  RESTRICTED: "M6 12h12",
  // Arrow diversion
  DIVERSION: "M9 6l6 6-6 6M15 12H3",
  // Question mark for other
  OTHER_EFFECT: "M12 16v1m0-8a3 3 0 00-3 3h2a1 1 0 112 0c0 .6-.4 1-1 1v2",
};

// SVG path data for cause icons
const CAUSE_ICONS: Record<IncidentCause, string> = {
  // Construction/wrench
  ROADWORK: "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.77 3.77z",
  // Exclamation triangle
  ACCIDENT: "M12 9v4m0 4h.01M4.93 19h14.14c1.36 0 2.21-1.47 1.54-2.67L13.54 4.22c-.68-1.2-2.4-1.2-3.08 0L3.39 16.33c-.67 1.2.18 2.67 1.54 2.67z",
  // Cloud with rain
  WEATHER: "M8 19v2m4-2v2m4-2v2M4 15h16M5 15a5 5 0 015-5h.09A7 7 0 0119 10v0a3 3 0 013 3v0",
  // Shield with slash
  RESTRICTION: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM8 10l8 8",
  // Circle with ?
  OTHER_CAUSE: "M12 16v1m0-8a3 3 0 00-3 3h2a1 1 0 112 0c0 .6-.4 1-1 1v2",
};

// Human-readable labels
export const EFFECT_LABELS: Record<IncidentEffect, string> = {
  ROAD_CLOSED: "Carretera cortada",
  SLOW_TRAFFIC: "Tráfico lento",
  RESTRICTED: "Circulación restringida",
  DIVERSION: "Desvío",
  OTHER_EFFECT: "Otra afección",
};

export const CAUSE_LABELS: Record<IncidentCause, string> = {
  ROADWORK: "Obras",
  ACCIDENT: "Accidente",
  WEATHER: "Meteorológico",
  RESTRICTION: "Restricción",
  OTHER_CAUSE: "Otra causa",
};

interface IncidentMarkerSVGProps {
  effect: IncidentEffect;
  cause: IncidentCause;
  size?: number;
  showCauseBadge?: boolean;
}

/**
 * Returns an SVG string for an incident marker
 * The main shape is based on effect, with optional cause badge
 */
export function getIncidentMarkerSVG({
  effect,
  cause,
  size = 32,
  showCauseBadge = true,
}: IncidentMarkerSVGProps): string {
  const effectColor = EFFECT_COLORS[effect];
  const causeColor = CAUSE_COLORS[cause];
  const iconPath = EFFECT_ICONS[effect];

  // Main marker with effect icon
  // Using a shield/marker shape that's easily recognizable
  const badgeSize = 12;
  const badgeOffset = size - badgeSize + 4;

  return `
    <svg width="${size}" height="${size + 4}" viewBox="0 0 ${size} ${size + 4}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Drop shadow -->
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.3"/>
      </filter>

      <!-- Main marker body (teardrop/pin shape) -->
      <g filter="url(#shadow)">
        <path
          d="M${size/2} ${size - 2}
             C${size/2} ${size - 2} ${size - 2} ${size/2} ${size - 2} ${size/2.5}
             C${size - 2} ${size/6} ${size/2 + size/3} 2 ${size/2} 2
             C${size/2 - size/3} 2 2 ${size/6} 2 ${size/2.5}
             C2 ${size/2} ${size/2} ${size - 2} ${size/2} ${size - 2}Z"
          fill="${effectColor}"
          stroke="white"
          stroke-width="2"
        />

        <!-- Effect icon (centered in marker) -->
        <g transform="translate(${size/4}, ${size/6}) scale(${size/48})">
          <path
            d="${iconPath}"
            stroke="white"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"
          />
        </g>
      </g>

      ${showCauseBadge && cause !== "OTHER_CAUSE" ? `
        <!-- Cause badge (small circle) -->
        <circle
          cx="${badgeOffset}"
          cy="${badgeSize/2 + 2}"
          r="${badgeSize/2}"
          fill="${causeColor}"
          stroke="white"
          stroke-width="1.5"
        />
      ` : ""}
    </svg>
  `.trim();
}

/**
 * Creates a DOM element for use as a MapLibre marker
 */
export function createIncidentMarkerElement(
  effect: IncidentEffect,
  cause: IncidentCause,
  size: number = 32
): HTMLDivElement {
  const el = document.createElement("div");
  el.className = `incident-marker incident-${effect.toLowerCase()} cause-${cause.toLowerCase()}`;
  el.innerHTML = getIncidentMarkerSVG({ effect, cause, size });
  el.style.cursor = "pointer";
  el.style.transition = "transform 0.2s ease";

  // Add hover effect
  el.addEventListener("mouseenter", () => {
    el.style.transform = "scale(1.15)";
  });
  el.addEventListener("mouseleave", () => {
    el.style.transform = "scale(1)";
  });

  return el;
}

/**
 * Simple circular marker for dense views
 */
export function createSimpleMarkerElement(
  effect: IncidentEffect,
  size: number = 16
): HTMLDivElement {
  const el = document.createElement("div");
  el.className = `simple-marker effect-${effect.toLowerCase()}`;
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.borderRadius = "50%";
  el.style.backgroundColor = EFFECT_COLORS[effect];
  el.style.border = "2px solid white";
  el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
  el.style.cursor = "pointer";
  el.style.transition = "transform 0.2s ease";

  el.addEventListener("mouseenter", () => {
    el.style.transform = "scale(1.2)";
  });
  el.addEventListener("mouseleave", () => {
    el.style.transform = "scale(1)";
  });

  return el;
}

/**
 * Generate popup HTML content for an incident
 */
export function getIncidentPopupHTML(incident: {
  effect: IncidentEffect;
  cause: IncidentCause;
  roadNumber?: string;
  kmPoint?: number;
  province?: string;
  description?: string;
  severity?: string;
  laneInfo?: string;
  startedAt?: string;
}): string {
  const effectLabel = EFFECT_LABELS[incident.effect];
  const causeLabel = CAUSE_LABELS[incident.cause];
  const effectColor = EFFECT_COLORS[incident.effect];
  const causeColor = CAUSE_COLORS[incident.cause];

  return `
    <div class="p-3 min-w-[200px] max-w-[280px]">
      <!-- Header with effect -->
      <div class="flex items-center gap-2 mb-2">
        <span
          class="w-3 h-3 rounded-full flex-shrink-0"
          style="background-color: ${effectColor}"
        ></span>
        <span class="font-bold text-sm">${effectLabel}</span>
      </div>

      <!-- Cause badge -->
      <div class="mb-2">
        <span
          class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white"
          style="background-color: ${causeColor}"
        >
          ${causeLabel}
        </span>
      </div>

      <!-- Location info -->
      ${incident.roadNumber ? `
        <p class="text-sm font-medium text-gray-800">
          ${incident.roadNumber}${incident.kmPoint ? ` · km ${incident.kmPoint}` : ""}
        </p>
      ` : ""}

      ${incident.province ? `
        <p class="text-xs text-gray-500">${incident.province}</p>
      ` : ""}

      <!-- Description -->
      ${incident.description ? `
        <p class="text-sm text-gray-700 mt-2 line-clamp-3">${incident.description}</p>
      ` : ""}

      <!-- Additional info -->
      ${incident.laneInfo ? `
        <p class="text-xs text-gray-500 mt-1">Carriles: ${incident.laneInfo}</p>
      ` : ""}

      ${incident.startedAt ? `
        <p class="text-xs text-gray-400 mt-2">
          Desde: ${new Date(incident.startedAt).toLocaleString("es-ES", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
          })}
        </p>
      ` : ""}
    </div>
  `.trim();
}

// React component for use in non-map contexts (legends, etc.)
export function IncidentIcon({
  effect,
  cause,
  size = 24
}: {
  effect: IncidentEffect;
  cause: IncidentCause;
  size?: number;
}) {
  return (
    <div
      dangerouslySetInnerHTML={{
        __html: getIncidentMarkerSVG({ effect, cause, size, showCauseBadge: false })
      }}
    />
  );
}

// Legend component showing all marker types
export function IncidentLegend() {
  const effects: IncidentEffect[] = ["ROAD_CLOSED", "SLOW_TRAFFIC", "RESTRICTED", "DIVERSION", "OTHER_EFFECT"];
  const causes: IncidentCause[] = ["ROADWORK", "ACCIDENT", "WEATHER", "RESTRICTION", "OTHER_CAUSE"];

  return (
    <div className="bg-white rounded-lg shadow-md p-4 text-sm">
      <h4 className="font-semibold text-gray-800 mb-3">Leyenda</h4>

      <div className="space-y-3">
        <div>
          <h5 className="text-xs font-medium text-gray-500 uppercase mb-2">Afecciones</h5>
          <div className="space-y-1">
            {effects.map((effect) => (
              <div key={effect} className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: EFFECT_COLORS[effect] }}
                />
                <span className="text-gray-700">{EFFECT_LABELS[effect]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-3">
          <h5 className="text-xs font-medium text-gray-500 uppercase mb-2">Causas</h5>
          <div className="space-y-1">
            {causes.map((cause) => (
              <div key={cause} className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded flex-shrink-0"
                  style={{ backgroundColor: CAUSE_COLORS[cause] }}
                />
                <span className="text-gray-700">{CAUSE_LABELS[cause]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
