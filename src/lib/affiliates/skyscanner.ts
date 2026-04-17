import type { AffiliateProvider, Offer, OfferRequest } from "./types";

// TODO(S4): wire Skyscanner Partner API — see docs/ROADMAP-ROUTING-AFFILIATE.md.
export async function fetchFlightOffers(_req: OfferRequest): Promise<Offer[]> {
  return [];
}

export const skyscanner: AffiliateProvider = {
  meta: {
    id: "skyscanner",
    label: "Skyscanner",
    supports: ["flight"],
    disclosure:
      "Enlaces de afiliado. Al reservar, trafico.live puede recibir una comisión sin coste adicional para ti.",
  },
  fetchOffers: fetchFlightOffers,
};
