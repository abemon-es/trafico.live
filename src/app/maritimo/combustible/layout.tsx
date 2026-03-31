import { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Combustible Marítimo en España — Precios en Puertos Náuticos",
  description:
    "Directorio de estaciones de suministro de combustible náutico en puertos deportivos, pesqueros y comerciales de España. Precios de gasóleo, gasolina y combustible bonificado para embarcaciones, actualizados desde el Ministerio.",
  alternates: {
    canonical: `${BASE_URL}/maritimo/combustible`,
  },
  openGraph: {
    title: "Combustible Marítimo en España — Precios en Puertos Náuticos",
    description:
      "Directorio de estaciones de suministro de combustible náutico en puertos deportivos, pesqueros y comerciales de España. Precios de gasóleo, gasolina y combustible bonificado para embarcaciones.",
    url: `${BASE_URL}/maritimo/combustible`,
    type: "website",
  },
};

export default function CombustibleMaritimoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
