/**
 * Smoke tests for /api/route (profile-aware dispatcher).
 *
 * Runs against live OSRM containers. Expects:
 *   OSRM_CAR_URL  (default: http://trafico-osrm-car:5000)
 *   OSRM_BIKE_URL (default: http://trafico-osrm-bike:5000)
 *   OSRM_FOOT_URL (default: http://trafico-osrm-foot:5000)
 *
 * Invoke: npm run test -- routing
 * Skipped automatically if OSRM containers are unreachable.
 */

import { describe, it, expect, beforeAll } from "vitest";
import type { RouteActionResponse } from "@/types/routing";

const API = process.env.ROUTE_API_URL || "http://localhost:3000/api/route";

async function routeCall(body: unknown): Promise<{ status: number; data: RouteActionResponse | { error: string } }> {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

let osrmAvailable = false;

beforeAll(async () => {
  try {
    const res = await fetch(`${API}?profile=car`, { signal: AbortSignal.timeout(3_000) });
    const data = await res.json();
    osrmAvailable = Boolean(data?.healthy);
  } catch {
    osrmAvailable = false;
  }
});

describe("/api/route — profile dispatcher", () => {
  it.skipIf(!osrmAvailable)("car — Madrid → Barcelona ≥580 km, ≥4 h", async () => {
    const { status, data } = await routeCall({
      action: "route",
      profile: "car",
      locations: [
        { lat: 40.4168, lon: -3.7038 }, // Madrid
        { lat: 41.3874, lon: 2.1686 }, // Barcelona
      ],
    });
    expect(status).toBe(200);
    expect("routes" in data).toBe(true);
    const r = (data as RouteActionResponse).routes[0];
    expect(r.distance / 1000).toBeGreaterThan(580);
    expect(r.distance / 1000).toBeLessThan(700);
    expect(r.duration / 3600).toBeGreaterThan(4);
  });

  it.skipIf(!osrmAvailable)("car — Madrid → Bilbao 395±10 km, 4h±15min", async () => {
    const { data } = await routeCall({
      action: "route",
      profile: "car",
      locations: [
        { lat: 40.4168, lon: -3.7038 }, // Madrid
        { lat: 43.263, lon: -2.935 }, // Bilbao
      ],
    });
    const r = (data as RouteActionResponse).routes[0];
    const km = r.distance / 1000;
    const h = r.duration / 3600;
    expect(km).toBeGreaterThan(385);
    expect(km).toBeLessThan(410);
    expect(h).toBeGreaterThan(3.75);
    expect(h).toBeLessThan(4.25);
  });

  it.skipIf(!osrmAvailable)("foot — Plaza Mayor → Retiro ≈1.2 km", async () => {
    const { data } = await routeCall({
      action: "route",
      profile: "foot",
      locations: [
        { lat: 40.4153, lon: -3.7074 }, // Plaza Mayor
        { lat: 40.4153, lon: -3.6844 }, // Retiro (W gate)
      ],
    });
    const r = (data as RouteActionResponse).routes[0];
    expect(r.distance).toBeGreaterThan(800);
    expect(r.distance).toBeLessThan(2500);
  });

  it.skipIf(!osrmAvailable)("bike — La Pedrera → Sagrada Familia ≈1.2 km", async () => {
    const { data } = await routeCall({
      action: "route",
      profile: "bike",
      locations: [
        { lat: 41.3953, lon: 2.1619 }, // Casa Milà
        { lat: 41.4036, lon: 2.1744 }, // Sagrada Familia
      ],
    });
    const r = (data as RouteActionResponse).routes[0];
    expect(r.distance).toBeGreaterThan(900);
    expect(r.distance).toBeLessThan(2500);
  });

  it.skipIf(!osrmAvailable)("rejects missing locations", async () => {
    const { status } = await routeCall({ action: "route", profile: "car", locations: [] });
    expect(status).toBe(400);
  });

  it.skipIf(!osrmAvailable)("rejects truck profile with 501 (Valhalla S3)", async () => {
    const { status } = await routeCall({
      action: "route",
      profile: "truck",
      locations: [{ lat: 40.4, lon: -3.7 }, { lat: 41.4, lon: 2.2 }],
    });
    expect(status).toBe(501);
  });

  it.skipIf(!osrmAvailable)("accepts legacy 'auto' alias → car", async () => {
    const { status, data } = await routeCall({
      action: "route",
      profile: "auto",
      locations: [{ lat: 40.4, lon: -3.7 }, { lat: 40.5, lon: -3.6 }],
    });
    expect(status).toBe(200);
    expect((data as RouteActionResponse).profile).toBe("car");
  });
});
