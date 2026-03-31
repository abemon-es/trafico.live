import { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Marítimo — Combustible, Meteorología y Puertos | trafico.live",
  description:
    "Portal marítimo de trafico.live: precios de combustible en estaciones náuticas, meteorología costera, directorio de puertos españoles y seguridad marítima. Datos actualizados del MITERD y AEMET.",
  alternates: {
    canonical: `${BASE_URL}/maritimo`,
  },
  openGraph: {
    title: "Marítimo — Combustible, Meteorología y Puertos | trafico.live",
    description:
      "Portal marítimo de trafico.live: precios de combustible en estaciones náuticas, meteorología costera, directorio de puertos españoles y seguridad marítima.",
    url: `${BASE_URL}/maritimo`,
    type: "website",
    locale: "es_ES",
  },
};

export default function MaritimoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
