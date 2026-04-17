import type { AffiliateProvider, Offer, OfferRequest } from "./types";

// TODO(S4): wire Direct Ferries affiliate feed (Baleària, Fred. Olsen, Trasmediterránea).
export async function fetchFerryOffers(_req: OfferRequest): Promise<Offer[]> {
  return [];
}

export const directferries: AffiliateProvider = {
  meta: {
    id: "directferries",
    label: "Direct Ferries",
    supports: ["ferry"],
    disclosure:
      "Enlaces de afiliado. Al reservar, trafico.live puede recibir una comisión sin coste adicional para ti.",
  },
  fetchOffers: fetchFerryOffers,
};
