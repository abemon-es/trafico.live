/**
 * /trenes/tren/[trainId] — per-train live entity page
 *
 * Renders TODAY's instance of a specific Renfe long-distance / Avant /
 * Cercanías long-haul train, identified by its `codComercial` (e.g.
 * "03241"). Pulls live position + schedule from the Renfe tiempo-real
 * API on each render (cached 30s via the existing redis client) and
 * cross-links every stop to its station landing page.
 *
 * This is the page the vision describes — "search any train, see its
 * landing with next stop, current position, and route timeline of past
 * and present stations".
 *
 * The train identifier is reused daily, so the page is not indexable.
 * Robots `noindex` keeps Google away while the URL stays shareable
 * (e.g. from the /trenes hero map or external chat).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import redis from "@/lib/redis";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import {
  TrainFront,
  Navigation,
  Clock,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Circle,
  ArrowRight,
  Accessibility,
  ExternalLink,
} from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// Revalidate at the same cadence the upstream fleet API publishes
export const revalidate = 30;
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Renfe data structures (mirrors /api/trenes/posiciones)
// ---------------------------------------------------------------------------

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
  time: number;
  mat: string;
}

interface TrainRoute {
  idTren: string;
  estaciones: Array<{ p: string; h: string }>;
  secuencia: Array<{ lat: number; lon: number; c?: string }>;
}

const PRODUCT_TYPES: Record<number, { name: string; brand: string; color: string }> = {
  1: { name: "AVE", brand: "AVE", color: "#9b1c2e" },
  2: { name: "AVE", brand: "AVE", color: "#9b1c2e" },
  3: { name: "Avant", brand: "Avant", color: "#1e40af" },
  4: { name: "Alvia", brand: "Alvia", color: "#7c3aed" },
  5: { name: "Alvia", brand: "Alvia", color: "#7c3aed" },
  6: { name: "Altaria", brand: "Altaria", color: "#7c3aed" },
  7: { name: "Euromed", brand: "Euromed", color: "#0891b2" },
  8: { name: "Trenhotel", brand: "Trenhotel", color: "#475569" },
  10: { name: "Talgo", brand: "Talgo", color: "#475569" },
  11: { name: "Alvia", brand: "Alvia", color: "#7c3aed" },
  12: { name: "AV City", brand: "AV City", color: "#9b1c2e" },
  13: { name: "Intercity", brand: "Intercity", color: "#0891b2" },
  16: { name: "Media Distancia", brand: "MD", color: "#0891b2" },
  17: { name: "Regional", brand: "Regional", color: "#0891b2" },
  18: { name: "Regional Exprés", brand: "RE", color: "#0891b2" },
  19: { name: "Intercity", brand: "Intercity", color: "#0891b2" },
};

// ---------------------------------------------------------------------------
// Data fetching — mirrors /api/trenes/posiciones with graceful degradation
// ---------------------------------------------------------------------------

async function fetchCached<T>(url: string, cacheKey: string, label: string): Promise<T | null> {
  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached) as T;
    } catch (e) {
      console.warn(`[trenes/tren] redis read ${label} failed:`, (e as Error).message);
    }
  }
  try {
    const res = await fetch(`${url}?v=${Date.now()}`, {
      headers: { "User-Agent": "trafico.live/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.warn(`[trenes/tren] ${label} upstream ${res.status}`);
      return null;
    }
    const data = (await res.json()) as T;
    if (redis) {
      redis.set(cacheKey, JSON.stringify(data), "EX", CACHE_TTL).catch(() => {});
    }
    return data;
  } catch (e) {
    console.warn(`[trenes/tren] ${label} fetch failed:`, (e as Error).message);
    return null;
  }
}

async function loadTrain(trainId: string) {
  const cleanId = trainId.trim().toUpperCase();

  const [flota, rutasRaw] = await Promise.all([
    fetchCached<{ fechaActualizacion: string; trenes: RenfeTrain[] }>(FLOTA_URL, CACHE_KEY_FLOTA, "flota"),
    fetchCached<{ trenes?: TrainRoute[] } | TrainRoute[]>(RUTAS_URL, CACHE_KEY_RUTAS, "rutas"),
  ]);

  const train = flota?.trenes?.find((t) => t.codComercial?.toUpperCase() === cleanId) ?? null;
  const rawRoutes = Array.isArray(rutasRaw)
    ? rutasRaw
    : (rutasRaw as { trenes?: TrainRoute[] } | null)?.trenes ?? [];
  const route = rawRoutes.find((r) => r.idTren?.toUpperCase() === cleanId) ?? null;

  // Resolve station codes → DB station rows so we can render names + link
  const stationCodes = new Set<string>();
  if (train) {
    if (train.codOrigen) stationCodes.add(train.codOrigen);
    if (train.codDestino) stationCodes.add(train.codDestino);
    if (train.codEstAnt) stationCodes.add(train.codEstAnt);
    if (train.codEstSig) stationCodes.add(train.codEstSig);
  }
  if (route?.estaciones) {
    for (const s of route.estaciones) stationCodes.add(s.p);
  }
  let stationsMap = new Map<string, { code: string; name: string; slug: string | null }>();
  if (stationCodes.size > 0) {
    const rows = await prisma.railwayStation.findMany({
      where: { code: { in: Array.from(stationCodes) } },
      select: { code: true, name: true, slug: true },
    });
    stationsMap = new Map(rows.filter((r) => r.code).map((r) => [r.code!, { code: r.code!, name: r.name, slug: r.slug }]));
  }

  return {
    cleanId,
    train,
    route,
    stationsMap,
    fechaActualizacion: flota?.fechaActualizacion ?? null,
    isLiveAvailable: flota !== null,
  };
}

function stationLink(code: string, map: Map<string, { code: string; name: string; slug: string | null }>) {
  const s = map.get(code);
  if (!s) return { name: code, href: null as string | null };
  if (s.slug) return { name: s.name, href: `/trenes/estacion/${s.slug}` };
  return { name: s.name, href: null };
}

// ---------------------------------------------------------------------------
// Metadata — noindex (data churns daily, train ID is reused)
// ---------------------------------------------------------------------------

export async function generateMetadata(
  { params }: { params: Promise<{ trainId: string }> },
): Promise<Metadata> {
  const { trainId } = await params;
  const cleanId = trainId.trim().toUpperCase();
  return {
    title: `Tren ${cleanId} en vivo — Posición, próxima parada y retraso`,
    description: `Posición en tiempo real del tren Renfe ${cleanId}: parada anterior y próxima, hora estimada, retraso actual y trayecto completo con horarios.`,
    alternates: { canonical: `${BASE_URL}/trenes/tren/${encodeURIComponent(cleanId)}` },
    robots: { index: false, follow: true },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function TrainEntityPage(
  { params }: { params: Promise<{ trainId: string }> },
) {
  const { trainId } = await params;
  const { cleanId, train, route, stationsMap, fechaActualizacion, isLiveAvailable } =
    await loadTrain(trainId);

  // We intentionally don't 404 missing trains — the user may have shared a
  // train that just finished its journey or that runs only certain days.
  // Render an informative empty state instead.

  const product = train ? PRODUCT_TYPES[train.codProduct] ?? { name: `Tipo ${train.codProduct}`, brand: "Renfe", color: "#475569" } : null;
  const delay = train ? parseInt(train.ultRetraso, 10) || 0 : 0;
  const delayTier =
    delay <= 0 ? "on-time" : delay <= 5 ? "slight" : delay <= 15 ? "moderate" : "severe";

  // Build the timeline of stops: for each station in the route, mark it as
  // PAST / CURRENT / FUTURE relative to the live `codEstAnt` and `codEstSig`.
  type StopRow = {
    code: string;
    name: string;
    href: string | null;
    scheduled: string;
    state: "past" | "current" | "future";
  };
  const timeline: StopRow[] = [];
  if (route?.estaciones && train) {
    let passedCurrent = false;
    let reachedNext = false;
    for (const s of route.estaciones) {
      const link = stationLink(s.p, stationsMap);
      let state: StopRow["state"];
      if (reachedNext) {
        state = "future";
      } else if (s.p === train.codEstSig) {
        state = "current";
        reachedNext = true;
        passedCurrent = true;
      } else if (passedCurrent) {
        state = "future";
      } else {
        state = "past";
      }
      timeline.push({
        code: s.p,
        name: link.name,
        href: link.href,
        scheduled: s.h ?? "",
        state,
      });
    }
  } else if (route?.estaciones) {
    // No live train but we have a route — render full schedule as "future"
    for (const s of route.estaciones) {
      const link = stationLink(s.p, stationsMap);
      timeline.push({
        code: s.p,
        name: link.name,
        href: link.href,
        scheduled: s.h ?? "",
        state: "future",
      });
    }
  }

  const origin = train ? stationLink(train.codOrigen, stationsMap) : null;
  const destination = train ? stationLink(train.codDestino, stationsMap) : null;
  const prev = train ? stationLink(train.codEstAnt, stationsMap) : null;
  const next = train ? stationLink(train.codEstSig, stationsMap) : null;

  // External Google Maps deep-link to the live position (driver-style "where is it now")
  const mapsViewUrl = train
    ? `https://www.google.com/maps/search/?api=1&query=${train.latitud},${train.longitud}`
    : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Trenes", href: "/trenes" },
            { name: "Líneas", href: "/trenes/lineas" },
            { name: `Tren ${cleanId}`, href: `/trenes/tren/${encodeURIComponent(cleanId)}` },
          ]}
        />
      </div>

      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{
          background:
            train && product
              ? `linear-gradient(135deg, #0f172a 0%, ${product.color}dd 100%)`
              : "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
        }}
      >
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center gap-3 mb-2">
            <TrainFront className="w-7 h-7 text-white/90" />
            {product && (
              <span className="font-heading text-white/90 text-xs font-semibold uppercase tracking-widest">
                {product.brand}
              </span>
            )}
            {train?.accesible && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/15 text-white border border-white/20">
                <Accessibility className="w-3 h-3" />
                Accesible
              </span>
            )}
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-white font-mono leading-tight">
            Tren {cleanId}
          </h1>
          {origin && destination && (
            <p className="mt-2 text-white/90 text-lg flex items-center gap-2 flex-wrap">
              <span>{origin.name}</span>
              <ArrowRight className="w-4 h-4" />
              <span>{destination.name}</span>
            </p>
          )}
          {!train && (
            <p className="mt-2 text-white/80 text-sm">
              {isLiveAvailable
                ? "No está circulando ahora mismo."
                : "Datos en tiempo real no disponibles temporalmente."}
            </p>
          )}
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Live status banner */}
        {train ? (
          <section
            aria-label="Estado en vivo"
            className={`rounded-xl border p-5 ${
              delayTier === "on-time"
                ? "border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-900/40"
                : delayTier === "slight"
                ? "border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900/40"
                : delayTier === "moderate"
                ? "border-orange-200 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-900/40"
                : "border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/40"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {delayTier === "on-time" ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {delay <= 0 ? "En hora" : `Retraso de ${delay} minutos`}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {prev && next && (
                      <>Entre <span className="font-medium text-gray-700 dark:text-gray-300">{prev.name}</span> y{" "}
                      <span className="font-medium text-gray-700 dark:text-gray-300">{next.name}</span></>
                    )}
                    {fechaActualizacion && (
                      <span className="ml-2 font-mono">
                        · Datos: {new Date(fechaActualizacion).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              {next && train.horaLlegadaSigEst && (
                <div className="text-right">
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Próxima parada
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {next.href ? <Link href={next.href} className="hover:underline">{next.name}</Link> : next.name}
                  </p>
                  <p className="text-xs font-mono text-gray-600 dark:text-gray-400">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {train.horaLlegadaSigEst}
                  </p>
                </div>
              )}
            </div>
          </section>
        ) : (
          <section
            aria-label="Sin datos en vivo"
            className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 text-center"
          >
            <TrainFront className="w-8 h-8 mx-auto text-gray-400 mb-3" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
              {isLiveAvailable ? "Sin tren activo con este código" : "Datos en vivo no disponibles"}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              {isLiveAvailable
                ? "El código " + cleanId + " no aparece en la lista actual de Renfe. Puede haber finalizado su recorrido o circular en días específicos."
                : "El visor de Renfe no respondió a tiempo. Vuelve a cargar en unos segundos."}
            </p>
            <Link
              href="/trenes"
              className="inline-flex items-center gap-1.5 mt-4 text-sm text-tl-600 dark:text-tl-400 hover:underline"
            >
              <TrainFront className="w-4 h-4" />
              Ver todos los trenes en vivo
            </Link>
          </section>
        )}

        {/* Live position card */}
        {train && (
          <section
            aria-label="Posición en vivo"
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-tl-600 dark:text-tl-400" />
                Posición actual
              </h2>
              {mapsViewUrl && (
                <a
                  href={mapsViewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-tl-600 dark:text-tl-400 hover:underline"
                >
                  Ver en Google Maps
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Latitud</dt>
                <dd className="font-mono text-gray-900 dark:text-gray-100">{train.latitud.toFixed(5)}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Longitud</dt>
                <dd className="font-mono text-gray-900 dark:text-gray-100">{train.longitud.toFixed(5)}</dd>
              </div>
              {train.mat && (
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Material</dt>
                  <dd className="font-mono text-gray-900 dark:text-gray-100">{train.mat}</dd>
                </div>
              )}
              {product && (
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Tipo</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100">{product.name}</dd>
                </div>
              )}
            </dl>
          </section>
        )}

        {/* Route timeline */}
        {timeline.length > 0 && (
          <section
            aria-label="Trayecto"
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6"
          >
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-tl-600 dark:text-tl-400" />
              Trayecto completo
            </h2>
            <ol className="space-y-0.5">
              {timeline.map((stop, idx) => {
                const isLast = idx === timeline.length - 1;
                const dotColor =
                  stop.state === "past"
                    ? "bg-gray-300 dark:bg-gray-700"
                    : stop.state === "current"
                    ? "bg-amber-500 ring-4 ring-amber-200 dark:ring-amber-900/40"
                    : "bg-tl-500 dark:bg-tl-400";
                const textTone =
                  stop.state === "past"
                    ? "text-gray-400 dark:text-gray-500 line-through"
                    : stop.state === "current"
                    ? "text-amber-700 dark:text-amber-400 font-semibold"
                    : "text-gray-900 dark:text-gray-100";
                return (
                  <li key={`${stop.code}-${idx}`} className="flex items-start gap-3 relative pb-3">
                    <div className="flex flex-col items-center flex-shrink-0 pt-1">
                      {stop.state === "current" ? (
                        <span className={`w-3 h-3 rounded-full ${dotColor}`} aria-hidden="true" />
                      ) : (
                        <Circle className={`w-3 h-3 ${dotColor} rounded-full`} aria-hidden="true" />
                      )}
                      {!isLast && (
                        <span
                          className="w-px flex-1 mt-1"
                          style={{ minHeight: "20px", background: stop.state === "past" ? "var(--color-tl-200, #e5e7eb)" : "var(--color-tl-300, #cbd5e1)" }}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    <div className="flex-1 flex items-center justify-between gap-3 min-w-0 -mt-0.5">
                      <div className="min-w-0">
                        {stop.href ? (
                          <Link href={stop.href} className={`text-sm hover:underline ${textTone} truncate block`}>
                            {stop.name}
                          </Link>
                        ) : (
                          <span className={`text-sm ${textTone} truncate block`}>{stop.name}</span>
                        )}
                        {stop.state === "current" && (
                          <span className="text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-400 font-semibold">
                            Próxima
                          </span>
                        )}
                      </div>
                      {stop.scheduled && (
                        <span className="font-mono text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                          {stop.scheduled}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-4">
              Horarios programados según la planificación de Renfe. El retraso actual se aplica al
              cómputo aproximado de las paradas restantes.
            </p>
          </section>
        )}

        {/* Cross-links */}
        <section
          aria-label="Otros recursos ferroviarios"
          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6"
        >
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Más sobre la red ferroviaria
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Link
              href="/trenes"
              className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors text-sm"
            >
              <TrainFront className="w-4 h-4 text-tl-600 dark:text-tl-400" />
              Mapa de trenes en vivo
            </Link>
            <Link
              href="/trenes/lineas"
              className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors text-sm"
            >
              <Navigation className="w-4 h-4 text-tl-600 dark:text-tl-400" />
              Líneas ferroviarias
            </Link>
            <Link
              href="/trenes/estaciones"
              className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors text-sm"
            >
              <MapPin className="w-4 h-4 text-tl-600 dark:text-tl-400" />
              Estaciones
            </Link>
          </div>
        </section>

        {/* Attribution */}
        <footer className="flex flex-wrap items-center gap-2 text-xs text-gray-400 dark:text-gray-500 pt-2">
          <TrainFront className="w-4 h-4 flex-shrink-0" />
          <span>
            Datos: visor de Renfe en tiempo real (Largo Recorrido). Actualizado cada 30 segundos.
          </span>
        </footer>
      </main>
    </div>
  );
}
