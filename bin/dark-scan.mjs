// dark-scan.mjs — light boxes left in dark mode, page by page.
//
// Run through bin/dark-scan.sh (inside the Playwright image, on compute).
// For each path it opens https://trafico.live<path> in headless Chromium with
// dark mode on (colorScheme dark + localStorage theme=dark, then waits for
// html.dark), and lists every element of at least 16×16 px whose background
// renders light (luminance > 0.85) on a dark parent.
//
// The colour is painted on a 1×1 canvas and read back as a pixel: Tailwind v4
// colours are oklch, and parsing their text gave false positives (2026-10-21).
//
// Prints one line per page and the classes behind its islands. Exit code:
// 0 none found · 1 islands found · 2 a page could not be scanned.

import { chromium } from "playwright-core";

const paths = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  // /dev/shm is 64 MB in a container: without this, heavy pages crash the tab.
  args: [`--host-resolver-rules=MAP trafico.live ${process.env.HOST_IP}`, "--disable-dev-shm-usage"],
});
const ctx = await browser.newContext({ colorScheme: "dark", viewport: { width: 1280, height: 2400 } });
await ctx.addInitScript(() => {
  try {
    localStorage.setItem("theme", "dark");
    localStorage.setItem("cookie-consent", "necessary");
  } catch {}
});

let found = 0;
let failed = 0;
for (const path of paths) {
  const page = await ctx.newPage();
  try {
    await page.goto(`https://trafico.live${path}`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {});
    await page.waitForFunction(() => document.documentElement.classList.contains("dark"), null, { timeout: 8000 }).catch(() => {});
    const r = await page.evaluate(() => {
      const cnv = document.createElement("canvas");
      cnv.width = cnv.height = 1;
      const cv = cnv.getContext("2d", { willReadFrequently: true });
      const pixel = (css) => {
        cv.clearRect(0, 0, 1, 1);
        cv.fillStyle = "rgba(0,0,0,0)";
        cv.fillStyle = css;
        cv.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = cv.getImageData(0, 0, 1, 1).data;
        return { r, g, b, a: a / 255 };
      };
      const lum = (c) => (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;
      const bg = (el) => {
        const s = getComputedStyle(el).backgroundColor;
        if (!s || s === "rgba(0, 0, 0, 0)" || s === "transparent") return null;
        const c = pixel(s);
        return c.a > 0.5 ? c : null;
      };
      const islands = [];
      for (const el of document.querySelectorAll("body [class*='bg-']")) {
        const box = el.getBoundingClientRect();
        if (box.width < 16 || box.height < 16 || box.top > 2400) continue;
        const c = bg(el);
        if (!c || lum(c) < 0.85) continue;
        let p = el.parentElement;
        let pc = null;
        while (p && !(pc = bg(p))) p = p.parentElement;
        if ((pc ? lum(pc) : lum(pixel(getComputedStyle(document.body).backgroundColor))) > 0.4) continue;
        if (el.closest("img,video,canvas,svg,iframe,.maplibregl-map")) continue;
        const cls = typeof el.className === "string" ? el.className : "";
        islands.push({
          cls: cls.split(/\s+/).filter((x) => /bg-|dark:/.test(x)).join(" ").slice(0, 120),
          text: (el.textContent || "").trim().slice(0, 40),
          size: `${Math.round(box.width)}x${Math.round(box.height)}`,
        });
      }
      return { dark: document.documentElement.classList.contains("dark"), islands };
    });
    if (!r.dark) {
      failed++;
      console.log(`${path} NOT DARK (html.dark never set): not scanned`);
    } else {
      found += r.islands.length;
      console.log(`${path} islands=${r.islands.length}`);
      const byClass = new Map();
      for (const i of r.islands) byClass.set(i.cls, (byClass.get(i.cls) || []).concat(i));
      for (const [cls, list] of [...byClass].sort((a, b) => b[1].length - a[1].length).slice(0, 8)) {
        console.log(`   ${list.length}× ${cls}  e.g. «${list[0].text}» ${list[0].size}`);
      }
    }
  } catch (err) {
    failed++;
    console.log(`${path} FAILED: ${String(err).split("\n")[0]}`);
  }
  await page.close().catch(() => {});
}
await browser.close();
process.exit(failed > 0 ? 2 : found > 0 ? 1 : 0);
