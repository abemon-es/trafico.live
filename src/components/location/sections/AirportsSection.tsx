import { Plane } from "lucide-react";
import { GeoEntity } from "@/lib/geo/types";
import { prisma } from "@/lib/db";

interface AirportsSectionProps {
  entity: GeoEntity;
}

function formatPassengers(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toLocaleString("es-ES");
}

export async function AirportsSection({ entity }: AirportsSectionProps) {
  if (!entity.provinceCode) return null;

  const airports = await prisma.airport.findMany({
    where: { province: entity.provinceCode },
    include: {
      statistics: {
        where: { metric: "pax" },
        orderBy: { periodStart: "desc" },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });

  if (airports.length === 0) return null;

  return (
    <section
      id="aviacion"
      className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Plane className="w-5 h-5 text-tl-600" />
          <h2 className="font-heading text-lg font-bold text-gray-900">
            {airports.length} aeropuerto{airports.length !== 1 ? "s" : ""} en{" "}
            {entity.name}
          </h2>
          <span
            className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0"
            title="Datos estadísticos"
          ></span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {airports.map((airport) => {
          const latestStat = airport.statistics[0] ?? null;
          const pax = latestStat
            ? Number(latestStat.value)
            : null;

          return (
            <div
              key={airport.id}
              className="rounded-xl border border-gray-100 bg-gray-50 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-gray-900 truncate flex-1">
                  {airport.name}
                </p>
                <div className="flex shrink-0 gap-1">
                  {airport.iata && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-tl-100 text-tl-700 font-mono font-semibold">
                      {airport.iata}
                    </span>
                  )}
                  {airport.isAena && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                      AENA
                    </span>
                  )}
                </div>
              </div>
              {airport.city && (
                <p className="text-xs text-gray-500 mt-0.5">{airport.city}</p>
              )}
              {pax != null && (
                <p className="text-xs text-gray-600 mt-2">
                  <span className="font-mono font-semibold text-gray-800">
                    {formatPassengers(pax)}
                  </span>{" "}
                  pasajeros
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <a
        href="/aviacion"
        className="mt-4 inline-flex items-center gap-1 text-sm text-tl-600 hover:text-tl-700 font-medium"
      >
        Ver aviación →
      </a>

      {/* Attribution */}
      <p className="mt-4 text-[10px] text-gray-400">Fuente: AENA / Eurostat</p>
    </section>
  );
}
