import { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Gasolineras Terrestres en España — Precios y Localización",
  description:
    "Busca y filtra gasolineras terrestres en toda España. Precios de Gasóleo A, Gasolina 95, GLP y más actualizados desde el Ministerio. Filtra por provincia, horario 24h o tipo de combustible.",
  alternates: {
    canonical: `${BASE_URL}/gasolineras/terrestres`,
  },
  openGraph: {
    title: "Gasolineras Terrestres en España — Precios y Localización",
    description:
      "Busca y filtra gasolineras terrestres en toda España. Precios de Gasóleo A, Gasolina 95, GLP y más actualizados desde el Ministerio.",
    url: `${BASE_URL}/gasolineras/terrestres`,
    type: "website",
  },
};

export default function TerrestresLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
