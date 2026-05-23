/**
 * Server component: live Renfe trains currently associated with this
 * station. Renders one card per train with brand, ID, origin→destination,
 * ETA (if next stop), delay state, and a link to /trenes/tren/[id].
 *
 * Pulls from the same Renfe largorecorrido API that /api/trenes/posiciones
 * uses. Cached 30s via redis. Returns null (renders nothing) when no
 * trains match or the upstream is unreachable — page stays clean either
 * way.
 */

import Link from "next/link";
import redis from "@/lib/redis";
import {
  TrainFront,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

const FLOTA_URL = "https://tiempo-real.largorecorrido.renfe.com/renfe-visor/flotaLD.json";
const RUTAS_URL = "https://tiempo-real.largorecorrido.renfe.com/renfe-visor/trenesConEstacionesLD.json";
const CACHE_KEY_FLOTA = "renfe:flota:ld";
const CACHE_KEY_RUTAS = "renfe:rutas:ld";
const CACHE_TTL = 30;

interface RenfeTrain {
  codComercial: string;
  codEstAnt: string;
  codEstSig: string;
  horaLlegadaSigEst: string;
  codProduct: number;
  codOrigen: string;
  codDestino: string;
  accesible: boolean;
  ultRetraso: string;
  latitud: number;
  longitud: number;
}

interface TrainRoute {
  idTren: string;
  estaciones: Array<{ p: string; h: string }>;
}

const PRODUCT_TYPES: Record<number, { name: string; color: string }> = {
  1: { name: "AVE", color: "#9b1c2e" },
  2: { name: "AVE", color: "#9b1c2e" },
  3: { name: "Avant", color: "#1e40af" },
  4: { name: "Alvia", color: "#7c3aed" },
  5: { name: "Alvia", color: "#7c3aed" },
  6: { name: "Altaria", color: "#7c3aed" },
  7: { name: "Euromed", color: "#0891b2" },
  8: { name: "Trenhotel", color: "#475569" },
  10: { name: "Talgo", color: "#475569" },
  11: { name: "Alvia", color: "#7c3aed" },
  12: { name: "AV City", color: "#9b1c2e" },
  13: { name: "Intercity", color: "#0891b2" },
  16: { name: "MD", color: "#0891b2" },
  17: { name: "Regional", color: "#0891b2" },
  18: { name: "RE", color: "#0891b2" },
  19: { name: "Intercity", color: "#0891b2" },
};

async function fetchCached<T>(url: string, key: string): Promise<T | null> {
  if (redis) {
    try {
      const cached = await redis.get(key);
      if (cached) return JSON.parse(cached) as T;
    } catch {
      // ignore cache-read failures — fall through to upstream
    }
  }
  try {
    const res = await fetch(`${url}?v=${Date.now()}`, {
      headers: { "User-Agent": "trafico.live/1.0" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as T;
    if (redis) redis.set(key, JSON.stringify(data), "EX", CACHE_TTL).catch(() => {});
    return data;
  } catch {
    return null;
  }
}

function stationCodeNames(
  codes: string[],
  resolver: (code: string) => string | undefined,
): Map<string, string> {
  const m = new Map<string, string>();
  for (const c of codes) {
    const name = resolver(c);
    if (name) m.set(c, name);
  }
  return m;
}

interface Props {
  /** Renfe station code, e.g. "60000" for Atocha */
  stationCode: string | null;
  /** Resolver for Renfe codes → human station names (passed in to avoid
   *  a second DB roundtrip — the parent already loaded these). */
  resolveStationName?: (code: string) => string | undefined;
}

export async function LiveTrainsAtStation({ stationCode, resolveStationName }: Props) {
  if (!stationCode) return null;

  const [flotaData, rutasRaw] = await Promise.all([
    fetchCached<{ trenes: RenfeTrain[] }>(FLOTA_URL, CACHE_KEY_FLOTA),
    fetchCached<{ trenes?: TrainRoute[] } | TrainRoute[]>(RUTAS_URL, CACHE_KEY_RUTAS),
  ]);

  if (!flotaData?.trenes?.length) return null;

  const rawRoutes = Array.isArray(rutasRaw)
    ? rutasRaw
    : (rutasRaw as { trenes?: TrainRoute[] } | null)?.trenes ?? [];
  const routeByTrain = new Map<string, TrainRoute>();
  for (const r of rawRoutes) {
    if (r.idTren) routeByTrain.set(r.idTren.toUpperCase(), r);
  }

  // Filter: trains whose route passes through this station OR whose
  // immediate next/previous stop is this station.
  const matching = flotaData.trenes.filter((t) => {
    if (t.codEstAnt === stationCode || t.codEstSig === stationCode) return true;
    if (t.codOrigen === stationCode || t.codDestino === stationCode) return true;
    const route = routeByTrain.get(t.codComercial?.toUpperCase() ?? "");
    if (!route?.estaciones) return false;
    return route.estaciones.some((s) => s.p === stationCode);
  });

  if (matching.length === 0) {
    return (
      <section
        aria-label="Trenes ahora"
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6"
      >
        <h2 className="font-heading text-lg font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2 mb-3">
          <TrainFront className="w-5 h-5 text-tl-600 dark:text-tl-400" />
          Trenes ahora
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Sin trenes de Largo Recorrido activos asociados a esta estación en este momento. Los
          Cercanías y MD circulan pero no se exponen en esta vista.
        </p>
      </section>
    );
  }

  // Sort: arriving here next first (codEstSig match), then origin matches,
  // then by ETA, then by train number.
  matching.sort((a, b) => {
    const aArr = a.codEstSig === stationCode ? 0 : a.codOrigen === stationCode ? 1 : 2;
    const bArr = b.codEstSig === stationCode ? 0 : b.codOrigen === stationCode ? 1 : 2;
    if (aArr !== bArr) return aArr - bArr;
    if (a.horaLlegadaSigEst && b.horaLlegadaSigEst) {
      return a.horaLlegadaSigEst.localeCompare(b.horaLlegadaSigEst);
    }
    return (a.codComercial ?? "").localeCompare(b.codComercial ?? "");
  });

  // Collect codes for name resolution
  const allCodes = new Set<string>();
  for (const t of matching) {
    allCodes.add(t.codOrigen);
    allCodes.add(t.codDestino);
  }
  const nameMap = resolveStationName
    ? stationCodeNames(Array.from(allCodes), resolveStationName)
    : new Map<string, string>();

  return (
    <section
      aria-label="Trenes ahora"
      className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden"
    >
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-lg font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2">
          <TrainFront className="w-5 h-5 text-tl-600 dark:text-tl-400" />
          Trenes ahora
          <span className="ml-1 text-xs font-mono px-2 py-0.5 rounded-full bg-tl-100 text-tl-700 dark:bg-tl-900/30 dark:text-tl-300">
            {matching.length}
          </span>
        </h2>
        <p className="text-[11px] text-gray-400 dark:text-gray-500">
          Renfe Largo Recorrido · actualizado cada 30 s
        </p>
      </div>
      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {matching.slice(0, 12).map((t) => {
          const product = PRODUCT_TYPES[t.codProduct] ?? { name: "Renfe", color: "#475569" };
          const delay = parseInt(t.ultRetraso, 10) || 0;
          const isArriving = t.codEstSig === stationCode;
          const isOrigin = t.codOrigen === stationCode;
          const isDestination = t.codDestino === stationCode;
          const origin = nameMap.get(t.codOrigen) ?? t.codOrigen;
          const destination = nameMap.get(t.codDestino) ?? t.codDestino;
          return (
            <li key={t.codComercial}>
              <Link
                href={`/trenes/tren/${encodeURIComponent(t.codComercial)}`}
                className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
              >
                <span
                  className="inline-flex items-center justify-center px-2 py-1 rounded-md text-[10px] font-semibold font-mono text-white flex-shrink-0"
                  style={{ background: product.color }}
                >
                  {product.name}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {t.codComercial}
                    </span>
                    {isArriving && (
                      <span className="text-[10px] uppercase tracking-wide font-semibold text-amber-700 dark:text-amber-400">
                        Próximo aquí
                      </span>
                    )}
                    {isOrigin && (
                      <span className="text-[10px] uppercase tracking-wide font-semibold text-green-700 dark:text-green-400">
                        Origen
                      </span>
                    )}
                    {isDestination && (
                      <span className="text-[10px] uppercase tracking-wide font-semibold text-blue-700 dark:text-blue-400">
                        Destino
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {origin} <ArrowRight className="w-3 h-3 inline mx-0.5" /> {destination}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  {isArriving && t.horaLlegadaSigEst && (
                    <p className="font-mono text-xs text-gray-700 dark:text-gray-300 flex items-center justify-end gap-1">
                      <Clock className="w-3 h-3" />
                      {t.horaLlegadaSigEst}
                    </p>
                  )}
                  <p
                    className={`text-[11px] font-semibold flex items-center justify-end gap-1 ${
                      delay <= 0
                        ? "text-green-600 dark:text-green-400"
                        : delay <= 5
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {delay <= 0 ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        En hora
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3 h-3" />
                        +{delay} min
                      </>
                    )}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      {matching.length > 12 && (
        <p className="px-4 py-2 text-[11px] text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800">
          Se muestran 12 de {matching.length} trenes asociados ahora.
        </p>
      )}
    </section>
  );
}
