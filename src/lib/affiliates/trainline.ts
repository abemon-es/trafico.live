import type { AffiliateProvider, Offer, OfferRequest } from "./types";

// TODO(S4): wire Trainline Partner Programme API (European rail inventory).
export async function fetchTrainOffers(_req: OfferRequest): Promise<Offer[]> {
  return [];
}

export const trainline: AffiliateProvider = {
  meta: {
    id: "trainline",
    label: "Trainline",
    supports: ["train"],
    disclosure:
      "Enlaces de afiliado. Al reservar, trafico.live puede recibir una comisión sin coste adicional para ti.",
  },
  fetchOffers: fetchTrainOffers,
};
