/**
 * One structured stdout line (read in Loki) for the two lead pages and their
 * form routes, so visits and submissions can be counted without depending on
 * the visitor's cookie consent (GA4 only sees visitors who accept analytics).
 *
 * No personal data: no IP, no user agent, nothing from the form. The referrer
 * is reduced to the path for internal links and to the host for external ones.
 *
 * Pure and Edge-safe: the middleware imports it.
 */

export type LeadForm = "api_access" | "contacto";

/** How a POST to /api/contact or /api/contacto/general ended. */
export type ContactOutcome =
  | "ok"
  | "rate_limited"
  | "bad_json"
  | "honeypot"
  | "validation"
  | "turnstile"
  | "misconfigured"
  | "email_failed"
  | "forward_failed"
  | "no_channel";

export function contactPostLine(form: LeadForm, outcome: ContactOutcome): string {
  return JSON.stringify({ evt: "contact_post", form, outcome });
}

export function logContactPost(form: LeadForm, outcome: ContactOutcome): void {
  console.log(contactPostLine(form, outcome));
}

/** The pages that hold the two forms. */
export const LEAD_PAGES: readonly string[] = ["/api-landing", "/sobre/contacto"];

const BOT_UA =
  /bot\b|bot\/|crawl|spider|slurp|bingpreview|facebookexternalhit|headless|lighthouse|python-requests|python-urllib|curl\/|wget\/|go-http-client|java\/|okhttp|httpclient|scrapy|axios\//i;

export function isBotUserAgent(userAgent: string): boolean {
  if (!userAgent) return true; // real browsers always send one
  return BOT_UA.test(userAgent);
}

/** Internal referrer → its path; external → "ext:<host>"; none/invalid → null. */
export function refererSource(referer: string | null, siteHost: string): string | null {
  if (!referer) return null;
  try {
    const url = new URL(referer);
    const host = url.hostname.replace(/^www\./, "");
    if (host === siteHost) return url.pathname;
    return `ext:${host}`;
  } catch {
    return null;
  }
}

interface ViewRequest {
  method: string;
  pathname: string;
  /** Lower-case header lookup, as NextRequest.headers.get. */
  header: (name: string) => string | null;
  siteHost?: string;
}

/**
 * The log line for a real view of a lead page, or null. Next's link
 * prefetches are not views (the footer links /api-landing from every page),
 * so they are skipped. A client-side navigation arrives as an RSC request
 * («nav: client»); a full page load as a plain GET («nav: document»).
 */
export function leadPageViewLine(req: ViewRequest): string | null {
  if (req.method !== "GET") return null;
  if (!LEAD_PAGES.includes(req.pathname)) return null;
  const purpose = `${req.header("purpose") ?? ""} ${req.header("sec-purpose") ?? ""}`.toLowerCase();
  if (req.header("next-router-prefetch") !== null || purpose.includes("prefetch")) return null;

  return JSON.stringify({
    evt: "lead_page_view",
    path: req.pathname,
    nav: req.header("rsc") === "1" ? "client" : "document",
    is_bot: isBotUserAgent(req.header("user-agent") ?? ""),
    from: refererSource(req.header("referer"), req.siteHost ?? "trafico.live"),
  });
}
