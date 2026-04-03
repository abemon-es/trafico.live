import { Train } from "lucide-react";
import { GeoEntity } from "@/lib/geo/types";
import { prisma } from "@/lib/db";

interface RailwaySectionProps {
  entity: GeoEntity;
}

const SERVICE_TYPE_LABELS: Record<string, string> = {
  CERCANIAS: "Cercanías",
  AVE: "AVE",
  AVLO: "AVLO",
  ALVIA: "Alvia",
  AVANT: "Avant",
  EUROMED: "Euromed",
  LARGA_DISTANCIA: "Larga Distancia",
  MEDIA_DISTANCIA: "Media Distancia",
  REGIONAL: "Regional",
  REGIONAL_EXPRESS: "Reg. Expres",
  PROXIMIDAD: "Proximidad",
  INTERCITY: "Intercity",
  TRENHOTEL: "Trenhotel",
  TRENCELTA: "TrenCelta",
  FEVE: "FEVE",
  RODALIES: "Rodalies",
};

const SERVICE_TYPE_COLORS: Record<string, string> = {
  CERCANIAS: "bg-tl-100 text-tl-700",
  RODALIES: "bg-tl-100 text-tl-700",
  AVE: "bg-red-100 text-red-700",
  AVLO: "bg-red-100 text-red-700",
  ALVIA: "bg-orange-100 text-orange-700",
  AVANT: "bg-orange-100 text-orange-700",
  EUROMED: "bg-orange-100 text-orange-700",
  LARGA_DISTANCIA: "bg-purple-100 text-purple-700",
  MEDIA_DISTANCIA: "bg-indigo-100 text-indigo-700",
  REGIONAL: "bg-gray-100 text-gray-700",
  REGIONAL_EXPRESS: "bg-gray-100 text-gray-700",
  PROXIMIDAD: "bg-blue-100 text-blue-700",
  INTERCITY: "bg-purple-100 text-purple-700",
  TRENHOTEL: "bg-indigo-100 text-indigo-700",
  TRENCELTA: "bg-green-100 text-green-700",
  FEVE: "bg-green-100 text-green-700",
};

export async function RailwaySection({ entity }: RailwaySectionProps) {
  if (!entity.provinceCode) return null;

  const stations = await prisma.railwayStation.findMany({
    where: { province: entity.provinceCode },
    take: 20,
    orderBy: { name: "asc" },
  });

  if (stations.length === 0) return null;

  const total = await prisma.railwayStation.count({
    where: { province: entity.provinceCode },
  });

  return (
    <section
      id="trenes"
      className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Train className="w-5 h-5 text-tl-600" />
          <h2 className="font-heading text-lg font-bold text-gray-900">
            {total} estación{total !== 1 ? "es" : ""} de tren en {entity.name}
          </h2>
          <span
            className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0"
            title="Datos estáticos"
          ></span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {stations.map((station) => (
          <div
            key={station.id}
            className="rounded-xl border border-gray-100 bg-gray-50 p-3"
          >
            <p className="text-sm font-medium text-gray-900 truncate">
              {station.name}
            </p>
            {station.network && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">
                {station.network}
              </p>
            )}
            {station.serviceTypes.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {station.serviceTypes.slice(0, 4).map((type) => (
                  <span
                    key={type}
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      SERVICE_TYPE_COLORS[type] ?? "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {SERVICE_TYPE_LABELS[type] ?? type}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* CTA */}
      <a
        href="/trenes/estaciones"
        className="mt-4 inline-flex items-center gap-1 text-sm text-tl-600 hover:text-tl-700 font-medium"
      >
        Ver todas las estaciones →
      </a>

      {/* Attribution */}
      <p className="mt-4 text-[10px] text-gray-400">Fuente: Renfe GTFS</p>
    </section>
  );
}
