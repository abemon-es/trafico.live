import { Metadata } from "next";
import Link from "next/link";
import {
  MapPin,
  ArrowLeft,
  Truck,
  Coffee,
  Fuel,
  Bed,
  ShowerHead,
  Utensils,
  Clock,
  AlertCircle,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Áreas de Descanso - Portal Profesional",
  description:
    "Encuentra áreas de servicio y descanso para transportistas en las principales autopistas y autovías de España.",
  keywords: [
    "áreas de descanso",
    "áreas de servicio",
    "parking camiones",
    "transportistas",
    "autopistas España",
  ],
};

// Sample areas - in production this would come from an API
const FEATURED_AREAS = [
  {
    name: "Área de Servicio La Junquera",
    road: "AP-7",
    km: 1,
    province: "Girona",
    services: ["parking", "fuel", "restaurant", "shower", "rest"],
    schedule: "24h",
  },
  {
    name: "Área de Servicio Monegros",
    road: "A-2",
    km: 340,
    province: "Zaragoza",
    services: ["parking", "fuel", "restaurant", "coffee"],
    schedule: "24h",
  },
  {
    name: "Área de Servicio La Roda",
    road: "A-31",
    km: 167,
    province: "Albacete",
    services: ["parking", "fuel", "restaurant", "shower"],
    schedule: "06:00-00:00",
  },
  {
    name: "Área de Servicio Guadalajara",
    road: "A-2",
    km: 60,
    province: "Guadalajara",
    services: ["parking", "fuel", "restaurant", "coffee"],
    schedule: "24h",
  },
];

const SERVICE_ICONS: Record<string, { icon: React.ElementType; label: string }> = {
  parking: { icon: Truck, label: "Parking camiones" },
  fuel: { icon: Fuel, label: "Combustible" },
  restaurant: { icon: Utensils, label: "Restaurante" },
  coffee: { icon: Coffee, label: "Cafetería" },
  shower: { icon: ShowerHead, label: "Duchas" },
  rest: { icon: Bed, label: "Área descanso" },
};

export default function AreasPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <Link
          href="/profesional"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al portal profesional
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Áreas de descanso
              </h1>
              <p className="text-gray-600">
                Áreas de servicio con parking para vehículos pesados
              </p>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-800">Información en desarrollo</h3>
            <p className="text-sm text-blue-700 mt-1">
              Estamos recopilando información de áreas de servicio con facilidades para transporte profesional.
              De momento mostramos algunos ejemplos de las principales rutas.
            </p>
          </div>
        </div>

        {/* Service Legend */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-8">
          <h2 className="font-medium text-gray-900 mb-3">Servicios disponibles</h2>
          <div className="flex flex-wrap gap-4">
            {Object.entries(SERVICE_ICONS).map(([key, { icon: Icon, label }]) => (
              <div key={key} className="flex items-center gap-2 text-sm text-gray-600">
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Areas Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {FEATURED_AREAS.map((area) => (
            <div
              key={area.name}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-medium text-gray-900">{area.name}</h3>
                  <p className="text-sm text-gray-500">
                    {area.road} km {area.km} · {area.province}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Clock className="w-4 h-4" />
                  {area.schedule}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {area.services.map((service) => {
                  const serviceInfo = SERVICE_ICONS[service];
                  if (!serviceInfo) return null;
                  const Icon = serviceInfo.icon;
                  return (
                    <span
                      key={service}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-600"
                    >
                      <Icon className="w-3 h-3" />
                      {serviceInfo.label}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Tips Section */}
        <div className="bg-gray-100 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Consejos para el descanso
          </h2>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
              Planifica tus paradas obligatorias antes de iniciar el viaje
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
              Busca áreas con servicios 24h para mayor flexibilidad
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
              Verifica la disponibilidad de plazas para vehículos pesados antes de llegar
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
              Recuerda cumplir con los tiempos de conducción y descanso del tacógrafo
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
