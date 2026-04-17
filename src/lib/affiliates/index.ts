/**
 * Affiliate provider registry.
 *
 * Consumers: <Offers provider source /> widget (T2.4) and /ir redirector (T1.9).
 * Look up the provider by id, then call `provider.fetchOffers(req)`.
 */

import type { AffiliateProvider, AffiliateProviderId, TransportMode } from "./types";
import { skyscanner } from "./skyscanner";
import { trainline } from "./trainline";
import { directferries } from "./directferries";
import { flixbus } from "./flixbus";

export const AFFILIATE_PROVIDERS: Record<AffiliateProviderId, AffiliateProvider> = {
  skyscanner,
  trainline,
  directferries,
  flixbus,
};

export function getProvider(id: AffiliateProviderId): AffiliateProvider {
  return AFFILIATE_PROVIDERS[id];
}

export function providersFor(mode: TransportMode): AffiliateProvider[] {
  return Object.values(AFFILIATE_PROVIDERS).filter((p) => p.meta.supports.includes(mode));
}

export type { AffiliateProvider, AffiliateProviderId, Offer, OfferRequest, ProviderMetadata, TransportMode } from "./types";
