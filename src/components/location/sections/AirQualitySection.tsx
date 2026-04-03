import { Wind } from "lucide-react";
import { GeoEntity } from "@/lib/geo/types";
import { prisma } from "@/lib/db";

interface AirQualitySectionProps {
  entity: GeoEntity;
}

const ICA_COLORS: Record<number, { bg: string; text: string; label: string }> =
  {
    1: {
      bg: "bg-sky-100 dark:bg-sky-900/30",
      text: "text-sky-700 dark:text-sky-300",
      label: "Buena",
    },
    2: {
      bg: "bg-green-100 dark:bg-green-900/30",
      text: "text-green-700 dark:text-green-300",
      label: "Razonable",
    },
    3: {
      bg: "bg-yellow-100 dark:bg-yellow-900/30",
      text: "text-yellow-700 dark:text-yellow-300",
      label: "Regular",
    },
    4: {
      bg: "bg-red-100 dark:bg-red-900/30",
      text: "text-red-700 dark:text-red-300",
      label: "Desfavorable",
    },
    5: {
      bg: "bg-red-200 dark:bg-red-900/50",
      text: "text-red-800 dark:text-red-200",
      label: "Muy desfavorable",
    },
    6: {
      bg: "bg-purple-100 dark:bg-purple-900/30",
      text: "text-purple-700 dark:text-purple-300",
      label: "Extrema",
    },
  };

export async function AirQualitySection({ entity }: AirQualitySectionProps) {
  if (!entity.provinceCode) return null;

  const stations = await prisma.airQualityStation.findMany({
    where: { province: entity.provinceCode },
    include: {
      readings: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    take: 20,
    orderBy: { name: "asc" },
  });

  if (stations.length === 0) return null;

  const total = await prisma.airQualityStation.count({
    where: { province: entity.provinceCode },
  });

  return (
    <section
      id="calidad-aire"
      className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wind className="w-5 h-5 text-tl-600" />
          <h2 className="font-heading text-lg font-bold text-gray-900">
            {total} estación{total !== 1 ? "es" : ""} de calidad del aire en{" "}
            {entity.name}
          </h2>
          <span
            className="w-1.5 h-1.5 rounded-full bg-tl-amber-400 shrink-0"
            title="Datos en tiempo real"
          ></span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {stations.map((station) => {
          const latestReading = station.readings[0] ?? null;
          const ica = latestReading?.ica ?? null;
          const icaStyle = ica != null ? ICA_COLORS[ica] : null;

          return (
            <div
              key={station.id}
              className="rounded-xl border border-gray-100 bg-gray-50 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-gray-900 truncate flex-1">
                  {station.name}
                </p>
                {icaStyle && (
                  <span
                    className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${icaStyle.bg} ${icaStyle.text}`}
                  >
                    {icaStyle.label}
                  </span>
                )}
              </div>
              {station.network && (
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {station.network}
                </p>
              )}
              {latestReading && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {latestReading.no2 != null && (
                    <span className="text-[10px] text-gray-500 font-mono">
                      NO₂ {latestReading.no2.toFixed(0)} µg/m³
                    </span>
                  )}
                  {latestReading.pm10 != null && (
                    <span className="text-[10px] text-gray-500 font-mono">
                      PM10 {latestReading.pm10.toFixed(0)} µg/m³
                    </span>
                  )}
                  {latestReading.o3 != null && (
                    <span className="text-[10px] text-gray-500 font-mono">
                      O₃ {latestReading.o3.toFixed(0)} µg/m³
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <a
        href="/calidad-aire"
        className="mt-4 inline-flex items-center gap-1 text-sm text-tl-600 hover:text-tl-700 font-medium"
      >
        Ver calidad del aire →
      </a>

      {/* Attribution */}
      <p className="mt-4 text-[10px] text-gray-400">Fuente: MITECO</p>
    </section>
  );
}
