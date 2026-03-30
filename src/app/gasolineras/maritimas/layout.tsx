import { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Gasolineras Marítimas en España — Precios de Combustible Naval",
  description:
    "Directorio de gasolineras marítimas y estaciones de servicio náutico en España. Precios de gasóleo, gasolina y otros combustibles para embarcaciones, actualizados desde el Ministerio.",
  alternates: {
    canonical: `${BASE_URL}/gasolineras/maritimas`,
  },
  openGraph: {
    title: "Gasolineras Marítimas en España — Precios de Combustible Naval",
    description:
      "Directorio de gasolineras marítimas y estaciones de servicio náutico en España. Precios de gasóleo, gasolina y otros combustibles para embarcaciones.",
    url: `${BASE_URL}/gasolineras/maritimas`,
    type: "website",
  },
};

export default function MaritimasLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
