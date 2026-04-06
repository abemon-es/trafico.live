import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "Calcular Ruta — trafico.live",
  description:
    "Calcula la mejor ruta en coche por España y Portugal. Distancia, tiempo estimado e indicaciones paso a paso con datos de tráfico en tiempo real.",
  openGraph: {
    title: "Calcular Ruta — trafico.live",
    description: "Planificador de rutas para España y Portugal con tráfico en tiempo real.",
    url: "https://trafico.live/ruta",
  },
};

const RutaContent = dynamic(() => import("./content"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[calc(100dvh-64px)] bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <div className="animate-pulse text-gray-400">Cargando mapa...</div>
    </div>
  ),
});

export default function RutaPage() {
  return <RutaContent />;
}
