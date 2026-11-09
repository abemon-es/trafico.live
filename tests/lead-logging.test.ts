/**
 * Lead-page and form-route log lines (src/lib/lead-logging.ts) and the hub
 * API invitation copy (src/lib/api-hub-cta.ts):
 *   - contact_post carries only form + outcome (no personal data);
 *   - lead_page_view: only GET of /api-landing and /sobre/contacto, Next
 *     prefetches skipped, client vs document navigation, bot flag, referrer
 *     reduced to an internal path or an external host, never an IP;
 *   - hub copy follows the CMO template and names no «gratis» and no 60 s.
 *
 * node:test run by tsx (project has no test framework); exits 1 on failure.
 *   npm run test:contact-leads
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LEAD_PAGES,
  contactPostLine,
  isBotUserAgent,
  leadPageViewLine,
  refererSource,
} from "../src/lib/lead-logging";
import { API_HUB_DATASETS, apiHubSentence, type ApiHub } from "../src/lib/api-hub-cta";

const CHROME =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

function req(over: { method?: string; pathname?: string; headers?: Record<string, string> } = {}) {
  const headers: Record<string, string> = { "user-agent": CHROME, ...(over.headers ?? {}) };
  return {
    method: over.method ?? "GET",
    pathname: over.pathname ?? "/api-landing",
    header: (name: string) => headers[name] ?? null,
    siteHost: "trafico.live",
  };
}

test("contact_post line has only evt, form and outcome", () => {
  const parsed = JSON.parse(contactPostLine("api_access", "forward_failed"));
  assert.deepEqual(parsed, { evt: "contact_post", form: "api_access", outcome: "forward_failed" });
});

test("only GET of the two lead pages is logged", () => {
  assert.deepEqual([...LEAD_PAGES], ["/api-landing", "/sobre/contacto"]);
  assert.notEqual(leadPageViewLine(req({ pathname: "/sobre/contacto" })), null);
  assert.equal(leadPageViewLine(req({ pathname: "/trenes" })), null);
  assert.equal(leadPageViewLine(req({ pathname: "/api-landing/x" })), null);
  assert.equal(leadPageViewLine(req({ method: "HEAD" })), null);
  assert.equal(leadPageViewLine(req({ method: "POST" })), null);
});

test("Next prefetches are not views", () => {
  assert.equal(leadPageViewLine(req({ headers: { rsc: "1", "next-router-prefetch": "1" } })), null);
  assert.equal(leadPageViewLine(req({ headers: { purpose: "prefetch" } })), null);
  assert.equal(leadPageViewLine(req({ headers: { "sec-purpose": "prefetch;prerender" } })), null);
});

test("document vs client navigation, bot flag, no IP or user agent in the line", () => {
  const doc = JSON.parse(leadPageViewLine(req({ headers: { "x-forwarded-for": "203.0.113.9" } }))!);
  assert.deepEqual(doc, { evt: "lead_page_view", path: "/api-landing", nav: "document", is_bot: false, from: null });
  const client = JSON.parse(leadPageViewLine(req({ headers: { rsc: "1", referer: "https://trafico.live/trenes?x=1" } }))!);
  assert.equal(client.nav, "client");
  assert.equal(client.from, "/trenes");
  const raw = leadPageViewLine(req({ headers: { "x-forwarded-for": "203.0.113.9" } }))!;
  assert.ok(!raw.includes("203.0.113.9") && !raw.includes("Chrome"));
});

test("bot detection", () => {
  assert.equal(isBotUserAgent(CHROME), false);
  assert.equal(isBotUserAgent("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"), true);
  assert.equal(isBotUserAgent("Mozilla/5.0 (compatible; bingbot/2.0)"), true);
  assert.equal(isBotUserAgent("curl/8.5.0"), true);
  assert.equal(isBotUserAgent("python-requests/2.32"), true);
  assert.equal(isBotUserAgent(""), true);
});

test("referrer: internal path, external host, www stripped, junk → null", () => {
  assert.equal(refererSource("https://trafico.live/mapa#z", "trafico.live"), "/mapa");
  assert.equal(refererSource("https://www.trafico.live/carreteras", "trafico.live"), "/carreteras");
  assert.equal(refererSource("https://www.google.com/search?q=x", "trafico.live"), "ext:google.com");
  assert.equal(refererSource("not a url", "trafico.live"), null);
  assert.equal(refererSource(null, "trafico.live"), null);
});

test("hub copy follows the template, says «hay plan gratuito», never «gratis» or 60 s", () => {
  const hubs = Object.keys(API_HUB_DATASETS) as ApiHub[];
  assert.deepEqual(hubs.sort(), ["carreteras", "mapa", "maritimo", "trenes"]);
  for (const hub of hubs) {
    const s = apiHubSentence(hub);
    assert.ok(s.startsWith("¿Usas estos datos en tu empresa? "), hub);
    assert.ok(s.endsWith(", por API. Hay plan gratuito sin tarjeta."), hub);
    assert.ok(!/\bgratis\b/i.test(s), hub);
    assert.ok(!/60\s*s(eg)?/i.test(s), hub);
  }
  assert.match(API_HUB_DATASETS.carreteras, /cada 2 minutos/);
  assert.ok(!/c[aá]maras/i.test(API_HUB_DATASETS.mapa), "cameras are not in the public API docs");
});
