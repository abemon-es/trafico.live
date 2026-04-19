/**
 * pulse.ts
 *
 * Installs a requestAnimationFrame loop that pulses circle-radius (and
 * optionally adds a growing/fading halo layer) for high-severity features
 * such as incidents with severity HIGH, emergencies, and weather alerts.
 *
 * Two modes:
 *   1. NO filter  — mutates circle-radius directly on the target sub-layer.
 *   2. WITH filter — adds a sibling halo layer (`${subLayerId}-pulse-halo`)
 *      filtered to matching features only; the base layer is untouched so
 *      all other features keep their normal appearance.
 *
 * Trade-off (halo mode):
 *   The halo layer uses a literal numeric radius rather than replicating the
 *   original zoom-interpolate expression from the base layer. This means the
 *   halo does not scale with zoom the way the base circles do, but it avoids
 *   per-frame expression reconstruction which is both complex and costly.
 */

import type { Map as MaplibreMap } from "maplibre-gl";

const TWO_PI = 2 * Math.PI;

export interface PulseInstallArgs {
  map: MaplibreMap;
  layerId: string;
  /** Circle sub-layer id to animate. Only circle type is valid. */
  subLayerId: string;
  /** Base radius expression or value. Defaults to current circle-radius. */
  baseRadius?: number;
  /** Pulse amplitude in px added on top of base. Default 4. */
  amplitude?: number;
  /** Pulse period in ms. Default 1600. */
  periodMs?: number;
  /**
   * Optional filter: only pulse features matching this MapLibre expression.
   * E.g. ["==", ["get", "severity"], "HIGH"].
   * When provided, the animator ADDS a sibling "halo" layer above the original
   * (id = `${subLayerId}-pulse-halo`) filtered by this expression, with a
   * growing/fading circle. This preserves the base layer's rendering for all
   * other features.
   * When absent, the animator mutates the original sub-layer's circle-radius.
   */
  filter?: unknown[];
  /** Halo color when filter is present. Default: inherit from base layer. */
  haloColor?: string;
}

/**
 * Installs a RAF loop that pulses circle radius (and optionally a halo layer).
 * Returns a cleanup function that stops the loop AND removes any halo layer
 * added by this call.
 */
export function installPulse(args: PulseInstallArgs): () => void {
  const {
    map,
    subLayerId,
    filter,
    haloColor,
    amplitude = 4,
    periodMs = 1600,
  } = args;

  // Respect prefers-reduced-motion: skip animation, apply static base radius.
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // Resolve baseRadius from arg or from the layer's current paint property.
  const baseRadius: number = (() => {
    if (args.baseRadius !== undefined) return args.baseRadius;
    const current = map.getPaintProperty(subLayerId, "circle-radius");
    // Accept a plain number; fall back to 6 when it's an expression.
    return typeof current === "number" ? current : 6;
  })();

  const haloLayerId = `${subLayerId}-pulse-halo`;
  let rafHandle: number | null = null;
  // Saved original paint value for mutation-mode restore on cleanup.
  let originalRadius: unknown = undefined;
  let haloAdded = false;

  // ------------------------------------------------------------------
  // Reduced-motion path: apply static base radius and return a no-op.
  // ------------------------------------------------------------------
  if (prefersReduced) {
    // In filter mode do nothing — the halo just won't be shown.
    // In mutation mode ensure the radius is set to the base.
    if (!filter) {
      map.setPaintProperty(subLayerId, "circle-radius", baseRadius);
    }
    return () => {
      /* no-op: nothing was started */
    };
  }

  // ------------------------------------------------------------------
  // Halo mode: add a sibling layer above the base sub-layer.
  // ------------------------------------------------------------------
  if (filter) {
    // Only add if not already present (guards against double-install).
    if (!map.getLayer(haloLayerId)) {
      // getLayer() returns a runtime StyleLayer (camelCase props), NOT the
      // raw style spec. Pull the spec from map.getStyle().layers for a
      // reliable read of `source` and `source-layer`.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const style = map.getStyle() as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const spec = Array.isArray(style?.layers)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? (style.layers as any[]).find((l) => l?.id === subLayerId)
        : undefined;

      if (spec) {
        const resolvedHaloColor =
          haloColor ??
          (map.getPaintProperty(subLayerId, "circle-color") as string | undefined) ??
          "#dc2626"; // fallback to incident red

        const srcId = spec.source as string | undefined;
        const srcLayer = spec["source-layer"] as string | undefined;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const addSpec: any = {
          id: haloLayerId,
          type: "circle",
          source: srcId ?? "",
          ...(srcLayer ? { "source-layer": srcLayer } : {}),
          filter,
          paint: {
            // Literal radius — see module-level trade-off comment.
            "circle-radius": baseRadius,
            "circle-color": "transparent",
            "circle-stroke-width": 2,
            "circle-opacity": 0,
            "circle-pitch-alignment": "map",
            // Render the halo ring via circle-stroke so the base feature's
            // fill colour shows through the centre.
            "circle-stroke-color": resolvedHaloColor,
            "circle-stroke-opacity": 0.6,
          },
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.addLayer(addSpec as any);
        haloAdded = true;
      }
    } else {
      // Halo already present from a previous call on the same layer.
      haloAdded = false; // don't double-remove on cleanup
    }

    // RAF loop — halo mode.
    const tick = (now: number): void => {
      // Defensive: stop silently if layer was removed externally.
      if (!map.getLayer(haloLayerId)) {
        haloAdded = false;
        return;
      }

      const phase = (now % periodMs) / periodMs; // 0..1
      const sine = Math.sin(phase * TWO_PI); // -1..1
      // Map sine 0→1 to a grow-then-shrink cycle:
      // radius:  baseRadius → baseRadius + amplitude
      // opacity: 0.6        → 0  (fade out as it expands)
      const t = (sine + 1) / 2; // 0..1 (positive half)
      const radius = baseRadius + amplitude * t;
      const opacity = 0.6 * (1 - t);

      map.setPaintProperty(haloLayerId, "circle-stroke-opacity", opacity);
      // Grow the stroke by expanding the circle radius (stroke is outward).
      map.setPaintProperty(haloLayerId, "circle-radius", radius);

      rafHandle = requestAnimationFrame(tick);
    };

    rafHandle = requestAnimationFrame(tick);
  } else {
    // ------------------------------------------------------------------
    // Mutation mode: animate circle-radius on the original sub-layer.
    // ------------------------------------------------------------------

    // Save the current expression/value so we can restore on cleanup.
    originalRadius = map.getPaintProperty(subLayerId, "circle-radius");

    const tick = (now: number): void => {
      // Defensive: stop silently if the layer was removed.
      if (!map.getLayer(subLayerId)) {
        return;
      }

      const phase = (now % periodMs) / periodMs;
      // Use rectified sine so radius only grows from base → base+amplitude
      // (never below base). MapLibre rejects negative circle-radius.
      const t = (Math.sin(phase * TWO_PI) + 1) / 2;
      const radius = Math.max(0.01, baseRadius + amplitude * t);

      map.setPaintProperty(subLayerId, "circle-radius", radius);

      rafHandle = requestAnimationFrame(tick);
    };

    rafHandle = requestAnimationFrame(tick);
  }

  // ------------------------------------------------------------------
  // Cleanup
  // ------------------------------------------------------------------
  return function cleanup(): void {
    if (rafHandle !== null) {
      cancelAnimationFrame(rafHandle);
      rafHandle = null;
    }

    if (filter) {
      // Remove the halo layer only if we were the ones who added it.
      if (haloAdded && map.getLayer(haloLayerId)) {
        map.removeLayer(haloLayerId);
        haloAdded = false;
      }
    } else {
      // Restore the original circle-radius expression (may be an expression
      // object or a plain number). Guard: layer may have been removed already.
      if (map.getLayer(subLayerId)) {
        if (originalRadius !== undefined) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          map.setPaintProperty(subLayerId, "circle-radius", originalRadius as any);
        } else {
          // Nothing was saved (layer had no radius); reset to base.
          map.setPaintProperty(subLayerId, "circle-radius", baseRadius);
        }
      }
    }
  };
}
