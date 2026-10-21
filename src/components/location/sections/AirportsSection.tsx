import Link from "next/link";
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
      className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Plane className="w-5 h-5 text-tl-600 dark:text-tl-400" />
          <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-gray-100">
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
              className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate flex-1">
                  {airport.name}
                </p>
                <div className="flex shrink-0 gap-1">
                  {airport.iata && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300 font-mono font-semibold">
                      {airport.iata}
                    </span>
                  )}
                  {airport.isAena && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">
                      AENA
                    </span>
                  )}
                </div>
              </div>
              {airport.city && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{airport.city}</p>
              )}
              {pax != null && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">
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
      <Link
        href="/aviacion"
        className="mt-4 inline-flex items-center gap-1 text-sm text-tl-600 dark:text-tl-400 hover:text-tl-700 dark:hover:text-tl-300 font-medium"
      >
        Ver aviación →
      </Link>

      {/* Attribution */}
      <p className="mt-4 text-[10px] text-gray-400 dark:text-gray-500">Fuente: AENA / Eurostat</p>
    </section>
  );
}
