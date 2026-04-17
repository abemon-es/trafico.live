import type { AffiliateProvider, Offer, OfferRequest } from "./types";

// TODO(S4): wire FlixBus affiliate / deep-link API.
export async function fetchBusOffers(_req: OfferRequest): Promise<Offer[]> {
  return [];
}

export const flixbus: AffiliateProvider = {
  meta: {
    id: "flixbus",
    label: "FlixBus",
    supports: ["bus"],
    disclosure:
      "Enlaces de afiliado. Al reservar, trafico.live puede recibir una comisión sin coste adicional para ti.",
  },
  fetchOffers: fetchBusOffers,
};
