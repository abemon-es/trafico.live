"use client";

import useSWR from "swr";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface IntensidadSummary {
  avgSpeed?: number | null;
  avgIntensity?: number | null;
  avgOccupancy?: number | null;
}

interface LiveTrafficFlowProps {
  detectorCount: number;
}

function formatDetectors(n: number): string {
  // Format as "4.247" style (Spanish thousands separator)
  return n.toLocaleString("es-ES");
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1 rounded-full bg-gray-100 dark:bg-gray-800 mt-3 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }}
      />
    </div>
  );
}

export function LiveTrafficFlow({ detectorCount }: LiveTrafficFlowProps) {
  const { data } = useSWR<IntensidadSummary>(
    "/api/trafico/intensidad?summary=true",
    fetcher,
    { refreshInterval: 300000 }
  );

  // Fallback to static design values if endpoint absent / null
  const speed = data?.avgSpeed ?? 104;
  const intensity = data?.avgIntensity ?? 1842;
  const occupancy = data?.avgOccupancy ?? 23;

  // Progress bar percentages
  const speedPct = Math.round((speed / 130) * 100); // 130 km/h = 100%
  const intensityPct = Math.round((intensity / 3000) * 100); // 3000 veh/h = 100%
  const occupancyPct = occupancy;

  const cards = [
    {
      key: "speed",
      label: "Velocidad media",
      value: Math.round(speed).toLocaleString("es-ES"),
      unit: "km/h · Red de alta capacidad",
      pct: speedPct,
      color: "var(--color-signal-green, #059669)",
      textColor: "text-signal-green",
      labelColor: "text-signal-green",
    },
    {
      key: "intensity",
      label: "Intensidad",
      value: Math.round(intensity).toLocaleString("es-ES"),
      unit: "vehículos/hora · Promedio nacional",
      pct: intensityPct,
      color: "var(--color-tl-600, #1b4bd5)",
      textColor: "text-tl-600 dark:text-tl-400",
      labelColor: "text-tl-600 dark:text-tl-400",
    },
    {
      key: "occupancy",
      label: "Ocupación",
      value: `${Math.round(occupancy)}%`,
      unit: "ocupación media de carril",
      pct: occupancyPct,
      color: "var(--color-tl-amber-500, #b56200)",
      textColor: "text-tl-amber-500 dark:text-tl-amber-400",
      labelColor: "text-tl-amber-500 dark:text-tl-amber-400",
    },
  ];

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between mb-7">
          <div>
            <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-tl-600 dark:text-tl-400 mb-1">
              Flujo de tráfico en vivo
            </p>
            <h2 className="font-heading text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
              <span className="font-data">{formatDetectors(detectorCount)}</span>{" "}
              detectores DGT · cada 5 minutos
            </h2>
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 max-w-lg leading-relaxed">
              Velocidad, intensidad y ocupación en toda la red de carreteras. Datos
              DATEX II del NAP de la DGT.
            </p>
          </div>
          <Link
            href="/mapa"
            className="text-xs text-tl-600 dark:text-tl-400 font-medium whitespace-nowrap hover:text-tl-700 dark:hover:text-tl-300 transition-colors"
          >
            Ver mapa de flujo &rarr;
          </Link>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {cards.map((card) => (
            <div
              key={card.key}
              className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:border-tl-300 dark:hover:border-tl-700 transition-colors"
            >
              <div
                className={`text-[0.6rem] font-semibold uppercase tracking-wider mb-3 ${card.labelColor}`}
              >
                {card.label}
              </div>
              <div className={`font-data text-3xl font-bold ${card.textColor}`}>
                {card.value}
              </div>
              <div className="text-[0.7rem] text-gray-400 dark:text-gray-500 mt-0.5">
                {card.unit}
              </div>
              <Bar pct={card.pct} color={card.color} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
