/**
 * trafico.live — API Baseline Load Test
 *
 * Stages: 30s warm-up @ 10 VUs → ramp 2min to 50 VUs → steady 5min @ 50 VUs → ramp-down 1min
 *
 * Run:
 *   k6 run tests/load/api-baseline.js -e TARGET=https://trafico.live
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const TARGET = __ENV.TARGET || "https://trafico.live";

export const options = {
  stages: [
    { duration: "30s", target: 10 },   // warm-up
    { duration: "2m",  target: 50 },   // ramp up
    { duration: "5m",  target: 50 },   // steady state
    { duration: "1m",  target: 0 },    // ramp down
  ],
  thresholds: {
    "http_req_duration{route:posiciones}": ["p(95)<500"],
    "http_req_duration{route:maritimo}":   ["p(95)<1500"],
    "http_req_duration{route:health}":     ["p(95)<300"],
    http_req_failed:                        ["rate<0.01"],
  },
};

// ---------------------------------------------------------------------------
// Weighted scenario table
// Route weights (must sum to 100):
//   40% posiciones | 20% maritimo | 15% aviacion | 15% multimodal | 10% health
// ---------------------------------------------------------------------------

const SCENARIOS = [
  { route: "posiciones", path: "/api/trenes/posiciones",                 weight: 40, allowNon200: false },
  { route: "maritimo",   path: "/api/maritimo",                          weight: 20, allowNon200: false },
  { route: "aviacion",   path: "/api/aviacion",                          weight: 15, allowNon200: false },
  { route: "multimodal", path: "/api/multimodal?origin=28&dest=08",      weight: 15, allowNon200: true  },
  { route: "health",     path: "/api/health",                            weight: 10, allowNon200: false },
];

// Pre-compute cumulative weight boundaries for O(1) scenario selection
const CUM_WEIGHTS = SCENARIOS.reduce((acc, s, i) => {
  acc.push((acc[i - 1] || 0) + s.weight);
  return acc;
}, []);

function pickScenario() {
  const r = Math.random() * 100;
  for (let i = 0; i < CUM_WEIGHTS.length; i++) {
    if (r < CUM_WEIGHTS[i]) return SCENARIOS[i];
  }
  return SCENARIOS[SCENARIOS.length - 1];
}

// ---------------------------------------------------------------------------
// Default function
// ---------------------------------------------------------------------------

export default function () {
  const scenario = pickScenario();
  const url = `${TARGET}${scenario.path}`;

  const res = http.get(url, {
    tags: { route: scenario.route },
    headers: { Accept: "application/json" },
    timeout: "10s",
  });

  const expectedStatuses = scenario.allowNon200
    ? [200, 400, 404, 422]
    : [200];

  check(res, {
    [`${scenario.route} status OK`]: (r) => expectedStatuses.includes(r.status),
    [`${scenario.route} has body`]:   (r) => r.body && r.body.length > 0,
  });

  sleep(0.5 + Math.random() * 1); // 0.5–1.5s think time
}
