/**
 * Valhalla isochrone client.
 *
 * Sends requests to the Valhalla container (trafico-valhalla:8002) and
 * normalises the GeoJSON response into IsochroneResponse.
 *
 * Profile mapping:
 *   "car"   → Valhalla costing "auto"
 *   "truck" → Valhalla costing "truck" (default HGV dimensions)
 */

import type { IsochroneRequest, IsochroneResponse } from "@/types/isochrone";

// ─── Config ──────────────────────────────────────────────────────────────────

const VALHALLA_URL =
  process.env.VALHALLA_URL || "http://trafico-valhalla:8002";

const DEFAULT_TIMEOUT_MS = 30_000;

/** Default truck dimensions per Spanish/EU HGV regulations. */
const TRUCK_DEFAULTS = {
  height: 4.5,   // metres
  length: 12,    // metres
  weight: 32,    // tonnes (gross vehicle weight)
  width: 2.55,   // metres
} as const;

/** Contour colour scale: green → yellow → red. */
const CONTOUR_COLORS: Record<number, string> = {
  15: "#22c55e",
  30: "#eab308",
  60: "#ef4444",
};

const DEFAULT_CONTOUR_COLOR = "#6366f1";

// ─── Valhalla payload builder ─────────────────────────────────────────────────

function buildValhallaPayload(req: IsochroneRequest): Record<string, unknown> {
  const contours = (req.contoursMinutes ?? [15, 30, 60]).map((minutes) => ({
    time: minutes,
    color: (CONTOUR_COLORS[minutes] ?? DEFAULT_CONTOUR_COLOR).replace("#", ""),
  }));

  const costing = req.profile === "truck" ? "truck" : "auto";

  const costingOptions =
    req.profile === "truck"
      ? {
          truck: {
            height: TRUCK_DEFAULTS.height,
            length: TRUCK_DEFAULTS.length,
            weight: TRUCK_DEFAULTS.weight,
            width: TRUCK_DEFAULTS.width,
          },
        }
      : undefined;

  const payload: Record<string, unknown> = {
    locations: [{ lon: req.location.lon, lat: req.location.lat }],
    costing,
    contours,
    polygons: true,
    denoise: req.denoise ?? 0.5,
    generalize: req.generalize ?? 50,
  };

  if (costingOptions) {
    payload.costing_options = costingOptions;
  }

  if (req.dateTime) {
    payload.date_time = { type: 1, value: req.dateTime };
  }

  return payload;
}

// ─── Response normaliser ──────────────────────────────────────────────────────

function normaliseResponse(
  raw: Record<string, unknown>,
  req: IsochroneRequest,
): IsochroneResponse {
  const rawFeatures = (raw.features as GeoJSON.Feature[]) ?? [];

  const features = rawFeatures.map((f) => {
    const props = (f.properties ?? {}) as Record<string, unknown>;
    const contourMinutes =
      typeof props.contour === "number"
        ? props.contour
        : typeof props.time === "number"
          ? props.time
          : 0;

    const colorHex = CONTOUR_COLORS[contourMinutes] ?? DEFAULT_CONTOUR_COLOR;

    return {
      ...f,
      properties: {
        contour: contourMinutes,
        color: colorHex,
        opacity: 0.35,
        fill: colorHex,
      },
    } as GeoJSON.Feature<
      GeoJSON.Polygon | GeoJSON.MultiPolygon,
      { contour: number; color: string; opacity: number; fill: string }
    >;
  });

  return {
    type: "FeatureCollection",
    features,
    engine: "valhalla",
    profile: req.profile,
    generatedAt: new Date().toISOString(),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Query Valhalla for drive-time isochrone polygons.
 *
 * @throws Error if Valhalla is unreachable or returns a non-200 status.
 */
export async function queryValhallaIsochrone(
  req: IsochroneRequest,
): Promise<IsochroneResponse> {
  const payload = buildValhallaPayload(req);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${VALHALLA_URL}/isochrone`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    throw new Error(
      `Valhalla unreachable at ${VALHALLA_URL}: ${(err as Error).message}`,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Valhalla /isochrone returned ${response.status}: ${body}`,
    );
  }

  const raw = (await response.json()) as Record<string, unknown>;
  return normaliseResponse(raw, req);
}
