/**
 * GA4 custom event helpers.
 * All events are no-ops if gtag is not loaded (SSR, consent denied).
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
