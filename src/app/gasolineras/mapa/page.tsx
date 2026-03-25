import { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { UnifiedMap } from "@/components/map/UnifiedMap";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Mapa de Gasolineras | Tráfico España",
  description: "Encuentra gasolineras en el mapa interactivo. Consulta precios de combustible y ubicaciones de estaciones terrestres y marítimas.",
  alternates: {
    canonical: `${BASE_URL}/gasolineras/mapa`,
  },
};

export default function GasolinerasMapaPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/gasolineras" className="hover:text-gray-700">Gasolineras</Link>
          <span>/</span>
          <span className="text-gray-900">Mapa</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <MapPin className="w-8 h-8 text-orange-600" />
          Mapa de Gasolineras
        </h1>
        <p className="text-gray-600 mt-1">
          Explora las gasolineras terrestres y marítimas en el mapa interactivo
        </p>
      </div>

      {/* Instructions */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-orange-800 mb-2">Cómo usar el mapa</h3>
        <ul className="text-sm text-orange-700 space-y-1">
          <li>• Haz clic en un marcador para ver los precios y detalles</li>
          <li>• Los marcadores naranjas son estaciones terrestres</li>
          <li>• Los marcadores azules son estaciones marítimas</li>
          <li>• Usa los controles del mapa para activar otras capas</li>
        </ul>
      </div>

      {/* Map */}
      <Suspense fallback={
        <div className="h-[600px] bg-gray-100 rounded-lg flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
        </div>
      }>
        <UnifiedMap
          initialLayers={{
            v16: false,
            incidents: false,
            cameras: false,
            chargers: false,
            zbe: false,
            weather: false,
            highways: false,
            provinces: false,
            radars: false,
            riskZones: false,
            gasStations: true,
            maritimeStations: true,
          }}
          defaultHeight="600px"
          showStats={false}
          id="gasolineras-map"
        />
      </Suspense>

      {/* Quick Links */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/gasolineras/terrestres"
          className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
        >
          <h3 className="font-semibold text-gray-900 mb-1">Listado Terrestres</h3>
          <p className="text-sm text-gray-500">Ver todas las gasolineras terrestres</p>
        </Link>
        <Link
          href="/gasolineras/maritimas"
          className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
        >
          <h3 className="font-semibold text-gray-900 mb-1">Listado Marítimas</h3>
          <p className="text-sm text-gray-500">Ver estaciones en puertos</p>
        </Link>
        <Link
          href="/gasolineras/precios"
          className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
        >
          <h3 className="font-semibold text-gray-900 mb-1">Precios por Provincia</h3>
          <p className="text-sm text-gray-500">Comparativa de precios</p>
        </Link>
      </div>
    </div>
  );
}
