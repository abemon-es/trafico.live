/**
 * Cookie banner — paint timing and returning-visitor behaviour (mobile)
 *
 * The banner used to mount only after hydration. On mobile it is the largest
 * text in the viewport, so it became the LCP element at 5-7 s on almost every
 * page (Lighthouse mobile, 2026-10-18). It is now server-rendered for everyone
 * and hidden before first paint for visitors who already chose.
 *
 * Run against production without a local server:
 *   PLAYWRIGHT_NO_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://trafico.live \
 *     npx playwright test tests/mobile/cookie-consent.spec.ts --project=mobile-iphone-se
 */

import { test, expect } from "@playwright/test";
import { CONSENT_KEY, CONSENT_VERSION } from "../../src/components/cookie-consent/types";

const PAGES = ["/", "/trenes/incidencias", "/gasolineras"];
const BANNER = "#cookie-consent-banner";

test.describe("cookie banner", () => {
  for (const path of PAGES) {
    test(`is in the server HTML of ${path}`, async ({ request }) => {
      const html = await (await request.get(path)).text();
      expect(html).toContain('id="cookie-consent-banner"');
    });
  }

  test("new visitor sees it at once and it stays gone after choosing", async ({ page }) => {
    await page.goto("/trenes/incidencias", { waitUntil: "domcontentloaded" });
    await expect(page.locator(BANNER)).toBeVisible();

    await page.getByRole("button", { name: "Solo necesarias" }).click();
    await expect(page.locator(BANNER)).toHaveCount(0);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator(BANNER)).toBeHidden();
  });

  test("returning visitor never sees it and hydration stays clean", async ({ page }) => {
    const hydrationErrors: string[] = [];
    page.on("console", (msg) => {
      const text = msg.text();
      if (msg.type() === "error" && /hydrat|did not match/i.test(text)) hydrationErrors.push(text);
    });
    await page.addInitScript(
      ([key, version]) => {
        localStorage.setItem(
          key,
          JSON.stringify({ necessary: true, analytics: false, affiliates: false, version, timestamp: new Date().toISOString() })
        );
      },
      [CONSENT_KEY, CONSENT_VERSION] as const
    );

    await page.goto("/trenes/incidencias", { waitUntil: "domcontentloaded" });
    // Hidden from the first frame (pre-paint script + CSS), not after hydration.
    await expect(page.locator(BANNER)).toBeHidden();
    await expect(page.locator("html")).toHaveAttribute("data-consent", "set");

    await page.waitForLoadState("networkidle").catch(() => {});
    await expect(page.locator(BANNER)).toHaveCount(0);
    expect(hydrationErrors).toEqual([]);
  });
});
