/**
 * Icon registry for TraficoMap symbol layers.
 *
 * Each icon is a small inline SVG rendered into an HTMLImageElement and
 * registered with MapLibre via `map.addImage`. Layers reference them via
 * `layout: { "icon-image": "<name>" }`.
 *
 * All icons are authored at 48×48 base and consumed via `icon-size` with
 * zoom interpolation in the registry.
 */

import type { Map as MaplibreMap } from "maplibre-gl";

/** Circular chip with an icon — used for static points (stations, stops, POIs). */
function chip(color: string, innerSvg: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
    <circle cx="24" cy="24" r="22" fill="${color}" stroke="#ffffff" stroke-width="3"/>
    ${innerSvg}
  </svg>`;
}

/** Rotatable silhouette — used for moving entities (plane, ship, train). */
function silhouette(color: string, innerSvg: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
    ${innerSvg.replace(/fill="currentColor"/g, `fill="${color}"`).replace(/stroke="currentColor"/g, `stroke="${color}"`)}
  </svg>`;
}

const ICON_SVGS: Record<string, string> = {
  // ── Moving entities (rotate by heading) ─────────────────────────────────
  "icon-plane": silhouette(
    "#0ea5e9",
    `<g stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round">
       <path fill="currentColor" d="M24 4 L26.5 22 L44 28 L44 32 L26.5 28 L25.5 40 L31 43 L31 45 L24 44 L17 45 L17 43 L22.5 40 L21.5 28 L4 32 L4 28 L21.5 22 Z"/>
     </g>`,
  ),
  "icon-ship": silhouette(
    "#0891b2",
    `<g stroke="#ffffff" stroke-width="1.2" stroke-linejoin="round">
       <path fill="currentColor" d="M24 6 L28 18 L40 24 L40 32 L36 42 L12 42 L8 32 L8 24 L20 18 Z"/>
       <path fill="#ffffff" d="M22 24 L26 24 L26 28 L22 28 Z"/>
     </g>`,
  ),
  "icon-train": silhouette(
    "#7c3aed",
    `<g stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round">
       <rect x="10" y="8" width="28" height="30" rx="5" fill="currentColor"/>
       <rect x="14" y="12" width="9" height="10" rx="1.5" fill="#ffffff"/>
       <rect x="25" y="12" width="9" height="10" rx="1.5" fill="#ffffff"/>
       <circle cx="18" cy="32" r="2.5" fill="#ffffff"/>
       <circle cx="30" cy="32" r="2.5" fill="#ffffff"/>
       <path d="M14 42 L10 46 M34 42 L38 46" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
     </g>`,
  ),

  // ── Static entities (circular chips) ────────────────────────────────────
  "icon-train-station": chip(
    "#7c3aed",
    `<g fill="#ffffff" stroke="none">
       <rect x="16" y="14" width="16" height="18" rx="3"/>
       <rect x="19" y="17" width="4" height="5" rx="0.5" fill="#7c3aed"/>
       <rect x="25" y="17" width="4" height="5" rx="0.5" fill="#7c3aed"/>
       <path d="M18 34 L14 38 M30 34 L34 38" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
     </g>`,
  ),
  "icon-bus-stop": chip(
    "#3b82f6",
    `<g fill="#ffffff" stroke="none">
       <rect x="16" y="13" width="16" height="20" rx="3"/>
       <rect x="18" y="16" width="12" height="7" rx="1" fill="#3b82f6"/>
       <circle cx="19" cy="30" r="2" fill="#3b82f6"/>
       <circle cx="29" cy="30" r="2" fill="#3b82f6"/>
       <path d="M17 36 L14 40 M31 36 L34 40" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
     </g>`,
  ),
  "icon-metro": chip(
    "#dc2626",
    `<g fill="#ffffff" font-family="system-ui,sans-serif" font-weight="700">
       <text x="24" y="30" text-anchor="middle" font-size="20">M</text>
     </g>`,
  ),
  "icon-tram": chip(
    "#10b981",
    `<g fill="#ffffff" font-family="system-ui,sans-serif" font-weight="700">
       <text x="24" y="30" text-anchor="middle" font-size="18">T</text>
     </g>`,
  ),
  "icon-ferry-stop": chip(
    "#0891b2",
    `<g fill="#ffffff" stroke="none">
       <path d="M14 28 L34 28 L32 34 L16 34 Z"/>
       <path d="M22 16 L26 16 L26 26 L22 26 Z"/>
       <circle cx="24" cy="14" r="2"/>
     </g>`,
  ),
  "icon-airport": chip(
    "#6366f1",
    `<g fill="#ffffff" stroke="none">
       <path d="M24 12 L26 22 L36 26 L36 28 L26 26 L25 33 L28 35 L28 37 L24 36 L20 37 L20 35 L23 33 L22 26 L12 28 L12 26 L22 22 Z"/>
     </g>`,
  ),
  "icon-port": chip(
    "#0284c7",
    `<g fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
       <circle cx="24" cy="16" r="3" fill="#ffffff"/>
       <path d="M24 19 L24 36"/>
       <path d="M17 28 L31 28"/>
       <path d="M14 32 Q14 36 18 37 M34 32 Q34 36 30 37"/>
     </g>`,
  ),
  "icon-fuel": chip(
    "#d48139",
    `<g fill="#ffffff" stroke="none">
       <rect x="15" y="12" width="12" height="24" rx="1.5"/>
       <rect x="17" y="14" width="8" height="6" rx="0.5" fill="#d48139"/>
       <path d="M28 20 L31 22 L31 31 Q31 34 34 34" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
       <rect x="33" y="22" width="3" height="3" fill="#ffffff"/>
     </g>`,
  ),
  "icon-charger": chip(
    "#34d399",
    `<g fill="#ffffff" stroke="none">
       <rect x="17" y="12" width="14" height="22" rx="2"/>
       <rect x="19" y="14" width="10" height="8" fill="#34d399"/>
       <path d="M24 16 L21 22 L24 22 L23 28 L27 20 L24 20 Z" fill="#34d399"/>
       <rect x="21" y="34" width="6" height="4" rx="0.5"/>
     </g>`,
  ),
  "icon-camera": chip(
    "#1b4bd5",
    `<g fill="#ffffff" stroke="none">
       <rect x="12" y="18" width="20" height="14" rx="2"/>
       <rect x="16" y="14" width="8" height="5" rx="1"/>
       <circle cx="22" cy="25" r="4" fill="#1b4bd5"/>
       <circle cx="22" cy="25" r="2" fill="#ffffff"/>
       <path d="M32 21 L36 18 L36 32 L32 29 Z" fill="#ffffff"/>
     </g>`,
  ),
  "icon-radar": chip(
    "#dc2626",
    `<g fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round">
       <path d="M14 32 A12 12 0 0 1 34 32"/>
       <path d="M18 32 A8 8 0 0 1 30 32"/>
       <path d="M24 32 L24 20" stroke-width="3"/>
       <circle cx="24" cy="32" r="2" fill="#ffffff" stroke="none"/>
     </g>`,
  ),
  "icon-panel": chip(
    "#06b6d4",
    `<g fill="#ffffff" stroke="none">
       <rect x="11" y="15" width="26" height="14" rx="2"/>
       <path d="M24 29 L24 35" stroke="#ffffff" stroke-width="2"/>
       <rect x="19" y="35" width="10" height="3" rx="0.5"/>
       <g fill="#06b6d4" font-family="monospace" font-weight="700" font-size="8">
         <text x="15" y="25">40</text>
       </g>
     </g>`,
  ),
};

/**
 * Register all icons with the map. Idempotent: safe to call multiple times.
 * Must be called AFTER the map's `load` event and BEFORE adding any symbol
 * layer that references these icons.
 */
export async function installIconRegistry(map: MaplibreMap): Promise<void> {
  const names = Object.keys(ICON_SVGS);
  await Promise.all(
    names.map((name) => new Promise<void>((resolve) => {
      if (map.hasImage(name)) return resolve();
      const svg = ICON_SVGS[name];
      const img = new Image(48, 48);
      img.onload = () => {
        try {
          if (!map.hasImage(name)) {
            map.addImage(name, img, { pixelRatio: 2 });
          }
        } catch {
          /* ignore double-add races */
        }
        resolve();
      };
      img.onerror = () => {
        console.warn(`[icons] failed to load ${name}`);
        resolve(); // don't block map readiness
      };
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    })),
  );
}

export const ICON_NAMES = Object.keys(ICON_SVGS);
