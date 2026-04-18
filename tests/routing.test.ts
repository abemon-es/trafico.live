/**
 * Smoke tests for /api/route (profile-aware dispatcher).
 *
 * Plain tsx script (project has no test framework). Runs against a live API
 * and exits 1 on any failure.
 *
 * Usage:
 *   npx tsx tests/routing.test.ts
 *   ROUTE_API_URL=https://trafico.live/api/route npx tsx tests/routing.test.ts
 *
 * Skipped silently if the API is unreachable (CI without live OSRM).
 */

import type { RouteActionResponse } from "@/types/routing";

const API = process.env.ROUTE_API_URL || "http://localhost:3000/api/route";

interface TestCase {
  name: string;
  body: Record<string, unknown>;
  expectStatus?: number;
  assert?: (data: RouteActionResponse | { error: string }) => void;
}

const tests: TestCase[] = [
  {
    name: "car — Madrid → Barcelona ≥580 km, ≥4 h",
    body: {
      action: "route",
      profile: "car",
      locations: [
        { lat: 40.4168, lon: -3.7038 },
        { lat: 41.3874, lon: 2.1686 },
      ],
    },
    expectStatus: 200,
    assert: (d) => {
      const r = (d as RouteActionResponse).routes[0];
      const km = r.distance / 1000;
      const h = r.duration / 3600;
      if (km <= 580 || km >= 700) throw new Error(`km=${km.toFixed(0)} out of 580..700`);
      if (h <= 4) throw new Error(`h=${h.toFixed(2)} <= 4`);
    },
  },
  {
    name: "car — Madrid → Bilbao 395±10 km, 4h±15min",
    body: {
      action: "route",
      profile: "car",
      locations: [
        { lat: 40.4168, lon: -3.7038 },
        { lat: 43.263, lon: -2.935 },
      ],
    },
    expectStatus: 200,
    assert: (d) => {
      const r = (d as RouteActionResponse).routes[0];
      const km = r.distance / 1000;
      const h = r.duration / 3600;
      if (km < 385 || km > 410) throw new Error(`km=${km.toFixed(0)} out of 385..410`);
      if (h < 3.75 || h > 4.25) throw new Error(`h=${h.toFixed(2)} out of 3.75..4.25`);
    },
  },
  {
    name: "foot — Plaza Mayor → Retiro 0.8..2.5 km",
    body: {
      action: "route",
      profile: "foot",
      locations: [
        { lat: 40.4153, lon: -3.7074 },
        { lat: 40.4153, lon: -3.6844 },
      ],
    },
    expectStatus: 200,
    assert: (d) => {
      const r = (d as RouteActionResponse).routes[0];
      if (r.distance < 800 || r.distance > 2500) {
        throw new Error(`distance=${r.distance}m out of 800..2500`);
      }
    },
  },
  {
    name: "bike — Pedrera → Sagrada Familia 0.9..2.5 km",
    body: {
      action: "route",
      profile: "bike",
      locations: [
        { lat: 41.3953, lon: 2.1619 },
        { lat: 41.4036, lon: 2.1744 },
      ],
    },
    expectStatus: 200,
    assert: (d) => {
      const r = (d as RouteActionResponse).routes[0];
      if (r.distance < 900 || r.distance > 2500) {
        throw new Error(`distance=${r.distance}m out of 900..2500`);
      }
    },
  },
  {
    name: "rejects missing locations",
    body: { action: "route", profile: "car", locations: [] },
    expectStatus: 400,
  },
  {
    name: "truck → 501 (Valhalla S3)",
    body: {
      action: "route",
      profile: "truck",
      locations: [
        { lat: 40.4, lon: -3.7 },
        { lat: 41.4, lon: 2.2 },
      ],
    },
    expectStatus: 501,
  },
  {
    name: "legacy 'auto' alias → car",
    body: {
      action: "route",
      profile: "auto",
      locations: [
        { lat: 40.4, lon: -3.7 },
        { lat: 40.5, lon: -3.6 },
      ],
    },
    expectStatus: 200,
    assert: (d) => {
      const p = (d as RouteActionResponse).profile;
      if (p !== "car") throw new Error(`profile=${p}, expected 'car'`);
    },
  },
];

async function isReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${API}?profile=car`, { signal: AbortSignal.timeout(3_000) });
    const data = await res.json();
    return Boolean((data as { healthy?: boolean }).healthy);
  } catch {
    return false;
  }
}

async function run(): Promise<void> {
  if (!(await isReachable())) {
    console.log(`[routing] API at ${API} unreachable — skipping smoke tests`);
    return;
  }

  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(t.body),
      });
      const data: unknown = await res.json();

      const expected = t.expectStatus ?? 200;
      if (res.status !== expected) {
        throw new Error(`HTTP ${res.status} (expected ${expected})`);
      }
      if (t.assert) t.assert(data as RouteActionResponse | { error: string });

      console.log(`  ok   ${t.name}`);
      passed++;
    } catch (err) {
      console.log(`  FAIL ${t.name} — ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(`\n[routing] ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch((err: Error) => {
  console.error(err);
  process.exit(2);
});
