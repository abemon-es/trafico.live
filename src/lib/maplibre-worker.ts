import type * as MaplibreGl from "maplibre-gl";

/**
 * MapLibre 6 looks for its worker next to its own module file. Once webpack
 * bundles the library that file is not there, so the worker gets a 404 and
 * the map never paints its data. We serve the worker ourselves:
 * `bin/copy-maplibre-worker.mjs` copies it into public/vendor on every build
 * (`prebuild`/`predev`), and every map points MapLibre at it before
 * creating a Map. Same origin, so the CSP `worker-src 'self'` covers it.
 */
export const MAPLIBRE_WORKER_PATH = "/vendor/maplibre-gl-worker.mjs";

export function configureMaplibreWorker(maplibregl: typeof MaplibreGl): void {
  const url = `${MAPLIBRE_WORKER_PATH}?v=${maplibregl.getVersion()}`;
  if (maplibregl.getWorkerUrl() !== url) maplibregl.setWorkerUrl(url);
}
