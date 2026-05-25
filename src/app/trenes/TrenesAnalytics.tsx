"use client";

import useSWR from "swr";
import { Clock, Train, Trophy, AlertTriangle } from "lucide-react";
import { fetcher } from "@/lib/fetcher";

interface BrandRow {
  brand: string;
  punctuality: number;
  avgDelay: number;
  total: number;
}

interface DelayStatsCurrent {
  punctualityRate: number;
  avgDelay: number;
  maxDelay: number;
  totalTrains: number;
  onTimeCount: number;
  slightCount: number;
  moderateCount: number;
  severeCount: number;
}

export function TrenesAnalytics() {
  const { data: delayStats } = useSWR(`/api/trenes/stats?period=24h`, fetcher, {
    refreshInterval: 120000,
  });
  const { data: liveData } = useSWR(`/api/trenes/posiciones`, fetcher, {
    refreshInterval: 30000,
  });
  const { data: alertsData } = useSWR(`/api/trenes/alertas?active=true&limit=50`, fetcher, {
    refreshInterval: 120000,
  });

  const current: DelayStatsCurrent | undefined = delayStats?.data?.current;
  const brands: BrandRow[] = delayStats?.data?.brandPunctuality ?? [];
  const trainCount = liveData?.metadata?.count ?? 0;
  const alertsCount = alertsData?.data?.alerts?.length ?? 0;

  const punct = Number(current?.punctualityRate ?? 0);
  const avgDelay = Number(current?.avgDelay ?? 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            En circulación
          </p>
          <p className="mt-2 text-3xl font-data font-semibold text-gray-900 dark:text-gray-50">
            {trainCount.toLocaleString("es-ES")}
          </p>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
            <Train className="inline w-3 h-3 mr-0.5" />
            cada 15 s
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Puntualidad
          </p>
          <p
            className={`mt-2 text-3xl font-data font-semibold ${
              punct >= 80
                ? "text-signal-green"
                : punct >= 60
                  ? "text-tl-amber-500"
                  : "text-signal-red"
            }`}
          >
            {punct.toFixed(1)}%
          </p>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">trenes con ≤ 5 min</p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Retraso medio
          </p>
          <p className="mt-2 text-3xl font-data font-semibold text-gray-900 dark:text-gray-50">
            {avgDelay.toFixed(1)}
            <span className="ml-1 text-sm font-normal">min</span>
          </p>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
            <Clock className="inline w-3 h-3 mr-0.5" />
            media 24 h
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Alertas
          </p>
          <p
            className={`mt-2 text-3xl font-data font-semibold ${alertsCount > 0 ? "text-tl-amber-500" : "text-signal-green"}`}
          >
            {alertsCount}
          </p>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
            <AlertTriangle className="inline w-3 h-3 mr-0.5" />
            GTFS-RT
          </p>
        </div>
      </div>

      {brands.length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-tl-amber-500" />
            Puntualidad por marca — últimas 24 h
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {brands.slice(0, 12).map((b, i) => (
              <div
                key={b.brand}
                className="flex items-center gap-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3 py-2"
              >
                <span
                  className={`w-6 font-data font-bold text-sm ${
                    i === 0
                      ? "text-tl-amber-500"
                      : i === 1
                        ? "text-gray-400"
                        : i === 2
                          ? "text-tl-amber-700"
                          : "text-gray-500"
                  }`}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {b.brand}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    <span
                      className={`font-data font-semibold ${
                        b.punctuality >= 80
                          ? "text-signal-green"
                          : b.punctuality >= 60
                            ? "text-tl-amber-500"
                            : "text-signal-red"
                      }`}
                    >
                      {b.punctuality}%
                    </span>{" "}
                    · {b.avgDelay}min · {b.total}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
