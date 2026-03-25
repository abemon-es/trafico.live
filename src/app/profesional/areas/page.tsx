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
  Wifi,
  Package,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Áreas de Servicio para Transportistas en España | Portal Profesional - trafico.live",
  description:
    "Directorio completo de áreas de servicio y descanso para camioneros en las principales autopistas y autovías de España: AP-7, A-1, A-2, A-4, A-6, A-7, AP-9 y más.",
  keywords: [
    "áreas de descanso camioneros España",
    "áreas de servicio autopistas",
    "parking camiones España",
    "descanso transportistas AP-7",
    "áreas servicio A-1 A-2 A-4",
  ],
};

interface RestArea {
  name: string;
  road: string;
  km: number;
  province: string;
  services: string[];
  schedule: string;
  truckParking?: number;
  notes?: string;
}

const AREAS_BY_ROUTE: { route: string; label: string; areas: RestArea[] }[] = [
  {
    route: "AP-7",
    label: "AP-7 Autopista del Mediterráneo",
    areas: [
      {
        name: "Área de Servicio La Junquera",
        road: "AP-7",
        km: 1,
        province: "Girona",
        services: ["parking", "fuel", "restaurant", "shower", "rest", "wifi"],
        schedule: "24h",
        truckParking: 80,
        notes: "Primera área tras la frontera francesa. Peso máx. permitido 44t.",
      },
      {
        name: "Área de Servicio Girona Nord",
        road: "AP-7",
        km: 42,
        province: "Girona",
        services: ["parking", "fuel", "restaurant", "coffee", "shower"],
        schedule: "24h",
        truckParking: 60,
      },
      {
        name: "Área de Servicio El Papiol",
        road: "AP-7",
        km: 169,
        province: "Barcelona",
        services: ["parking", "fuel", "restaurant", "coffee", "shower", "rest"],
        schedule: "24h",
        truckParking: 120,
        notes: "Nudo con AP-2. Gran capacidad para vehículos pesados.",
      },
      {
        name: "Área de Servicio L'Aldea-Amposta",
        road: "AP-7",
        km: 296,
        province: "Tarragona",
        services: ["parking", "fuel", "restaurant", "coffee", "shower"],
        schedule: "24h",
        truckParking: 50,
      },
      {
        name: "Área de Servicio Vinaròs",
        road: "AP-7",
        km: 366,
        province: "Castellón",
        services: ["parking", "fuel", "restaurant", "shower", "rest"],
        schedule: "24h",
        truckParking: 70,
      },
      {
        name: "Área de Servicio La Pobla de Vallbona",
        road: "AP-7",
        km: 447,
        province: "Valencia",
        services: ["parking", "fuel", "restaurant", "coffee", "shower"],
        schedule: "24h",
        truckParking: 90,
      },
    ],
  },
  {
    route: "A-1",
    label: "A-1 Autovía del Norte",
    areas: [
      {
        name: "Área de Servicio Madridejos",
        road: "A-1",
        km: 45,
        province: "Madrid",
        services: ["parking", "fuel", "restaurant", "coffee"],
        schedule: "24h",
        truckParking: 40,
      },
      {
        name: "Área de Servicio Somosierra",
        road: "A-1",
        km: 91,
        province: "Madrid",
        services: ["parking", "fuel", "coffee", "shower"],
        schedule: "06:00-23:00",
        truckParking: 30,
        notes: "Puerto de Somosierra. Precaución en invierno por nieve y hielo.",
      },
      {
        name: "Área de Servicio Aranda de Duero",
        road: "A-1",
        km: 151,
        province: "Burgos",
        services: ["parking", "fuel", "restaurant", "shower", "rest", "wifi"],
        schedule: "24h",
        truckParking: 80,
      },
      {
        name: "Área de Servicio Burgos Norte",
        road: "A-1",
        km: 237,
        province: "Burgos",
        services: ["parking", "fuel", "restaurant", "coffee", "shower"],
        schedule: "24h",
        truckParking: 60,
      },
    ],
  },
  {
    route: "A-2",
    label: "A-2 Autovía del Nordeste",
    areas: [
      {
        name: "Área de Servicio Guadalajara",
        road: "A-2",
        km: 60,
        province: "Guadalajara",
        services: ["parking", "fuel", "restaurant", "coffee"],
        schedule: "24h",
        truckParking: 50,
      },
      {
        name: "Área de Servicio Monegros",
        road: "A-2",
        km: 340,
        province: "Zaragoza",
        services: ["parking", "fuel", "restaurant", "coffee", "shower"],
        schedule: "24h",
        truckParking: 100,
        notes: "Una de las mayores áreas de la ruta Madrid-Barcelona. Talleres cercanos.",
      },
      {
        name: "Área de Servicio Fraga",
        road: "A-2",
        km: 426,
        province: "Huesca",
        services: ["parking", "fuel", "restaurant", "shower"],
        schedule: "06:00-23:00",
        truckParking: 45,
      },
      {
        name: "Área de Servicio Les Borges Blanques",
        road: "A-2",
        km: 483,
        province: "Lleida",
        services: ["parking", "fuel", "coffee", "shower"],
        schedule: "24h",
        truckParking: 35,
      },
    ],
  },
  {
    route: "A-4",
    label: "A-4 Autovía del Sur",
    areas: [
      {
        name: "Área de Servicio La Roda",
        road: "A-31",
        km: 167,
        province: "Albacete",
        services: ["parking", "fuel", "restaurant", "shower"],
        schedule: "06:00-00:00",
        truckParking: 55,
        notes: "Enlace estratégico con A-31 hacia Alicante.",
      },
      {
        name: "Área de Servicio Bailén",
        road: "A-4",
        km: 296,
        province: "Jaén",
        services: ["parking", "fuel", "restaurant", "coffee", "shower", "rest"],
        schedule: "24h",
        truckParking: 90,
        notes: "Nudo A-4 / A-44. Punto de parada clave para rutas sur.",
      },
      {
        name: "Área de Servicio Andújar",
        road: "A-4",
        km: 321,
        province: "Jaén",
        services: ["parking", "fuel", "restaurant", "coffee"],
        schedule: "24h",
        truckParking: 40,
      },
      {
        name: "Área de Servicio Córdoba Norte",
        road: "A-4",
        km: 389,
        province: "Córdoba",
        services: ["parking", "fuel", "restaurant", "shower", "wifi"],
        schedule: "24h",
        truckParking: 70,
      },
    ],
  },
  {
    route: "A-6",
    label: "A-6 Autovía del Noroeste",
    areas: [
      {
        name: "Área de Servicio Villacastín",
        road: "A-6",
        km: 81,
        province: "Segovia",
        services: ["parking", "fuel", "restaurant", "coffee", "shower"],
        schedule: "24h",
        truckParking: 50,
        notes: "Acceso a puerto de Guadarrama. Revisión de frenos recomendada antes del descenso.",
      },
      {
        name: "Área de Servicio Adanero",
        road: "A-6",
        km: 96,
        province: "Ávila",
        services: ["parking", "fuel", "coffee"],
        schedule: "07:00-22:00",
        truckParking: 25,
      },
      {
        name: "Área de Servicio Valladolid Norte",
        road: "A-6",
        km: 185,
        province: "Valladolid",
        services: ["parking", "fuel", "restaurant", "shower", "rest"],
        schedule: "24h",
        truckParking: 65,
      },
    ],
  },
  {
    route: "AP-9",
    label: "AP-9 Autopista del Atlántico",
    areas: [
      {
        name: "Área de Servicio Pontevedra",
        road: "AP-9",
        km: 104,
        province: "Pontevedra",
        services: ["parking", "fuel", "restaurant", "coffee", "shower"],
        schedule: "24h",
        truckParking: 45,
      },
      {
        name: "Área de Servicio A Escravitude",
        road: "AP-9",
        km: 86,
        province: "A Coruña",
        services: ["parking", "fuel", "restaurant", "coffee"],
        schedule: "24h",
        truckParking: 40,
        notes: "Próxima al aeropuerto de Santiago. Zona de alta circulación.",
      },
    ],
  },
];

const SERVICE_ICONS: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  parking: { icon: Truck, label: "Parking camiones", color: "text-blue-600" },
  fuel: { icon: Fuel, label: "Combustible", color: "text-amber-600" },
  restaurant: { icon: Utensils, label: "Restaurante", color: "text-green-600" },
  coffee: { icon: Coffee, label: "Cafetería", color: "text-orange-600" },
  shower: { icon: ShowerHead, label: "Duchas", color: "text-cyan-600" },
  rest: { icon: Bed, label: "Área descanso", color: "text-purple-600" },
  wifi: { icon: Wifi, label: "WiFi", color: "text-gray-600" },
  logistics: { icon: Package, label: "Logística", color: "text-red-600" },
};

const ROUTE_COLORS: Record<string, string> = {
  "AP-7": "bg-blue-100 text-blue-700 border-blue-200",
  "A-1": "bg-green-100 text-green-700 border-green-200",
  "A-2": "bg-amber-100 text-amber-700 border-amber-200",
  "A-4": "bg-red-100 text-red-700 border-red-200",
  "A-31": "bg-orange-100 text-orange-700 border-orange-200",
  "A-6": "bg-purple-100 text-purple-700 border-purple-200",
  "AP-9": "bg-teal-100 text-teal-700 border-teal-200",
};

function getRouteColor(road: string) {
  return ROUTE_COLORS[road] || "bg-gray-100 text-gray-700 border-gray-200";
}

export default function AreasPage() {
  const totalAreas = AREAS_BY_ROUTE.reduce((sum, g) => sum + g.areas.length, 0);

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
                Áreas de servicio para transportistas
              </h1>
              <p className="text-gray-600">
                {totalAreas} áreas en las principales autopistas y autovías de España
              </p>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{totalAreas}</p>
            <p className="text-xs text-gray-500 mt-1">Áreas registradas</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{AREAS_BY_ROUTE.length}</p>
            <p className="text-xs text-gray-500 mt-1">Rutas cubiertas</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {AREAS_BY_ROUTE.reduce(
                (sum, g) => sum + g.areas.filter((a) => a.schedule === "24h").length,
                0
              )}
            </p>
            <p className="text-xs text-gray-500 mt-1">Abiertas 24h</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {AREAS_BY_ROUTE.reduce(
                (sum, g) =>
                  sum +
                  g.areas.reduce((s, a) => s + (a.truckParking || 0), 0),
                0
              )}
            </p>
            <p className="text-xs text-gray-500 mt-1">Plazas camión aprox.</p>
          </div>
        </div>

        {/* Service Legend */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-8">
          <h2 className="font-medium text-gray-900 mb-3 text-sm">Leyenda de servicios</h2>
          <div className="flex flex-wrap gap-4">
            {Object.entries(SERVICE_ICONS).map(([key, { icon: Icon, label, color }]) => (
              <div key={key} className="flex items-center gap-2 text-sm text-gray-600">
                <Icon className={`w-4 h-4 ${color}`} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Areas grouped by route */}
        <div className="space-y-10">
          {AREAS_BY_ROUTE.map((group) => (
            <section key={group.route}>
              <div className="flex items-center gap-3 mb-4">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-bold border ${getRouteColor(group.route)}`}
                >
                  {group.route}
                </span>
                <h2 className="text-lg font-semibold text-gray-900">{group.label}</h2>
                <span className="text-sm text-gray-400">
                  {group.areas.length} área{group.areas.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {group.areas.map((area) => (
                  <div
                    key={area.name}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 leading-snug">{area.name}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium mr-1 ${getRouteColor(area.road)}`}
                          >
                            {area.road}
                          </span>
                          km {area.km} &middot; {area.province}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 ml-3 flex-shrink-0">
                        <Clock className="w-3.5 h-3.5" />
                        {area.schedule}
                      </div>
                    </div>

                    {area.truckParking && (
                      <p className="text-xs text-blue-600 mt-1">
                        <Truck className="w-3 h-3 inline mr-1" />
                        ~{area.truckParking} plazas para camiones
                      </p>
                    )}

                    {area.notes && (
                      <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-2">
                        {area.notes}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {area.services.map((service) => {
                        const serviceInfo = SERVICE_ICONS[service];
                        if (!serviceInfo) return null;
                        const Icon = serviceInfo.icon;
                        return (
                          <span
                            key={service}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600"
                          >
                            <Icon className={`w-3 h-3 ${serviceInfo.color}`} />
                            {serviceInfo.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Legal note */}
        <div className="mt-10 bg-gray-100 rounded-xl p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-3">
            Consejos para el descanso reglamentario
          </h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
              El reglamento CE 561/2006 exige una pausa de 45 min tras 4,5 h de conducción continua.
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
              El descanso diario mínimo es de 11 horas consecutivas (o reducido a 9 h máximo 3 veces por semana).
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
              Planifica las paradas con antelación en rutas con alto tráfico pesado (AP-7 en verano, A-2 permanente).
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
              Los datos de plazas son orientativos. Confirma disponibilidad contactando con el área o usando apps de parking.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
