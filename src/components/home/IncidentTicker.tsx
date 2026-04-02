"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Incident {
  roadNumber?: string;
  type?: string;
  severity?: string;
  startedAt?: string;
  description?: string;
}

interface IncidentsResponse {
  incidents?: Incident[];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
}

export function IncidentTicker() {
  const { data } = useSWR<IncidentsResponse>(
    "/api/incidents?limit=8",
    fetcher,
    { refreshInterval: 60000 }
  );

  const incidents: Incident[] = data?.incidents ?? [];
  if (incidents.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes ticker-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ticker-track { animation: none !important; }
        }
      `}</style>
      <div className="border-y border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden h-9 flex items-center">
        {/* "Incidencias" label pinned left */}
        <div className="flex items-center gap-1.5 pl-4 pr-3 border-r border-gray-200 dark:border-gray-800 shrink-0 h-full">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-signal-red opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-signal-red" />
          </span>
          <span className="text-[0.6rem] font-bold text-signal-red uppercase tracking-wider whitespace-nowrap">
            Incidencias
          </span>
        </div>

        {/* Scrolling track */}
        <div className="flex-1 overflow-hidden">
          <div
            className="ticker-track flex items-center gap-6 whitespace-nowrap"
            style={{ animation: "ticker-scroll 35s linear infinite" }}
          >
            {/* Duplicate items for a seamless loop */}
            {[...incidents, ...incidents].map((inc, i) => (
              <span
                key={i}
                className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    inc.severity === "VERY_HIGH" || inc.severity === "HIGH"
                      ? "bg-signal-red"
                      : "bg-tl-amber-400"
                  }`}
                />
                <span className="font-data font-medium text-gray-900 dark:text-gray-100">
                  {inc.roadNumber ?? "Vía"}
                </span>
                <span>{inc.type ?? inc.description ?? "Incidencia"}</span>
                {inc.startedAt && (
                  <span className="text-gray-400 dark:text-gray-500">
                    {timeAgo(inc.startedAt)}
                  </span>
                )}
                <span className="text-gray-300 dark:text-gray-700 select-none">·</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
