"use client";

import useSWR from "swr";
import {
  Anchor,
  ArrowRight,
  Clock,
  Navigation,
  TrendingUp,
  MapPin,
  Loader2,
  RouteIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Voyage {
  id: string;
  mmsi: number;
  departurePort: string | null;
  departureLat: number | null;
  departureLng: number | null;
  departedAt: string;
  arrivalPort: string | null;
  arrivalLat: number | null;
  arrivalLng: number | null;
  arrivedAt: string | null;
  distanceNm: number | null;
  durationH: number | null;
  avgSpeedKn: number | null;
  status: "IN_TRANSIT" | "ARRIVED";
  positionCount: number;
}

interface PortCall {
  id: string;
  mmsi: number;
  arrivedAt: string;
  departedAt: string | null;
  durationH: number | null;
  portName: string | null;
  portCode: string | null;
}

interface VoyagesResponse {
  voyages: Voyage[];
  total: number;
}

interface PortCallsResponse {
  portCalls: PortCall[];
  total: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatDuration(hours: number | null): string {
  if (hours === null) return "N/D";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "hace <1 min";
  if (mins < 60) return `hace ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-800 animate-pulse">
      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-2/3 rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-gray-800" />
      </div>
      <div className="h-4 w-16 rounded bg-gray-100 dark:bg-gray-800" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// VoyageRow
// ---------------------------------------------------------------------------

function VoyageRow({ voyage }: { voyage: Voyage }) {
  const isInTransit = voyage.status === "IN_TRANSIT";

  const from = voyage.departurePort ?? "Origen desconocido";
  const to = voyage.arrivalPort ?? (isInTransit ? voyage.status === "IN_TRANSIT" ? "En ruta" : "Destino desconocido" : "Destino desconocido");

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl border border-tl-sea-100 dark:border-tl-sea-900/40 bg-white dark:bg-gray-900 hover:border-tl-sea-300 dark:hover:border-tl-sea-700 transition-colors">
      {/* Status dot */}
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isInTransit
            ? "bg-tl-sea-100 dark:bg-tl-sea-900/50"
            : "bg-gray-100 dark:bg-gray-800"
        }`}
      >
        {isInTransit ? (
          <Navigation className="w-4 h-4 text-tl-sea-600 dark:text-tl-sea-400" />
        ) : (
          <Anchor className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        )}
      </div>

      {/* Route label */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
          <span className="truncate">{from}</span>
          <ArrowRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span className="truncate">{to}</span>
          {isInTransit && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-tl-sea-100 dark:bg-tl-sea-900/50 text-tl-sea-700 dark:text-tl-sea-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tl-sea-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-tl-sea-500" />
              </span>
              En ruta
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDate(voyage.departedAt)}
          </span>
          {voyage.durationH !== null && (
            <span className="flex items-center gap-1">
              <RouteIcon className="w-3 h-3" />
              {formatDuration(voyage.durationH)}
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 flex-shrink-0">
        {voyage.distanceNm !== null && (
          <div className="text-right">
            <div className="font-mono text-sm font-bold text-tl-sea-700 dark:text-tl-sea-300">
              {Math.round(voyage.distanceNm)} nm
            </div>
            <div className="text-xs text-gray-400">distancia</div>
          </div>
        )}
        {voyage.avgSpeedKn !== null && (
          <div className="text-right hidden sm:block">
            <div className="font-mono text-sm font-bold text-tl-sea-700 dark:text-tl-sea-300">
              {voyage.avgSpeedKn.toFixed(1)} kn
            </div>
            <div className="text-xs text-gray-400">vel. media</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PortCallRow
// ---------------------------------------------------------------------------

function PortCallRow({ call }: { call: PortCall }) {
  const ongoing = !call.departedAt;
  return (
    <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl border border-tl-sea-100 dark:border-tl-sea-900/40 bg-white dark:bg-gray-900 hover:border-tl-sea-300 dark:hover:border-tl-sea-700 transition-colors">
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
          ongoing
            ? "bg-emerald-100 dark:bg-emerald-900/50"
            : "bg-gray-100 dark:bg-gray-800"
        }`}
      >
        <Anchor
          className={`w-4 h-4 ${
            ongoing
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-gray-500 dark:text-gray-400"
          }`}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
          <MapPin className="w-3.5 h-3.5 text-tl-sea-500 flex-shrink-0" />
          <span>{call.portName ?? call.portCode ?? "Puerto desconocido"}</span>
          {ongoing && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
              En puerto
            </span>
          )}
        </div>
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Llegada {timeAgo(call.arrivedAt)}
        </div>
      </div>

      {call.durationH !== null && (
        <div className="text-right flex-shrink-0">
          <div className="font-mono text-sm font-bold text-gray-700 dark:text-gray-300">
            {formatDuration(call.durationH)}
          </div>
          <div className="text-xs text-gray-400">estancia</div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface Props {
  mmsi: number;
}

export function VesselVoyageHistory({ mmsi }: Props) {
  const { data: voyagesData, isLoading: loadingVoyages } =
    useSWR<VoyagesResponse>(
      `/api/maritimo/voyages?mmsi=${mmsi}&limit=20`,
      fetcher,
      { revalidateOnFocus: false, dedupingInterval: 120_000 }
    );

  const { data: portCallsData, isLoading: loadingPortCalls } =
    useSWR<PortCallsResponse>(
      `/api/maritimo/port-calls?mmsi=${mmsi}&limit=20`,
      fetcher,
      { revalidateOnFocus: false, dedupingInterval: 120_000 }
    );

  const voyages = voyagesData?.voyages ?? [];
  const portCalls = portCallsData?.portCalls ?? [];

  const isLoading = loadingVoyages || loadingPortCalls;

  const hasVoyages = voyages.length > 0;
  const hasPortCalls = portCalls.length > 0;
  const hasAnyData = hasVoyages || hasPortCalls;

  return (
    <div className="space-y-8">
      {/* ------ Voyages ------ */}
      <section aria-label="Historial de travesias">
        <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-tl-sea-500" />
          Travesias recientes
        </h2>

        {loadingVoyages ? (
          <div className="space-y-3">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : hasVoyages ? (
          <div className="space-y-3">
            {voyages.map((v) => (
              <VoyageRow key={v.id} voyage={v} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center">
            <Navigation className="w-8 h-8 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No hay travesias registradas para este buque.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
              Los viajes se calculan a partir de datos AIS. Es posible que el buque no haya sido detectado recientemente.
            </p>
          </div>
        )}
      </section>

      {/* ------ Port calls ------ */}
      <section aria-label="Escalas en puerto">
        <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Anchor className="w-5 h-5 text-tl-sea-500" />
          Escalas en puerto
        </h2>

        {loadingPortCalls ? (
          <div className="space-y-3">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : hasPortCalls ? (
          <div className="space-y-3">
            {portCalls.map((pc) => (
              <PortCallRow key={pc.id} call={pc} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center">
            <Anchor className="w-8 h-8 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No hay escalas registradas para este buque.
            </p>
          </div>
        )}
      </section>

      {/* ------ Attribution ------ */}
      {!isLoading && hasAnyData && (
        <p className="text-xs text-gray-400 dark:text-gray-600">
          Travesias y escalas derivadas de datos AIS via aisstream.io. Cobertura sujeta a disponibilidad de receptores.
        </p>
      )}
    </div>
  );
}
