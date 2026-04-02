import { Route } from "lucide-react";
import { GeoEntity } from "@/lib/geo/types";
import { getLocationRoads } from "@/lib/data/location-data";

interface RoadsSectionProps {
  entity: GeoEntity;
  limit?: number;
  spokeHref?: string;
}

const ROAD_TYPE_ORDER = [
  "AUTOPISTA",
  "AUTOVIA",
  "NACIONAL",
  "COMARCAL",
  "PROVINCIAL",
  "URBANA",
  "OTHER",
];

const ROAD_TYPE_LABELS: Record<string, string> = {
  AUTOPISTA: "Autopistas",
  AUTOVIA: "Autovías",
  NACIONAL: "Carreteras nacionales",
  COMARCAL: "Carreteras comarcales",
  PROVINCIAL: "Carreteras provinciales",
  URBANA: "Vías urbanas",
  OTHER: "Otras vías",
};

const ROAD_TYPE_PILL_STYLE: Record<string, string> = {
  AUTOPISTA: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200",
  AUTOVIA: "bg-tl-100 text-tl-800 border-tl-200 hover:bg-tl-200",
  NACIONAL: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
  COMARCAL: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100",
  PROVINCIAL: "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100",
  URBANA: "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200",
  OTHER: "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100",
};

export async function RoadsSection({
  entity,
  limit = 50,
  spokeHref,
}: RoadsSectionProps) {
  const { items, total } = await getLocationRoads(entity, limit);

  if (items.length === 0) return null;

  // Group by road type, following priority order
  const grouped = ROAD_TYPE_ORDER.reduce<
    Record<string, typeof items>
  >((acc, type) => {
    const roads = items.filter((r) => r.type === type);
    if (roads.length > 0) acc[type] = roads;
    return acc;
  }, {});

  return (
    <section
      id="carreteras"
      className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Route className="w-5 h-5 text-tl-600" />
          <h2 className="font-heading text-lg font-bold text-gray-900">
            {total} vía{total !== 1 ? "s" : ""} en {entity.name}
          </h2>
          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" title="Datos estáticos"></span>
        </div>
      </div>

      {/* Grouped road pills */}
      <div className="space-y-4">
        {Object.entries(grouped).map(([type, roads]) => (
          <div key={type}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              {ROAD_TYPE_LABELS[type] ?? type}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {roads.map((road) => (
                <a
                  key={road.id}
                  href={`/carreteras/${road.id.toLowerCase().replace(/\s+/g, "-")}`}
                  className={`inline-flex items-center px-3 py-1 rounded-lg border text-xs font-data font-semibold transition-colors ${
                    ROAD_TYPE_PILL_STYLE[type] ?? ROAD_TYPE_PILL_STYLE.OTHER
                  }`}
                >
                  {road.id}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      {spokeHref && total > limit && (
        <a
          href={spokeHref}
          className="mt-4 inline-flex items-center gap-1 text-sm text-tl-600 hover:text-tl-700 font-medium"
        >
          Ver las {total} vías →
        </a>
      )}

      {/* Attribution */}
      <p className="mt-4 text-[10px] text-gray-400">Fuente: DGT</p>
    </section>
  );
}
