/**
 * GA4 custom event helpers.
 *
 * All events are no-ops if gtag is not loaded (SSR, consent denied, ad blocker).
 *
 * Audit reference: `docs/seo-audit-2026-04-17/10-gsc-ga4.md` §3.5 — the pre-launch
 * funnel only emitted 8 generic events (page_view, session_start, user_engagement,
 * click, form_start, form_submit, search). The 8 custom events below close the
 * post-launch attribution gap. Register `pricing_click`, `api_docs_click`,
 * `newsletter_signup`, `affiliate_click` as conversions in GA4 Admin → Events.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function send(event: string, params: Record<string, unknown>) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", event, params);
  }
}

/** User executed a search query */
export function trackSearch(query: string, resultCount: number, category?: string) {
  send("search", {
    search_term: query,
    result_count: resultCount,
    ...(category && { search_category: category }),
  });
}

/** User created a fuel price alert */
export function trackPriceAlert(fuelType: string, province?: string) {
  send("price_alert_created", {
    fuel_type: fuelType,
    ...(province && { province }),
  });
}

/** User interacted with the map (zoom, pan, click marker) */
export function trackMapInteraction(action: string, detail?: string) {
  send("map_interaction", {
    map_action: action,
    ...(detail && { map_detail: detail }),
  });
}

/** User applied a filter */
export function trackFilter(filterType: string, filterValue: string) {
  send("filter_applied", {
    filter_type: filterType,
    filter_value: filterValue,
  });
}

/** User clicked an outbound link */
export function trackOutbound(url: string, label?: string) {
  send("click", {
    event_category: "outbound",
    event_label: label || url,
    transport_type: "beacon",
  });
}

/** User viewed a specific entity detail page */
export function trackEntityView(entityType: string, entityId: string) {
  send("view_item", {
    item_category: entityType,
    item_id: entityId,
  });
}

// ─── S0+ Conversion funnel ───────────────────────────────────────────────

/**
 * User clicked a PRO/ENTERPRISE pricing CTA. Primary upgrade-intent signal.
 * Fire from: `/api-landing` tier cards, dashboard upgrade banners, footer CTAs.
 */
export function trackPricingClick(tier: "PRO" | "ENTERPRISE", source: string) {
  send("pricing_click", {
    tier,
    source,
  });
}

/**
 * User opened API documentation. Developer-acquisition signal.
 * Fire from: landing hero link, header dev nav, inline deep-link.
 */
export function trackApiDocsClick(source: string, endpoint?: string) {
  send("api_docs_click", {
    source,
    ...(endpoint && { endpoint }),
  });
}

/**
 * User subscribed to the newsletter. Distribution loop seed.
 * Fire from: footer signup, lead-magnet forms under `/recursos/*`, blog CTAs.
 */
export function trackNewsletterSignup(source: string, leadMagnet?: string) {
  send("newsletter_signup", {
    source,
    ...(leadMagnet && { lead_magnet: leadMagnet }),
  });
}

/**
 * User clicked into a vertical hub (trenes, maritimo, aviacion, etc.).
 * Fire from: header nav links, home grid tiles, cross-vertical CTAs.
 */
export function trackVerticalClick(vertical: string, source: string) {
  send("vertical_click", {
    vertical,
    source,
  });
}

/**
 * User clicked a primary CTA button (generic).
 * Fire from: any prominent button with `data-cta-id` attribute.
 */
export function trackCtaClick(ctaId: string, ctaText: string, source: string) {
  send("cta_click", {
    cta_id: ctaId,
    cta_text: ctaText,
    source,
  });
}

/**
 * User clicked an affiliate link. Revenue-attribution signal.
 * Emits `value` + `currency=EUR` when `priceEur` is known so GA4 can compute
 * monetary conversions. Fire from `/go/[partner]/[slug]` before the 302.
 */
export function trackAffiliateClick(params: {
  partner: string;
  route?: string;
  product?: string;
  priceEur?: number;
  source: string;
}) {
  send("affiliate_click", {
    partner: params.partner,
    ...(params.route && { route: params.route }),
    ...(params.product && { product: params.product }),
    ...(params.priceEur !== undefined && {
      value: params.priceEur,
      currency: "EUR",
    }),
    source: params.source,
  });
}

/**
 * User submitted the search form (distinct from `trackSearch`, which logs on result render).
 * Fire from: header Cmd+K submit, mobile search form submit.
 */
export function trackSearchSubmit(query: string, source: string) {
  send("search_submit", {
    search_term: query,
    source,
  });
}

/**
 * A map/widget embed rendered on an external site (referrer ≠ trafico.live).
 * Fire once per session on embed pages.
 */
export function trackEmbedView(embedType: string, origin?: string) {
  send("embed_view", {
    embed_type: embedType,
    ...(origin && { embed_origin: origin }),
  });
}
