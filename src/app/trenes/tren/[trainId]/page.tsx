/**
 * /trenes/tren/[trainId] — per-train live entity page
 *
 * Renders TODAY's instance of a specific Renfe long-distance / Avant /
 * Cercanías long-haul train, identified by its `codComercial` (e.g.
 * "03241"). Pulls live position + schedule from the Renfe tiempo-real
 * API on each render (cached 30s via the existing redis client) and
 * cross-links every stop to its station landing page.
 *
 * Enrichments (iter-9):
 * - Full route polyline map (TrainRouteMap)
 * - Stops timeline with state (StopsTimeline)
 * - "Tiempo a la próxima parada" countdown card
 * - "Tiempo al destino final" countdown card
 * - Punctuality stats from RailwayDelaySnapshot (PunctualityStats)
 * - "Velocidad media" from position deltas
 * - "Historial este mes" — last 30 days delay stats from RailwayDailyStats
 *
 * noindex — train IDs are reused daily (not indexable).
 */

import type { Metadata } from "next";
import Link from "next/link";
import dynamicImport from "next/dynamic";
import { prisma } from "@/lib/db";
import redis from "@/lib/redis";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import {
  getTrainBrandPunctuality,
  getFleetPunctuality,
} from "@/lib/transit/punctuality";
import {
  TrainFront,
  Navigation,
  Clock,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Accessibility,
  ExternalLink,
  Gauge,
  CalendarDays,
  TrendingUp,
} from "lucide-react";
import type { PunctualityStatsData } from "@/components/trenes/PunctualityStats";
import type { TimelineStop } from "@/components/trenes/StopsTimeline";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// Revalidate at the same cadence the upstream fleet API publishes
export const revalidate = 30;
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Lazy-loaded client components
// ---------------------------------------------------------------------------

const TrainRouteMap = dynamicImport(() => import("@/components/trenes/TrainRouteMap"), {
  ssr: false,
  loading: () => (
    <div
      className="w-full rounded-xl bg-tl-50 dark:bg-gray-800 animate-pulse"
      style={{ height: 360 }}
      aria-hidden="true"
    />
  ),
});

const StopsTimeline = dynamicImport(() => import("@/components/trenes/StopsTimeline"), {
  ssr: false,
  loading: () => (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-8 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
      ))}
    </div>
  ),
});

const PunctualityStats = dynamicImport(
  () => import("@/components/trenes/PunctualityStats"),
  { ssr: false }
);

// ---------------------------------------------------------------------------
// Renfe data structures
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
  1:  { name: "AVE",           brand: "AVE",         color: "#9b1c2e" },
  2:  { name: "AVE",           brand: "AVE",         color: "#9b1c2e" },
  3:  { name: "Avant",         brand: "Avant",       color: "#1e40af" },
  4:  { name: "Alvia",         brand: "Alvia",       color: "#7c3aed" },
  5:  { name: "Alvia",         brand: "Alvia",       color: "#7c3aed" },
  6:  { name: "Altaria",       brand: "Altaria",     color: "#7c3aed" },
  7:  { name: "Euromed",       brand: "Euromed",     color: "#0891b2" },
  8:  { name: "Trenhotel",     brand: "Trenhotel",   color: "#475569" },
  10: { name: "Talgo",         brand: "Talgo",       color: "#475569" },
  11: { name: "Alvia",         brand: "Alvia",       color: "#7c3aed" },
  12: { name: "AV City",       brand: "AV City",     color: "#9b1c2e" },
  13: { name: "Intercity",     brand: "Intercity",   color: "#0891b2" },
  16: { name: "Media Distancia", brand: "MD",        color: "#0891b2" },
  17: { name: "Regional",      brand: "Regional",    color: "#0891b2" },
  18: { name: "Regional Exprés", brand: "RE",        color: "#0891b2" },
  19: { name: "Intercity",     brand: "Intercity",   color: "#0891b2" },
};

// ---------------------------------------------------------------------------
// Data fetching
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

// Haversine distance in km
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function loadTrain(trainId: string) {
  const cleanId = trainId.trim().toUpperCase();

  const [flota, rutasRaw] = await Promise.all([
    fetchCached<{ fechaActualizacion: string; trenes: RenfeTrain[] }>(
      FLOTA_URL,
      CACHE_KEY_FLOTA,
      "flota"
    ),
    fetchCached<{ trenes?: TrainRoute[] } | TrainRoute[]>(
      RUTAS_URL,
      CACHE_KEY_RUTAS,
      "rutas"
    ),
  ]);

  const train = flota?.trenes?.find((t) => t.codComercial?.toUpperCase() === cleanId) ?? null;
  const rawRoutes = Array.isArray(rutasRaw)
    ? rutasRaw
    : (rutasRaw as { trenes?: TrainRoute[] } | null)?.trenes ?? [];
  const route = rawRoutes.find((r) => r.idTren?.toUpperCase() === cleanId) ?? null;

  // Resolve station codes → DB rows
  const stationCodes = new Set<string>();
  if (train) {
    for (const code of [train.codOrigen, train.codDestino, train.codEstAnt, train.codEstSig]) {
      if (code) stationCodes.add(code);
    }
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
    stationsMap = new Map(
      rows.filter((r) => r.code).map((r) => [r.code!, { code: r.code!, name: r.name, slug: r.slug }])
    );
  }

  // Estimate average speed from sequence + timestamps (current run)
  let estimatedSpeedKmh: number | null = null;
  if (train && route?.secuencia && route.secuencia.length > 1) {
    const seq = route.secuencia;
    let totalKm = 0;
    for (let i = 1; i < seq.length; i++) {
      totalKm += haversineKm(seq[i - 1].lat, seq[i - 1].lon, seq[i].lat, seq[i].lon);
    }
    // Estimate travel time from first to last scheduled stop
    if (route.estaciones.length >= 2) {
      const firstTime = route.estaciones[0].h;
      const lastTime = route.estaciones[route.estaciones.length - 1].h;
      if (firstTime && lastTime) {
        const toMin = (t: string) => {
          const [h, m] = t.split(":").map(Number);
          return h * 60 + (m || 0);
        };
        const diffMin = toMin(lastTime) - toMin(firstTime);
        if (diffMin > 0) {
          estimatedSpeedKmh = Math.round((totalKm / diffMin) * 60);
        }
      }
    }
  }

  return {
    cleanId,
    train,
    route,
    stationsMap,
    fechaActualizacion: flota?.fechaActualizacion ?? null,
    isLiveAvailable: flota !== null,
    estimatedSpeedKmh,
  };
}

function stationLink(
  code: string,
  map: Map<string, { code: string; name: string; slug: string | null }>
) {
  const s = map.get(code);
  if (!s) return { name: code, href: null as string | null };
  if (s.slug) return { name: s.name, href: `/trenes/estacion/${s.slug}` };
  return { name: s.name, href: null };
}

// ETA from scheduled time string (HH:MM) adjusted by delay minutes
function computeEtaMinutes(scheduledHHMM: string, delayMin: number): number | null {
  if (!scheduledHHMM) return null;
  const [hStr, mStr] = scheduledHHMM.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return null;
  const now = new Date();
  const targetMin = h * 60 + m + delayMin;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return targetMin - nowMin;
}

// ---------------------------------------------------------------------------
// Monthly history from RailwayDailyStats
// ---------------------------------------------------------------------------

async function loadMonthlyHistory() {
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const rows = await prisma.railwayDailyStats.findMany({
    where: { date: { gte: since } },
    orderBy: { date: "asc" },
    select: {
      date: true,
      avgDelay: true,
      maxDelay: true,
      punctualityRate: true,
      totalAlerts: true,
    },
  });
  return rows;
}

// ---------------------------------------------------------------------------
// Metadata — noindex
// ---------------------------------------------------------------------------

export async function generateMetadata(
  { params }: { params: Promise<{ trainId: string }> }
): Promise<Metadata> {
  const { trainId } = await params;
  const cleanId = trainId.trim().toUpperCase();
  return {
    title: `Tren ${cleanId} en vivo — Posición, recorrido y puntualidad`,
    description: `Posición en tiempo real del tren Renfe ${cleanId}: recorrido en mapa, paradas con ETAs, retraso actual y estadísticas de puntualidad de los últimos 30 días.`,
    alternates: { canonical: `${BASE_URL}/trenes/tren/${encodeURIComponent(cleanId)}` },
    robots: { index: false, follow: true },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function TrainEntityPage(
  { params }: { params: Promise<{ trainId: string }> }
) {
  const { trainId } = await params;
  const {
    cleanId,
    train,
    route,
    stationsMap,
    fechaActualizacion,
    isLiveAvailable,
    estimatedSpeedKmh,
  } = await loadTrain(trainId);

  const product = train
    ? PRODUCT_TYPES[train.codProduct] ?? { name: `Tipo ${train.codProduct}`, brand: "Renfe", color: "#475569" }
    : null;
  const delay = train ? parseInt(train.ultRetraso, 10) || 0 : 0;
  const delayTier =
    delay <= 0 ? "on-time" : delay <= 5 ? "slight" : delay <= 15 ? "moderate" : "severe";

  // Build timeline of stops
  const timeline: TimelineStop[] = [];
  if (route?.estaciones && train) {
    let reachedNext = false;
    for (let i = 0; i < route.estaciones.length; i++) {
      const s = route.estaciones[i];
      const link = stationLink(s.p, stationsMap);
      let state: TimelineStop["state"];
      if (reachedNext) {
        state = "future";
      } else if (s.p === train.codEstSig) {
        state = "current";
        reachedNext = true;
      } else {
        state = "past";
      }
      timeline.push({
        id: `${s.p}-${i}`,
        name: link.name,
        href: link.href,
        scheduledTime: s.h ?? null,
        state,
        isFirst: i === 0,
        isLast: i === route.estaciones.length - 1,
      });
    }
  } else if (route?.estaciones) {
    for (let i = 0; i < route.estaciones.length; i++) {
      const s = route.estaciones[i];
      const link = stationLink(s.p, stationsMap);
      timeline.push({
        id: `${s.p}-${i}`,
        name: link.name,
        href: link.href,
        scheduledTime: s.h ?? null,
        state: "future",
        isFirst: i === 0,
        isLast: i === route.estaciones.length - 1,
      });
    }
  }

  const origin = train ? stationLink(train.codOrigen, stationsMap) : null;
  const destination = train ? stationLink(train.codDestino, stationsMap) : null;
  const prev = train ? stationLink(train.codEstAnt, stationsMap) : null;
  const next = train ? stationLink(train.codEstSig, stationsMap) : null;

  // ETA for next stop and final destination
  const nextStopEta = train?.horaLlegadaSigEst
    ? computeEtaMinutes(train.horaLlegadaSigEst, 0)
    : null;

  const destStop = route?.estaciones[route.estaciones.length - 1];
  const finalEta = destStop?.h ? computeEtaMinutes(destStop.h, delay) : null;

  const mapsViewUrl = train
    ? `https://www.google.com/maps/search/?api=1&query=${train.latitud},${train.longitud}`
    : null;

  // Punctuality stats — prefer brand-specific if product is known
  let punctualityStats: PunctualityStatsData | null = null;
  if (product) {
    punctualityStats = await getTrainBrandPunctuality(product.brand, 30);
  }
  if (!punctualityStats) {
    punctualityStats = await getFleetPunctuality(30);
  }

  // Monthly history (last 30 days)
  const monthlyHistory = await loadMonthlyHistory();

  // Recharts data — daily avg delay for chart
  const chartData = monthlyHistory.map((d) => ({
    label: new Date(d.date).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" }),
    value: Number(d.avgDelay),
  }));

  const productColor = product?.color ?? "#1e40af";

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
          background: `linear-gradient(135deg, #0f172a 0%, ${productColor}dd 100%)`,
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
                      <>
                        Entre{" "}
                        <span className="font-medium text-gray-700 dark:text-gray-300">{prev.name}</span>{" "}
                        y{" "}
                        <span className="font-medium text-gray-700 dark:text-gray-300">{next.name}</span>
                      </>
                    )}
                    {fechaActualizacion && (
                      <span className="ml-2 font-mono">
                        · Datos:{" "}
                        {new Date(fechaActualizacion).toLocaleTimeString("es-ES", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
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
                    {next.href ? (
                      <Link href={next.href} className="hover:underline">
                        {next.name}
                      </Link>
                    ) : (
                      next.name
                    )}
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
                ? `El código ${cleanId} no aparece en la lista actual de Renfe. Puede haber finalizado su recorrido o circular en días específicos.`
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

        {/* ETA countdown cards */}
        {train && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tiempo a la próxima parada */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Tiempo a la próxima parada
              </p>
              {next ? (
                <>
                  <p className="font-heading font-bold text-2xl text-gray-900 dark:text-gray-100">
                    {next.href ? (
                      <Link href={next.href} className="hover:underline">
                        {next.name}
                      </Link>
                    ) : (
                      next.name
                    )}
                  </p>
                  <p className="mt-1 font-mono text-3xl font-bold text-tl-600 dark:text-tl-400">
                    {nextStopEta !== null
                      ? nextStopEta <= 0
                        ? "Llegando"
                        : `${nextStopEta} min`
                      : train.horaLlegadaSigEst || "—"}
                  </p>
                  {delay > 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      +{delay} min de retraso incluido
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Sin datos</p>
              )}
            </div>

            {/* Tiempo al destino final */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                Tiempo al destino final
              </p>
              {destination ? (
                <>
                  <p className="font-heading font-bold text-2xl text-gray-900 dark:text-gray-100">
                    {destination.href ? (
                      <Link href={destination.href} className="hover:underline">
                        {destination.name}
                      </Link>
                    ) : (
                      destination.name
                    )}
                  </p>
                  <p className="mt-1 font-mono text-3xl font-bold text-tl-600 dark:text-tl-400">
                    {finalEta !== null
                      ? finalEta <= 0
                        ? "Ha llegado"
                        : `${finalEta} min`
                      : destStop?.h || "—"}
                  </p>
                  {delay > 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Llegada estimada: {destStop?.h}
                      {delay > 0 ? ` (+${delay} min)` : ""}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Sin datos</p>
              )}
            </div>
          </div>
        )}

        {/* Route map */}
        {train && route?.secuencia && route.secuencia.length > 0 && (
          <section
            aria-label="Mapa del recorrido"
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6"
          >
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-tl-600 dark:text-tl-400" />
              Recorrido en mapa
            </h2>
            <TrainRouteMap
              sequence={route.secuencia}
              stops={timeline.map((t) => ({
                code: t.id.split("-")[0],
                name: t.name,
                state: t.state as "past" | "current" | "future",
              }))}
              trainLat={train.latitud}
              trainLon={train.longitud}
              productColor={productColor}
            />
          </section>
        )}

        {/* Position details + speed */}
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
              {estimatedSpeedKmh !== null && (
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5 flex items-center gap-1">
                    <Gauge className="w-3 h-3" />
                    Velocidad media
                  </dt>
                  <dd className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                    {estimatedSpeedKmh} km/h
                  </dd>
                </div>
              )}
            </dl>
          </section>
        )}

        {/* Stops timeline */}
        {timeline.length > 0 && (
          <section
            aria-label="Trayecto completo"
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6"
          >
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-tl-600 dark:text-tl-400" />
              Trayecto completo
              <span className="text-xs font-mono bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full px-2 py-0.5">
                {timeline.length} paradas
              </span>
            </h2>
            <StopsTimeline
              stops={timeline}
              maxVisible={train ? undefined : 20}
            />
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-4">
              Horarios programados según la planificación de Renfe. El retraso actual se aplica
              al cómputo aproximado de las paradas restantes.
            </p>
          </section>
        )}

        {/* Punctuality stats */}
        {punctualityStats && (
          <section
            aria-label="Estadísticas de puntualidad"
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6"
          >
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-tl-600 dark:text-tl-400" />
              Puntualidad
              {product && (
                <span className="text-xs font-mono bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full px-2 py-0.5">
                  {product.brand} · últimos 30 días
                </span>
              )}
            </h2>
            <PunctualityStats
              stats={punctualityStats}
              mode="train"
              chartData={chartData.length > 0 ? chartData : undefined}
            />
          </section>
        )}

        {/* Monthly history table */}
        {monthlyHistory.length > 0 && (
          <section
            aria-label="Historial este mes"
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6"
          >
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-tl-600 dark:text-tl-400" />
              Historial este mes
            </h2>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm text-left min-w-[520px]">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="pb-2 pr-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Fecha
                    </th>
                    <th className="pb-2 pr-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-right">
                      Retraso medio
                    </th>
                    <th className="pb-2 pr-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-right">
                      Retraso máx.
                    </th>
                    <th className="pb-2 pr-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-right">
                      Puntualidad
                    </th>
                    <th className="pb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-right">
                      Alertas
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                  {monthlyHistory.slice(-14).reverse().map((row) => {
                    const avgD = Number(row.avgDelay);
                    const pct = Number(row.punctualityRate);
                    return (
                      <tr
                        key={row.date.toISOString()}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                      >
                        <td className="py-2 pr-4 font-mono text-gray-700 dark:text-gray-300">
                          {new Date(row.date).toLocaleDateString("es-ES", {
                            weekday: "short",
                            day: "2-digit",
                            month: "2-digit",
                          })}
                        </td>
                        <td className="py-2 pr-4 font-mono text-right">
                          <span
                            className={
                              avgD <= 2
                                ? "text-green-600 dark:text-green-400"
                                : avgD <= 8
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-red-600 dark:text-red-400"
                            }
                          >
                            {avgD.toFixed(1)} min
                          </span>
                        </td>
                        <td className="py-2 pr-4 font-mono text-right text-gray-600 dark:text-gray-400">
                          {row.maxDelay} min
                        </td>
                        <td className="py-2 pr-4 font-mono text-right">
                          <span
                            className={
                              pct >= 80
                                ? "text-green-600 dark:text-green-400"
                                : pct >= 60
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-red-600 dark:text-red-400"
                            }
                          >
                            {pct.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2 font-mono text-right text-gray-600 dark:text-gray-400">
                          {row.totalAlerts}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-3">
              Datos agregados de todos los trenes Renfe en circulación. Actualización diaria.
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
            Datos: visor de Renfe en tiempo real (Largo Recorrido) + estadísticas fleet Renfe.
            Actualizado cada 30 segundos. Fuente: Renfe, DGT.
          </span>
        </footer>
      </main>
    </div>
  );
}
