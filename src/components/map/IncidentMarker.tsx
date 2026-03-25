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

// SVG path data for effect icons (Lucide-style, 24x24 viewBox)
const EFFECT_ICONS: Record<IncidentEffect, string> = {
  // Ban/No entry - circle with diagonal line
  ROAD_CLOSED: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM4.93 4.93l14.14 14.14",
  // Gauge/speedometer for slow traffic
  SLOW_TRAFFIC: "m12 14 4-4M3.34 19a10 10 0 1 1 17.32 0",
  // Alert triangle for restricted
  RESTRICTED: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3zM12 9v4M12 17h.01",
  // Arrow turning for diversion
  DIVERSION: "M6 9h6V4l7 7-7 7v-5H6V9z",
  // Circle with question mark
  OTHER_EFFECT: "M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zM9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01",
};

// SVG path data for cause icons (Lucide-style, 24x24 viewBox)
const CAUSE_ICONS: Record<IncidentCause, string> = {
  // Construction cone
  ROADWORK: "M7.5 4h9L21 22H3L7.5 4zM9 4V2h6v2M12 12v5",
  // Car crash
  ACCIDENT: "M7 17m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0M17 17m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0M5 17H3v-4l3-5h12l3 5v4h-2M5 8V6h4l4-3 4 3h4v2",
  // Cloud with rain
  WEATHER: "M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242M16 14v6M8 14v6M12 16v6",
  // Shield
  RESTRICTION: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  // Circle with question mark
  OTHER_CAUSE: "M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zM9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01",
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

  // Explicit dimensions to match SVG - critical for MapLibre anchor calculation
  el.style.width = `${size}px`;
  el.style.height = `${size + 4}px`;
  el.style.display = "flex";
  el.style.alignItems = "flex-end";
  el.style.justifyContent = "center";
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
        <p class="text-sm font-medium text-gray-800 dark:text-gray-200">
          ${incident.roadNumber}${incident.kmPoint ? ` · km ${incident.kmPoint}` : ""}
        </p>
      ` : ""}

      ${incident.province ? `
        <p class="text-xs text-gray-500 dark:text-gray-400">${incident.province}</p>
      ` : ""}

      <!-- Description -->
      ${incident.description ? `
        <p class="text-sm text-gray-700 dark:text-gray-300 mt-2 line-clamp-3">${incident.description}</p>
      ` : ""}

      <!-- Additional info -->
      ${incident.laneInfo ? `
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Carriles: ${incident.laneInfo}</p>
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
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-4 text-sm">
      <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Leyenda</h4>

      <div className="space-y-3">
        <div>
          <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">Afecciones</h5>
          <div className="space-y-1">
            {effects.map((effect) => (
              <div key={effect} className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: EFFECT_COLORS[effect] }}
                />
                <span className="text-gray-700 dark:text-gray-300">{EFFECT_LABELS[effect]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-3">
          <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">Causas</h5>
          <div className="space-y-1">
            {causes.map((cause) => (
              <div key={cause} className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded flex-shrink-0"
                  style={{ backgroundColor: CAUSE_COLORS[cause] }}
                />
                <span className="text-gray-700 dark:text-gray-300">{CAUSE_LABELS[cause]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
