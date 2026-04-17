/**
 * HS6 contract — affiliate provider interfaces (T2.4 ↔ T1.9).
 *
 * The <Offers> widget and /ir redirector consume this surface.
 * Each provider module exports a `fetchXOffers()` returning `Offer[]` and
 * a metadata object describing identity + disclosure.
 */

export type TransportMode = "flight" | "train" | "ferry" | "bus";

export type AffiliateProviderId =
  | "skyscanner"
  | "trainline"
  | "directferries"
  | "flixbus";

/** Source descriptor — what the user intends to book (route + date). */
export interface OfferRequest {
  type: TransportMode;
  /** Origin IATA (flights), IBNR/UIC (trains), port code (ferries), or stop code (bus). */
  from: string;
  /** Destination in the same coding scheme as `from`. */
  to: string;
  /** ISO date YYYY-MM-DD for outbound. Optional for "best price any day". */
  date?: string;
  /** ISO date for return trip. */
  returnDate?: string;
  /** 1..9 passengers. Defaults to 1. */
  passengers?: number;
  /** ISO 4217 currency (e.g. "EUR"). Defaults to EUR. */
  currency?: string;
  /** Locale hint for affiliate links (e.g. "es-ES"). */
  locale?: string;
}

/** A single bookable option surfaced to the user. */
export interface Offer {
  /** Stable identifier within the provider. */
  id: string;
  provider: AffiliateProviderId;
  /** Marketing carrier / operator name ("Iberia", "Renfe", "Baleària"). */
  operator: string;
  price: {
    amount: number;
    currency: string;
  };
  duration?: {
    /** Minutes. */
    minutes: number;
  };
  /** Number of stops / connections. 0 = direct. */
  stops?: number;
  /** ISO 8601 departure/arrival timestamps when known. */
  departAt?: string;
  arriveAt?: string;
  /** Deep-link URL (tagged with affiliate id). Use through /ir redirector. */
  deeplink: string;
  /** Optional image/logo for the card. */
  logoUrl?: string;
}

export interface ProviderMetadata {
  id: AffiliateProviderId;
  label: string;
  supports: TransportMode[];
  /** Copy shown beside the widget for GDPR / affiliate disclosure. */
  disclosure: string;
}

export interface AffiliateProvider {
  meta: ProviderMetadata;
  /**
   * Fetch offers for the given request. Implementations MUST:
   *  - never throw; return `[]` on failure and log server-side
   *  - respect cache headers / rate limits of the upstream
   *  - tag deeplinks with the configured affiliate id
   */
  fetchOffers(req: OfferRequest): Promise<Offer[]>;
}
