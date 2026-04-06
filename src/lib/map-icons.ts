/**
 * Transport + vessel category icons for MapLibre maps.
 *
 * Vessel icons use canvas-generated PNGs with category-specific shapes
 * and colors baked in. This avoids SDF rendering issues.
 */
import type { Map as MapInstance } from "maplibre-gl";

interface IconDef {
  svg: string;
  size: number;
  sdf?: boolean;
}

// Non-vessel icons (legacy, white stroke, non-SDF)
const STATIC_ICONS: Record<string, IconDef> = {
  "icon-aircraft": {
    size: 24,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>`,
  },
  "icon-vessel": {
    size: 24,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/><path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/><path d="M12 10v-3"/></svg>`,
  },
  "icon-train": {
    size: 24,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3.1V7a4 4 0 0 0 8 0V3.1"/><path d="m9 15-1-1"/><path d="m15 15 1-1"/><path d="M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5Z"/><path d="m8 19-2 3"/><path d="m16 19 2 3"/></svg>`,
  },
  "icon-bus": {
    size: 20,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/></svg>`,
  },
};

// Vessel category definitions: shape path (pointing UP) + fill color + outline
const VESSEL_CATEGORIES: Record<string, { color: string; outline: string; path: string; size: number }> = {
  // Cargo: wide arrow with flat back (container ship)
  cargo:     { color: "#16a34a", outline: "#0d5c2a", size: 28, path: "M14 2L4 20h4v4h12v-4h4z" },
  // Tanker: teardrop/fat hull
  tanker:    { color: "#d97706", outline: "#8b4d04", size: 28, path: "M14 2c-2 4-7 9-7 13 0 5 3 9 7 9s7-4 7-9c0-4-5-9-7-13z" },
  // Fishing: narrow with crossbar
  fishing:   { color: "#0891b2", outline: "#065a73", size: 28, path: "M14 2L10 18h3v6h2v-6h3zM8 10h12" },
  // Passenger: wide ship with bridge
  passenger: { color: "#dc2626", outline: "#8b1616", size: 28, path: "M14 2L6 14v7c0 2 2 4 4 4h8c2 0 4-2 4-4v-7z" },
  // Cruise: large multi-deck
  cruise:    { color: "#9333ea", outline: "#5b1ea0", size: 32, path: "M16 0L6 12v6c0 2 1 4 3 4h14c2 0 3-2 3-4v-6zM10 8h12v3H10z" },
  // Tug: diamond
  tug:       { color: "#64748b", outline: "#3d4759", size: 24, path: "M12 2L5 12l7 10 7-10z" },
  // Pleasure: small triangle
  pleasure:  { color: "#06b6d4", outline: "#047387", size: 22, path: "M11 3L5 19h12z" },
  // Sailing: sail shape
  sailing:   { color: "#14b8a6", outline: "#0d7568", size: 26, path: "M14 1v18h7zM12 5v14H5zM4 21h18" },
  // Military: star/pentagon
  military:  { color: "#1e3a5f", outline: "#0f1f33", size: 26, path: "M13 1l3.5 8h8l-6 5 2.5 8L13 17l-8 5 2.5-8-6-5h8z" },
  // Offshore: hexagon
  offshore:  { color: "#ea580c", outline: "#943608", size: 26, path: "M13 1L5 6v12l8 5 8-5V6z" },
  // Default: simple arrow
  default:   { color: "#94a3b8", outline: "#5a6577", size: 24, path: "M12 2L5 20h5v-4h4v4h5z" },
};

/**
 * Generate a vessel icon as a canvas-rendered image.
 * Returns an HTMLCanvasElement that MapLibre can use directly.
 */
function createVesselIcon(
  category: string,
  pixelRatio: number = 2
): { canvas: HTMLCanvasElement; size: number } {
  const def = VESSEL_CATEGORIES[category] || VESSEL_CATEGORIES.default;
  const size = def.size * pixelRatio;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Scale for pixel ratio
  ctx.scale(pixelRatio, pixelRatio);

  // Draw the shape from SVG path
  const path = new Path2D(def.path);

  // White halo/outline
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  ctx.stroke(path);

  // Color fill
  ctx.fillStyle = def.color;
  ctx.fill(path);

  // Dark outline
  ctx.strokeStyle = def.outline;
  ctx.lineWidth = 1;
  ctx.stroke(path);

  return { canvas, size: def.size };
}

export async function loadTransportIcons(map: MapInstance): Promise<void> {
  // Load static SVG icons (aircraft, train, bus, generic vessel)
  const svgPromises = Object.entries(STATIC_ICONS).map(([id, { svg, size }]) => {
    if (map.hasImage(id)) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const img = new Image(size, size);
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
      img.onload = () => {
        if (!map.hasImage(id)) map.addImage(id, img, { sdf: false });
        resolve();
      };
      img.onerror = () => resolve();
    });
  });

  // Generate vessel category icons via canvas (always works, no SDF issues)
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  for (const [key] of Object.entries(VESSEL_CATEGORIES)) {
    const id = `vessel-${key}`;
    if (map.hasImage(id)) continue;
    try {
      const { canvas } = createVesselIcon(key, ratio);
      const ctx = canvas.getContext("2d")!;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      map.addImage(id, {
        width: canvas.width,
        height: canvas.height,
        data: new Uint8Array(imageData.data.buffer),
      }, { pixelRatio: ratio, sdf: false });
    } catch {
      // Fallback: skip silently
    }
  }

  await Promise.all(svgPromises);
}
