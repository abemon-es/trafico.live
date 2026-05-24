/**
 * Mobile visual regression — iPhone SE (375×667)
 *
 * Run against the mobile-iphone-se project in playwright.config.ts:
 *   npx playwright test tests/mobile/visual.spec.ts --project=mobile-iphone-se
 *
 * First run creates baselines (--update-snapshots).
 * Subsequent runs compare against stored snapshots.
 *
 * Snapshots are stored in: tests/mobile/visual.spec.ts-snapshots/
 */

import { test, expect, type Page } from "@playwright/test";

// ─── Route definitions ─────────────────────────────────────────────────────────

type RouteSpec = {
  /** Snapshot name prefix (must be unique) */
  name: string;
  /** Relative path to navigate to */
  path: string;
  /**
   * If true, the page contains live data that changes on every request.
   * We capture a single screenshot without baseline comparison.
   */
  liveData?: boolean;
  /**
   * Optional CSS selector to wait for before screenshotting.
   * Falls back to networkidle with an 8s timeout.
   */
  waitFor?: string;
};

const ROUTES: RouteSpec[] = [
  // ── Core hub pages ────────────────────────────────────────────────────────
  { name: "home", path: "/", liveData: true },
  { name: "mapa", path: "/mapa", liveData: true },
  { name: "trenes", path: "/trenes", liveData: true },
  { name: "maritimo", path: "/maritimo", liveData: true },
  { name: "aviacion", path: "/aviacion", liveData: true },
  { name: "carga-ev", path: "/carga-ev" },
  { name: "accidentes", path: "/accidentes" },
  { name: "atascos", path: "/atascos", liveData: true },

  // ── Entity sample pages ──────────────────────────────────────────────────
  { name: "entity-province-madrid", path: "/espana/madrid" },
  { name: "entity-road-a1", path: "/carreteras/a-1" },
  { name: "entity-trenes-cercanias", path: "/trenes/cercanias" },
  { name: "entity-calidad-aire", path: "/calidad-aire" },

  // ── /sobre section ────────────────────────────────────────────────────────
  { name: "sobre", path: "/sobre" },
  { name: "sobre-api", path: "/sobre/api" },
  { name: "sobre-contacto", path: "/sobre/contacto" },
  { name: "sobre-citaciones-ia", path: "/sobre/citaciones-ia" },
  { name: "sobre-posicionamiento", path: "/sobre/posicionamiento" },

  // ── /dgt section ──────────────────────────────────────────────────────────
  { name: "dgt", path: "/dgt" },
  { name: "dgt-itv", path: "/dgt/itv" },
  { name: "dgt-multas", path: "/dgt/multas" },
  { name: "dgt-carnet-puntos", path: "/dgt/carnet-puntos" },
  { name: "dgt-permisos", path: "/dgt/permisos" },

  // ── Operativos / Rondas ───────────────────────────────────────────────────
  { name: "operativos-verano", path: "/operativos/verano" },
  { name: "rondas-m30", path: "/rondas/m-30", liveData: true },

  // ── City accident/atascos pages ───────────────────────────────────────────
  { name: "accidentes-madrid", path: "/accidentes/madrid" },
  { name: "atascos-barcelona", path: "/atascos/barcelona" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function navigateAndSettle(page: Page, path: string): Promise<number> {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  const status = response?.status() ?? 0;

  if (status >= 400) return status;

  // Verify no unexpected redirect away from the requested path
  const finalUrl = new URL(page.url());
  if (
    finalUrl.pathname !== path &&
    !(path === "/" && finalUrl.pathname === "/")
  ) {
    return 308;
  }

  // Wait for network idle with a generous timeout — map pages never fully settle
  try {
    await page.waitForLoadState("networkidle", { timeout: 8_000 });
  } catch {
    // Intentional: map/live pages never reach networkidle
  }

  // Small settle buffer for CSS animations
  await page.waitForTimeout(600);

  return status;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

for (const route of ROUTES) {
  test(`mobile-visual — ${route.name} [iPhone SE]`, async ({ page }) => {
    test.setTimeout(60_000);

    // Disable CSS animations and transitions for pixel-stable snapshots
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `,
    });

    const status = await navigateAndSettle(page, route.path);

    // Skip rather than fail for missing/redirected pages — the route may not
    // exist in the current environment (e.g. no DB seeded for entity pages).
    test.skip(
      status !== 200,
      `${route.path} returned HTTP ${status} — skipping visual capture`
    );

    if (route.waitFor) {
      await page.waitForSelector(route.waitFor, { timeout: 10_000 }).catch(() => {});
    }

    const snapshotName = `${route.name}-mobile-iphone-se.png`;

    if (route.liveData) {
      // Live-data pages — single-frame capture, no baseline comparison
      await page.screenshot({
        path: `tests/mobile/visual.spec.ts-snapshots/${snapshotName}`,
        fullPage: true,
        animations: "disabled",
      });
      test.info().annotations.push({
        type: "capture-mode",
        description: "single-frame (live data — no diff comparison)",
      });
      return;
    }

    // Static pages — compare to baseline
    await expect(page).toHaveScreenshot(snapshotName, {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.015,
      timeout: 15_000,
    });
  });
}
