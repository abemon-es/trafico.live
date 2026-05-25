/**
 * Per-section corridor distances for the route overlay.
 *
 * These thresholds answer "how far from the polyline counts as on the route?"
 * Each section uses its own value because the user's expectation is different
 * for a radar (right next to me, ~500m) vs. an EV charger (where I'd
 * realistically detour, ~5km).
 *
 * Keep this in sync with the per-section title strings — if you change the
 * radar threshold to 1km, also update the section title to "Radares ≤ 1 km".
 */
export const CORRIDOR_DISTANCES_KM = {
  gasStation: 2,
  evCharger: 5,
  serviceArea: 2,
  roadwork: 1.5,
  radar: 0.5,
  camera: 1,
  panel: 1,
  incident: 1,
  hotspot: 1,
  zbe: 3,
  traffic: 2,
} as const;
