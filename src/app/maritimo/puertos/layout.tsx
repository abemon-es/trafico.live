import { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: {
    template: "%s — Puertos de España | trafico.live",
    default: "Puertos de España | trafico.live",
  },
  description:
    "Directorio de puertos españoles con estaciones de combustible náutico. Encuentra precios de gasóleo y gasolina en puertos del Mediterráneo, Atlántico, Baleares y ciudades autónomas.",
  alternates: {
    canonical: `${BASE_URL}/maritimo/puertos`,
  },
  openGraph: {
    title: "Puertos de España — Combustible Náutico | trafico.live",
    description:
      "Directorio de puertos españoles con estaciones de combustible náutico. Precios actualizados de gasóleo y gasolina.",
    url: `${BASE_URL}/maritimo/puertos`,
    type: "website",
    locale: "es_ES",
  },
};

export default function PuertosLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
