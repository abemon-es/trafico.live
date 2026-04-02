"use client";

import useSWR from "swr";

interface LiveCounterStripProps {
  initialStats: {
    incidentCount: number;
    cameraCount: number;
    radarCount: number;
    stationCount: number;
    v16Count: number;
    chargerCount: number;
    detectorCount: number;
  };
}

// /api/stats response shape (relevant fields only)
interface StatsResponse {
  incidents: number;
  cameras: number;
  chargers: number;
  v16Active: number;
}

// /api/fuel-prices/today response shape (relevant fields only)
interface FuelResponse {
  national?: {
    avgGasolina95: number | null;
  } | null;
}

// /api/weather response shape (relevant fields only)
interface WeatherResponse {
  count: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatNumber(n: number): string {
  return n.toLocaleString("es-ES");
}

function formatFuel(price: number): string {
  return price.toLocaleString("es-ES", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

const DOT_RED = "#dc2626";
const DOT_BLUE = "#1b4bd5";
const DOT_AMBER = "#d48139";
const DOT_GREEN = "#059669";
const DOT_SEA = "#0369a1";

export function LiveCounterStrip({ initialStats }: LiveCounterStripProps) {
  const { data: statsData } = useSWR<StatsResponse>("/api/stats", fetcher, {
    refreshInterval: 60000,
  });

  const { data: fuelData } = useSWR<FuelResponse>(
    "/api/fuel-prices/today",
    fetcher,
    { refreshInterval: 300000 }
  );

  const { data: weatherData } = useSWR<WeatherResponse>(
    "/api/weather",
    fetcher,
    { refreshInterval: 300000 }
  );

  const incidents = statsData?.incidents ?? initialStats.incidentCount;
  const cameras = statsData?.cameras ?? initialStats.cameraCount;
  const chargers = statsData?.chargers ?? initialStats.chargerCount;
  const v16 = statsData?.v16Active ?? initialStats.v16Count;
  const radars = initialStats.radarCount;
  const detectors = initialStats.detectorCount;

  const fuelPrice = fuelData?.national?.avgGasolina95 ?? null;
  const weatherAlerts = weatherData?.count ?? null;

  const items: Array<{ value: string; label: string; color: string }> = [
    {
      value: formatNumber(incidents),
      label: "incidencias",
      color: DOT_RED,
    },
    {
      value: formatNumber(detectors),
      label: "detectores DGT",
      color: DOT_BLUE,
    },
    {
      value: fuelPrice !== null ? `${formatFuel(fuelPrice)} €/L` : "– €/L",
      label: "gasolina 95",
      color: DOT_AMBER,
    },
    {
      value: formatNumber(chargers),
      label: "cargadores EV",
      color: DOT_GREEN,
    },
    {
      value: formatNumber(cameras),
      label: "cámaras",
      color: DOT_BLUE,
    },
    {
      value: formatNumber(radars),
      label: "radares",
      color: DOT_AMBER,
    },
    {
      value: weatherAlerts !== null ? formatNumber(weatherAlerts) : "–",
      label: "alertas meteo",
      color: DOT_SEA,
    },
    {
      value: formatNumber(v16),
      label: "V16 activas",
      color: DOT_BLUE,
    },
  ];

  return (
    <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 py-2.5 px-6">
      <div
        className="max-w-7xl mx-auto flex items-center gap-5 overflow-x-auto"
        style={{ scrollbarWidth: "none" }}
      >
        {items.map((item, index) => (
          <div key={item.label} className="contents">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: item.color }}
              />
              <span className="font-data text-sm font-medium text-gray-900 dark:text-gray-100">
                {item.value}
              </span>
              <span className="text-xs text-gray-400">{item.label}</span>
            </div>
            {index < items.length - 1 && (
              <div className="w-px h-3 bg-gray-200 dark:bg-gray-800 shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
