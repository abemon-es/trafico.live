/**
 * Load transport icons into a MapLibre map instance.
 * Call once after map.on("load").
 *
 * Icons are Lucide-derived SVGs (Plane, Ship, Train, Bus) with white stroke
 * so they're visible on both light and coloured backgrounds.
 */
import type { Map as MapInstance } from "maplibre-gl";

const ICONS: Record<string, { svg: string; size: number }> = {
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

/**
 * Load all transport icons into the given MapLibre map instance.
 *
 * Safe to call multiple times — skips icons that are already registered.
 * Must be called after map.on("load") fires.
 */
export async function loadTransportIcons(map: MapInstance): Promise<void> {
  const promises = Object.entries(ICONS).map(([id, { svg, size }]) => {
    if (map.hasImage(id)) return Promise.resolve();

    return new Promise<void>((resolve) => {
      const img = new Image(size, size);
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
      img.onload = () => {
        if (!map.hasImage(id)) {
          map.addImage(id, img, { sdf: false });
        }
        resolve();
      };
      img.onerror = () => resolve(); // Skip silently on failure
    });
  });

  await Promise.all(promises);
}
