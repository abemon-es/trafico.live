"use client";

import { Protocol } from "pmtiles";

let initialized = false;

/**
 * Register the PMTiles protocol with MapLibre GL JS.
 * Must be called ONCE before creating any map that uses pmtiles:// URLs.
 * Safe to call multiple times — only registers once.
 */
export function initPMTilesProtocol() {
  if (initialized || typeof window === "undefined") return;
  try {
    const maplibregl = require("maplibre-gl");
    const protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);
    initialized = true;
  } catch {
    // MapLibre not loaded yet — will be initialized later
  }
}

/**
 * Async version — dynamically imports maplibre-gl.
 * Use this in components that lazy-load MapLibre.
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
