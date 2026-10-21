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
// It also checks text against the first opaque background behind it (WCAG
// relative luminance):
// - «dark on dark»: under 3:1 with both colours dark. That is what a card
//   given a dark background without a light text colour turns into. Fails.
// - other text under 3:1 (light grey on white and the like): an accessibility
//   matter in both themes, reported but not failed.
//
// Exit code: 0 none found · 1 light islands or dark-on-dark text · 2 a page
// could not be scanned.

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
  let response = null;
  try {
    response = await page.goto(`https://trafico.live${path}`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {});
    // 20 s: several browsers in parallel on heavy pages hydrate slowly (the
    // theme itself is set before the first paint since #138).
    await page.waitForFunction(() => document.documentElement.classList.contains("dark"), null, { timeout: 20000 }).catch(() => {});
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
      // Text under 3:1 against the first opaque background behind it.
      const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      const rel = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
      const behind = (el) => { let p = el; let c = null; while (p && !(c = bg(p))) p = p.parentElement; return c || pixel(getComputedStyle(document.body).backgroundColor); };
      const lowContrast = [];
      for (const el of document.querySelectorAll("body *")) {
        if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1)) continue;
        if (el.closest("svg,script,style,noscript,.maplibregl-map,[aria-hidden='true']")) continue;
        const box = el.getBoundingClientRect();
        if (box.width === 0 || box.height === 0 || box.top > 2400) continue;
        const st = getComputedStyle(el);
        if (st.visibility === "hidden" || Number(st.opacity) === 0) continue;
        const fg = pixel(st.color);
        if (fg.a < 0.5) continue;
        const b = behind(el);
        const [hi, lo] = [rel(fg), rel(b)].sort((x, y) => y - x);
        const ratio = (hi + 0.05) / (lo + 0.05);
        if (ratio >= 3) continue;
        const cls = typeof el.className === "string" ? el.className : "";
        lowContrast.push({
          cls: cls.split(/\s+/).filter((x) => /text-|dark:/.test(x)).join(" ").slice(0, 120),
          text: el.textContent.trim().slice(0, 40),
          ratio: ratio.toFixed(2),
          darkOnDark: rel(fg) < 0.18 && rel(b) < 0.18,
        });
      }
      return { dark: document.documentElement.classList.contains("dark"), islands, lowContrast };
    });
    if (!r.dark) {
      // Since #138 an inline <head> script sets html.dark before the first
      // paint, so «not dark» means the page or this setup failed: say which.
      failed++;
      const why = await page.evaluate(() => ({
        readyState: document.readyState,
        url: location.href,
        stored: (() => { try { return localStorage.getItem("theme"); } catch { return "storage error"; } })(),
        prePaint: [...document.querySelectorAll("head script:not([src])")].some((s) => s.textContent.includes('localStorage.getItem("theme")')),
        htmlClass: document.documentElement.className.slice(0, 80),
      })).catch((e) => ({ evaluateError: String(e).split("\n")[0] }));
      console.log(`${path} NOT DARK: not scanned — HTTP ${response?.status() ?? "none"} ${JSON.stringify(why)}`);
    } else {
      const darkOnDark = r.lowContrast.filter((i) => i.darkOnDark);
      const other = r.lowContrast.filter((i) => !i.darkOnDark);
      found += r.islands.length + darkOnDark.length;
      console.log(`${path} islands=${r.islands.length} darkOnDark=${darkOnDark.length} lowContrast(info)=${other.length}`);
      const byClass = new Map();
      for (const i of r.islands) byClass.set(i.cls, (byClass.get(i.cls) || []).concat(i));
      for (const [cls, list] of [...byClass].sort((a, b) => b[1].length - a[1].length).slice(0, 8)) {
        console.log(`   island ${list.length}× ${cls}  e.g. «${list[0].text}» ${list[0].size}`);
      }
      for (const [label, items] of [["dark-on-dark", darkOnDark], ["low contrast (info)", other]]) {
        const byText = new Map();
        for (const i of items) byText.set(i.cls, (byText.get(i.cls) || []).concat(i));
        for (const [cls, list] of [...byText].sort((a, b) => b[1].length - a[1].length).slice(0, 6)) {
          console.log(`   ${label} ${list.length}× ${cls || "(no text class)"}  e.g. «${list[0].text}» ${list[0].ratio}:1`);
        }
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
