import { Suspense } from "react";
import type { Metadata } from "next";
import { Loader2 } from "lucide-react";
import { AlertasMeteoContent } from "./content";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Alertas Meteorológicas para Carreteras — AEMET | trafico.live",
  description:
    "Consulta en tiempo real los avisos meteorológicos de la AEMET que afectan a las carreteras españolas. Lluvia, nieve, viento, tormentas y más — actualizado cada 5 minutos.",
  keywords: [
    "alertas meteorológicas",
    "avisos AEMET",
    "tiempo carreteras",
    "alertas lluvia carretera",
    "nieve carretera España",
    "aviso meteorológico DGT",
  ],
  alternates: {
    canonical: `${BASE_URL}/alertas-meteo`,
  },
  openGraph: {
    title: "Alertas Meteorológicas para Carreteras — AEMET | trafico.live",
    description:
      "Avisos AEMET en tiempo real para carreteras: lluvia, nieve, viento y tormentas.",
    url: `${BASE_URL}/alertas-meteo`,
    type: "website",
  },
};

function AlertasMeteoLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex items-center gap-3 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>Cargando alertas meteorológicas...</span>
      </div>
    </div>
  );
}

export default function AlertasMeteoPage() {
  return (
    <Suspense fallback={<AlertasMeteoLoading />}>
      <AlertasMeteoContent />
    </Suspense>
  );
}
