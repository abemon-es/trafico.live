import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Barcos en Directo — Tracker AIS de Buques en España | trafico.live",
  description:
    "Rastrea buques en tiempo real en costas españolas: mercantes, petroleros, pasajeros, pesqueros. Datos AIS en directo de aisstream.io.",
  alternates: {
    canonical: `${BASE_URL}/barcos`,
  },
  openGraph: {
    title: "Barcos en Directo — Tracker AIS España",
    description:
      "Tracker de buques AIS en tiempo real: categorías, bandera, rumbo y destino. Costas españolas.",
    url: `${BASE_URL}/barcos`,
    type: "website",
    locale: "es_ES",
  },
};

export default function BarcosLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
