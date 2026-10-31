"use client";

import { Protocol } from "pmtiles";

let initialized = false;

/**
 * Register the PMTiles protocol with MapLibre GL JS, importing it on demand
 * (maplibre-gl 6 is ESM-only, so there is no synchronous require()).
 * Await it ONCE before creating a map that uses pmtiles:// URLs.
 * Safe to call multiple times — only registers once.
 */
export async function initPMTilesProtocolAsync() {
  if (initialized || typeof window === "undefined") return;
  try {
    const maplibregl = await import("maplibre-gl");
    const protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);
    initialized = true;
  } catch {
    // Will retry on next call
  }
}
