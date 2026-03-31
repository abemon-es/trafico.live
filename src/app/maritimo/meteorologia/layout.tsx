import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: {
    template: "%s — Meteorología Marítima | trafico.live",
    default: "Meteorología Marítima — Alertas Costeras AEMET | trafico.live",
  },
  description:
    "Alertas meteorológicas costeras de la AEMET, previsiones por zonas marítimas y condiciones de oleaje en las costas de España.",
  alternates: {
    canonical: `${BASE_URL}/maritimo/meteorologia`,
  },
  openGraph: {
    title: "Meteorología Marítima | trafico.live",
    description:
      "Alertas costeras AEMET, zonas marítimas y condiciones de oleaje en las costas españolas.",
    url: `${BASE_URL}/maritimo/meteorologia`,
    type: "website",
    locale: "es_ES",
  },
};

export default function MeteorologiaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
