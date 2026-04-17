/**
 * GET /api/calculadora
 * POST /api/calculadora
 *
 * Combines OSRM routing + toll matching + live CNMC fuel prices into a
 * 3-alternative cost breakdown for the route calculator.
 *
 * Query params (GET) / body fields (POST):
 *   originLat, originLon     — numeric coordinates OR
 *   originName               — place name (resolved via autocomplete)
 *   destLat, destLon         — numeric coordinates OR
 *   destName                 — place name (resolved via autocomplete)
 *   fuelType                 — "diesel" | "gasolina95" | "gasolina98" (default: gasolina95)
 *   consumption              — L/100km (default: fuel-type default)
 *   provinceOrigin           — INE 2-digit code for live fuel price lookup
 *   pasajeros                — number of passengers (default: 1)
 *
 * Response: { alternatives: CalculadoraAlternative[], fuelPrice: FuelPriceResult | null }
 */

import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/api-utils";
import { reportApiError } from "@/lib/api-error";
import { matchTollsFromRoute, totalToll } from "@/lib/tolls";
import { getFuelPrice, fuelCost } from "@/lib/fuel-cost";
import type { RoutingRoute, RouteActionResponse } from "@/types/routing";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FUEL_DEFAULTS: Record<
  "diesel" | "gasolina95" | "gasolina98",
  { consumption: number; co2Factor: number; fallbackPrice: number }
> = {
  diesel: { consumption: 6.5, co2Factor: 2.65, fallbackPrice: 1.35 },
  gasolina95: { consumption: 7.5, co2Factor: 2.35, fallbackPrice: 1.55 },
  gasolina98: { consumption: 7.2, co2Factor: 2.31, fallbackPrice: 1.70 },
};

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CalculadoraTollSummary {
  tollRoadId: string;
  name: string;
  operator: string;
  priceLigeros: number;
}

export interface CalculadoraAlternative {
  label: "fastest" | "no_tolls" | "economy";
  distanceKm: number;
  durationMin: number;
  fuelCost: number;
  tollCost: number;
  totalCost: number;
  perPerson: number;
  co2Kg: number;
  eurPerKm: number;
  tollRoads: CalculadoraTollSummary[];
  routeSummary: string;
}

export interface CalculadoraResponse {
  alternatives: CalculadoraAlternative[];
  fuelPrice: {
    price: number;
    source: string;
    provinceCode: string;
  } | null;
  routeInfo: {
    originLabel: string;
    destLabel: string;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildAlternative(
  label: CalculadoraAlternative["label"],
  route: RoutingRoute,
  fuelPricePerUnit: number,
  consumption: number,
  co2Factor: number,
  pasajeros: number
): CalculadoraAlternative {
  const distanceKm = route.distance / 1000;
  const durationMin = Math.round(route.duration / 60);
  const tollMatches = matchTollsFromRoute(route);
  const { ligeros: tollTotal } = totalToll(tollMatches);
  const fuel = fuelCost(distanceKm, consumption, fuelPricePerUnit);
  const total = fuel + tollTotal;

  return {
    label,
    distanceKm: Math.round(distanceKm * 10) / 10,
    durationMin,
    fuelCost: Math.round(fuel * 100) / 100,
    tollCost: Math.round(tollTotal * 100) / 100,
    totalCost: Math.round(total * 100) / 100,
    perPerson: Math.round((total / Math.max(1, pasajeros)) * 100) / 100,
    co2Kg: Math.round((distanceKm / 100) * consumption * co2Factor * 10) / 10,
    eurPerKm: distanceKm > 0 ? Math.round((total / distanceKm) * 1000) / 1000 : 0,
    tollRoads: tollMatches.map((m) => ({
      tollRoadId: m.tollRoadId,
      name: m.name,
      operator: m.operator,
      priceLigeros: m.priceLigeros,
    })),
    routeSummary: route.legs.map((l) => l.summary).filter(Boolean).join(" — "),
  };
}

async function fetchRoute(
  originLat: number,
  originLon: number,
  destLat: number,
  destLon: number,
  avoidTolls = false
): Promise<RouteActionResponse | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/route`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "route",
        profile: "car",
        locations: [
          { lat: originLat, lon: originLon },
          { lat: destLat, lon: destLon },
        ],
        alternatives: !avoidTolls, // alternatives only on main call
        avoidTolls,
        steps: true,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.code !== "Ok") return null;
    return data as RouteActionResponse;
  } catch {
    return null;
  }
}

/** Resolve a place name to lat/lon via the autocomplete endpoint */
async function resolvePlaceName(
  name: string
): Promise<{ lat: number; lon: number; label: string } | null> {
  try {
    const res = await fetch(
      `${BASE_URL}/api/calculadora/autocomplete?q=${encodeURIComponent(name)}&limit=1`,
      { signal: AbortSignal.timeout(5_000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const first = data?.results?.[0];
    if (!first || first.lat == null || first.lon == null) return null;
    return { lat: first.lat, lon: first.lon, label: first.label };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

async function handle(request: NextRequest): Promise<NextResponse> {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  // Parse params from GET query string or POST body
  let params: Record<string, string>;
  if (request.method === "POST") {
    try {
      params = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
  } else {
    const sp = request.nextUrl.searchParams;
    params = Object.fromEntries(sp.entries());
  }

  // Resolve origin
  let originLat = parseFloat(params.originLat ?? params.origin_lat ?? "");
  let originLon = parseFloat(params.originLon ?? params.origin_lon ?? "");
  let originLabel = params.originName ?? params.origin ?? "";

  if ((isNaN(originLat) || isNaN(originLon)) && originLabel) {
    const resolved = await resolvePlaceName(originLabel);
    if (!resolved) {
      return NextResponse.json(
        { error: "No se pudo resolver el origen. Usa coordenadas o un nombre más específico." },
        { status: 422 }
      );
    }
    originLat = resolved.lat;
    originLon = resolved.lon;
    originLabel = resolved.label;
  }

  // Resolve destination
  let destLat = parseFloat(params.destLat ?? params.dest_lat ?? "");
  let destLon = parseFloat(params.destLon ?? params.dest_lon ?? "");
  let destLabel = params.destName ?? params.destination ?? "";

  if ((isNaN(destLat) || isNaN(destLon)) && destLabel) {
    const resolved = await resolvePlaceName(destLabel);
    if (!resolved) {
      return NextResponse.json(
        { error: "No se pudo resolver el destino. Usa coordenadas o un nombre más específico." },
        { status: 422 }
      );
    }
    destLat = resolved.lat;
    destLon = resolved.lon;
    destLabel = resolved.label;
  }

  if (isNaN(originLat) || isNaN(originLon) || isNaN(destLat) || isNaN(destLon)) {
    return NextResponse.json(
      { error: "Se requieren coordenadas de origen y destino." },
      { status: 400 }
    );
  }

  const fuelType = (params.fuelType ?? "gasolina95") as keyof typeof FUEL_DEFAULTS;
  const defaults = FUEL_DEFAULTS[fuelType] ?? FUEL_DEFAULTS.gasolina95;
  const consumption = parseFloat(params.consumption ?? "") || defaults.consumption;
  const pasajeros = Math.max(1, parseInt(params.pasajeros ?? "1", 10));
  const provinceOrigin = params.provinceOrigin ?? undefined;

  // Fetch fuel price
  const fuelPriceResult = await getFuelPrice({
    fuelType: fuelType === "diesel" ? "diesel" : fuelType,
    provinceCode: provinceOrigin,
  });
  const pricePerUnit = fuelPriceResult?.price ?? defaults.fallbackPrice;

  // Fetch routes with alternatives
  const [mainRouteData, noTollRouteData] = await Promise.all([
    fetchRoute(originLat, originLon, destLat, destLon, false),
    fetchRoute(originLat, originLon, destLat, destLon, true),
  ]);

  if (!mainRouteData || !mainRouteData.routes.length) {
    return NextResponse.json(
      { error: "No se encontró una ruta entre origen y destino." },
      { status: 404 }
    );
  }

  const routes = mainRouteData.routes;

  // Build scored alternatives
  const scored = routes.map((route) =>
    buildAlternative("fastest", route, pricePerUnit, consumption, defaults.co2Factor, pasajeros)
  );

  // fastest = first route (OSRM returns by duration)
  const fastest = { ...scored[0], label: "fastest" as const };

  // no_tolls = lowest toll cost among alternatives; fall back to OSRM no-toll route
  let noTolls: CalculadoraAlternative;
  const lowestTollAlt = scored.slice().sort((a, b) => a.tollCost - b.tollCost)[0];

  if (noTollRouteData?.routes.length) {
    const noTollBuilt = buildAlternative(
      "no_tolls",
      noTollRouteData.routes[0],
      pricePerUnit,
      consumption,
      defaults.co2Factor,
      pasajeros
    );
    // Pick whichever has lower tolls
    noTolls =
      noTollBuilt.tollCost <= lowestTollAlt.tollCost
        ? { ...noTollBuilt, label: "no_tolls" }
        : { ...lowestTollAlt, label: "no_tolls" };
  } else {
    noTolls = { ...lowestTollAlt, label: "no_tolls" };
  }

  // economy = best €/km among alternatives
  const economy = {
    ...scored.slice().sort((a, b) => a.eurPerKm - b.eurPerKm)[0],
    label: "economy" as const,
  };

  const alternatives: CalculadoraAlternative[] = [fastest, noTolls, economy];

  const response: CalculadoraResponse = {
    alternatives,
    fuelPrice: fuelPriceResult
      ? {
          price: fuelPriceResult.price,
          source: fuelPriceResult.source,
          provinceCode: fuelPriceResult.provinceCode,
        }
      : null,
    routeInfo: {
      originLabel,
      destLabel,
    },
  };

  return NextResponse.json(response, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(request: NextRequest) {
  try {
    return await handle(request);
  } catch (error) {
    reportApiError(error, "calculadora");
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    return await handle(request);
  } catch (error) {
    reportApiError(error, "calculadora");
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
