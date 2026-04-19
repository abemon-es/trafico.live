/**
 * flow.ts
 *
 * Installs a RAF-driven "flowing dash" animation on line sub-layers by
 * cycling the `line-dasharray` paint property each frame.
 *
 * WHY NOT `line-dash-offset`?
 *   MapLibre GL JS does not expose a `line-dash-offset` paint property the
 *   way Mapbox GL does.  Instead we simulate a scrolling dash by splitting
 *   one dash+gap cycle into a three-segment pattern that shifts on every
 *   frame:
 *
 *     [trailing, gap, leading, gap]
 *
 *   where  leading  = offset within [0, dash)
 *          trailing = dash - leading
 *
 *   As `leading` grows from 0 → dash the visual start of the white dash
 *   marches forward along the line, giving the impression of flow.
 *   The values are clamped to 0.001 so MapLibre never receives a zero-length
 *   segment (which can produce artefacts).
 *
 * PERFORMANCE (>6 sub-layers):
 *   `setPaintProperty` triggers style re-compilation internally and is not
 *   free at 60 fps.  When more than 6 sub-layer ids are provided we halve the
 *   effective frame rate to 30 fps by skipping every other RAF tick.
 */

import type { Map as MaplibreMap } from "maplibre-gl";

export interface FlowInstallArgs {
  map: MaplibreMap;
  layerId: string;
  /** Sub-layer ids whose paint property `line-dasharray` will be animated */
  subLayerIds: string[];
  /** Pixels/second along the line. Default 40. */
  speed?: number;
  /** Dash+gap pattern (unit multiples). Default [4, 2]. */
  dashPattern?: [number, number];
}

const DEFAULT_SPEED = 40;
const DEFAULT_DASH_PATTERN: [number, number] = [4, 2];
const PERF_SUBLAYER_THRESHOLD = 6; // drop to 30 fps above this

/**
 * Installs a RAF loop that animates line-dasharray on the given sub-layers.
 * Returns a cleanup function that stops the loop.
 *
 * Skips layers that are not type "line" (caller should not pass them, but
 * defend by checking `map.getLayer(id)?.type`).
 */
export function installFlow(args: FlowInstallArgs): () => void {
  const {
    map,
    subLayerIds,
    speed = DEFAULT_SPEED,
    dashPattern = DEFAULT_DASH_PATTERN,
  } = args;

  const [dash, gap] = dashPattern;
  const totalLen = dash + gap;

  // ── prefers-reduced-motion ───────────────────────────────────────────────
  // Respect the OS-level accessibility setting. Apply a static dash pattern
  // once so the layer still looks styled, then bail out.
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reducedMotion) {
    for (const subLayerId of subLayerIds) {
      if (map.getLayer(subLayerId)?.type !== "line") continue;
      map.setPaintProperty(subLayerId, "line-dasharray", [dash, gap]);
    }
    // Return a no-op cleanup — nothing to cancel.
    return () => {};
  }

  // ── performance mode flag ────────────────────────────────────────────────
  const throttle30fps = subLayerIds.length > PERF_SUBLAYER_THRESHOLD;

  // ── RAF state ────────────────────────────────────────────────────────────
  let rafId: number | null = null;
  let startTime: number | null = null;
  let frameCount = 0; // used only when throttle30fps is true
  let lastDashKey = "";

  function tick(timestamp: number): void {
    if (startTime === null) startTime = timestamp;

    // 30-fps throttle: skip every other frame when sublayer count is high.
    if (throttle30fps) {
      frameCount++;
      if (frameCount % 2 !== 0) {
        rafId = requestAnimationFrame(tick);
        return;
      }
    }

    const elapsedSec = (timestamp - startTime) / 1000;
    const traveled = (elapsedSec * speed) % totalLen;

    // CRITICAL: MapLibre caches every unique line-dasharray in LineAtlas,
    // which overflows after ~200 distinct patterns and crashes rendering
    // (setConstantDashPositions → null.y). We quantize `leading` to 0.5-unit
    // steps so the full animation cycles through ≤ 2×dash unique patterns.
    const QUANT = 0.5;
    const leadingRaw = traveled % dash;
    const leading = Math.round(leadingRaw / QUANT) * QUANT;
    const trailing = Math.max(0.001, dash - leading);
    const leadingClamped = Math.max(0.001, leading);

    const newDash = [trailing, gap, leadingClamped, gap];

    // Skip the DOM update if the pattern hasn't changed since the last tick.
    // Dramatically reduces setPaintProperty calls on quantized frames.
    const dashKey = `${trailing}-${leadingClamped}`;
    if (dashKey === lastDashKey) {
      rafId = requestAnimationFrame(tick);
      return;
    }
    lastDashKey = dashKey;

    let activeLayers = 0;

    for (const subLayerId of subLayerIds) {
      if (map.getLayer(subLayerId) === undefined) continue;
      if (map.getLayer(subLayerId)?.type !== "line") continue;

      activeLayers++;
      map.setPaintProperty(subLayerId, "line-dasharray", newDash);
    }

    // If all sub-layers have disappeared, stop the loop to save CPU.
    if (activeLayers === 0) {
      rafId = null;
      return;
    }

    rafId = requestAnimationFrame(tick);
  }

  // Kick off the loop.
  rafId = requestAnimationFrame(tick);

  // ── Cleanup ──────────────────────────────────────────────────────────────
  return function cleanup(): void {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    // No other mutable state to reset; dasharray on the GL layers is
    // cosmetic and will be overwritten when the layer is re-styled or removed.
  };
}
