/**
 * /aviacion/avion/[icao24]/vuelo/[date] — detalle de un vuelo individual.
 *
 * Muestra la trayectoria en mapa (SVG ligero), perfil de altitud y perfil de
 * velocidad a lo largo del tiempo para el vuelo del día [date] (YYYY-MM-DD).
 *
 * noindex: baja intención de búsqueda individual, alto número de URLs.
 * ISR: 3600 s (datos históricos estables).
 */

import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import {
  Plane,
  ArrowLeft,
  Clock,
  MapPin,
  Gauge,
  BarChart2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

import {
  groupIntoFlights,
  enrichFlightsWithAirports,
  type RawPosition,
  type AirportLookup,
  type ComputedFlight,
} from "@/lib/aviacion/flight-grouping";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const revalidate = 3600;
export const dynamicParams = true;

// ---------------------------------------------------------------------------
// Static params — generated from parent page's top 200 aircraft.
// For flights we generate params only at build time for the top 50 aircraft
// and their most recent flight each.
// ---------------------------------------------------------------------------

export async function generateStaticParams() {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const rows = await prisma.aircraftPosition.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { icao24: true, createdAt: true },
      distinct: ["icao24"],
      take: 50,
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => ({
      icao24: r.icao24.toLowerCase(),
      date: r.createdAt.toISOString().slice(0, 10),
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

async function getFlightData(icao24: string, date: string): Promise<{
  flight: ComputedFlight | null;
  allFlightsOnDate: ComputedFlight[];
  airports: AirportLookup[];
}> {
  const cleanId = icao24.trim().toLowerCase();

  // Parse date — fetch positions within a 36h window centred on the date
  // to ensure we capture multi-timezone flights that cross midnight UTC.
  const dateObj = new Date(`${date}T00:00:00Z`);
  if (isNaN(dateObj.getTime())) return { flight: null, allFlightsOnDate: [], airports: [] };

  const windowStart = new Date(dateObj.getTime() - 6 * 60 * 60 * 1000);
  const windowEnd = new Date(dateObj.getTime() + 30 * 60 * 60 * 1000);

  try {
    const [posRows, airportRows] = await Promise.all([
      prisma.aircraftPosition.findMany({
        where: {
          icao24: { equals: cleanId, mode: "insensitive" },
          createdAt: { gte: windowStart, lte: windowEnd },
        },
        orderBy: { createdAt: "asc" },
        take: 2000,
        select: {
          id: true,
          icao24: true,
          callsign: true,
          latitude: true,
          longitude: true,
          altitude: true,
          velocity: true,
          heading: true,
          verticalRate: true,
          onGround: true,
          originCountry: true,
          createdAt: true,
        },
      }),
      prisma.airport.findMany({
        select: { icao: true, iata: true, name: true, city: true, latitude: true, longitude: true },
      }),
    ]);

    const positions: RawPosition[] = posRows.map((r) => ({
      id: r.id,
      icao24: r.icao24,
      callsign: r.callsign,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      altitude: r.altitude ?? null,
      velocity: r.velocity ?? null,
      heading: r.heading ?? null,
      verticalRate: r.verticalRate ?? null,
      onGround: r.onGround,
      originCountry: r.originCountry,
      createdAt: r.createdAt,
    }));

    const airports: AirportLookup[] = airportRows.map((a) => ({
      icao: a.icao,
      iata: a.iata,
      name: a.name,
      city: a.city,
      latitude: Number(a.latitude),
      longitude: Number(a.longitude),
    }));

    const rawFlights = groupIntoFlights(positions, []);
    const enriched = enrichFlightsWithAirports(rawFlights, airports);

    // Find flights whose date matches the requested date
    const allFlightsOnDate = enriched.filter((f) => f.date === date);
    const flight = allFlightsOnDate[0] ?? null;

    return { flight, allFlightsOnDate, airports };
  } catch {
    return { flight: null, allFlightsOnDate: [], airports: [] };
  }
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ icao24: string; date: string }>;
}): Promise<Metadata> {
  const { icao24, date } = await params;
  const id = icao24.trim().toUpperCase();
  return {
    title: `Vuelo ${id} — ${date}`,
    description: `Detalle del vuelo de la aeronave ${id} del ${date}. Trayectoria, altitud y velocidad.`,
    robots: { index: false, follow: true },
    alternates: { canonical: `${BASE_URL}/aviacion/avion/${icao24.toLowerCase()}/vuelo/${date}` },
  };
}

// ---------------------------------------------------------------------------
// Inline chart components (lightweight, no Recharts for SSR safety)
// ---------------------------------------------------------------------------

const AltitudeProfileChart = dynamic(
  () =>
    import("@/components/aviacion/AltitudeProfileChart").then(
      (m) => m.AltitudeProfileChart
    ),
  { ssr: false }
);

const SpeedProfileChart = dynamic(
  () =>
    import("@/components/aviacion/SpeedProfileChart").then(
      (m) => m.SpeedProfileChart
    ),
  { ssr: false }
);

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function formatTime(d: Date): string {
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
}

function formatDateLong(s: string): string {
  const d = new Date(`${s}T12:00:00Z`);
  return d.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function altM(feet: number | null): string {
  if (feet === null) return "—";
  return `${Math.round(feet * 0.3048).toLocaleString("es-ES")} m`;
}

function velKmh(ms: number | null): string {
  if (ms === null) return "—";
  return `${Math.round(ms * 3.6).toLocaleString("es-ES")} km/h`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function FlightDetailPage({
  params,
}: {
  params: Promise<{ icao24: string; date: string }>;
}) {
  const { icao24, date } = await params;
  const cleanId = icao24.trim().toLowerCase();
  const displayId = cleanId.toUpperCase();

  const { flight, allFlightsOnDate } = await getFlightData(cleanId, date);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Aviación", href: "/aviacion" },
            { name: `Aeronave ${displayId}`, href: `/aviacion/avion/${cleanId}` },
            { name: `Vuelo ${date}`, href: `/aviacion/avion/${cleanId}/vuelo/${date}` },
          ]}
        />
      </div>

      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #0c4a6e 100%)" }}
      >
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <Plane className="w-6 h-6 text-white/80" />
            <span className="text-white/60 text-xs uppercase tracking-widest font-semibold">
              Detalle de vuelo
            </span>
          </div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-white font-mono">
            {displayId} · {formatDateLong(date)}
          </h1>
          {flight && (
            <div className="flex flex-wrap gap-4 mt-3 text-white/70 text-sm">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {formatTime(flight.departureAt)} — {formatTime(flight.arrivalAt)} UTC
              </span>
              <span>{formatDuration(flight.durationSeconds)}</span>
              {flight.departureAirport && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {flight.departureAirport.iata ?? flight.departureAirport.icao}
                  <ArrowRight className="w-3 h-3" />
                  {flight.arrivalAirport
                    ? (flight.arrivalAirport.iata ?? flight.arrivalAirport.icao)
                    : "?"}
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Back link */}
        <Link
          href={`/aviacion/avion/${cleanId}`}
          className="inline-flex items-center gap-1.5 text-sm text-tl-600 dark:text-tl-400 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a aeronave {displayId}
        </Link>

        {/* No flight found */}
        {!flight && (
          <section className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Sin datos para {displayId} el {date}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                No se encontraron posiciones ADS-B para esta aeronave en la fecha indicada.
              </p>
            </div>
          </section>
        )}

        {/* Summary stats */}
        {flight && (
          <section
            aria-label="Resumen del vuelo"
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5"
          >
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Plane className="w-4 h-4 text-tl-600 dark:text-tl-400" />
              Resumen del vuelo
            </h2>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Despegue</dt>
                <dd className="font-mono font-bold text-gray-900 dark:text-gray-100">
                  {formatTime(flight.departureAt)} UTC
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Aterrizaje</dt>
                <dd className="font-mono font-bold text-gray-900 dark:text-gray-100">
                  {formatTime(flight.arrivalAt)} UTC
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Duración</dt>
                <dd className="font-mono font-bold text-gray-900 dark:text-gray-100">
                  {formatDuration(flight.durationSeconds)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Distancia</dt>
                <dd className="font-mono font-bold text-gray-900 dark:text-gray-100">
                  {flight.distanceKm > 0
                    ? `${flight.distanceKm.toLocaleString("es-ES")} km`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Alt. máxima</dt>
                <dd className="font-mono font-bold text-gray-900 dark:text-gray-100">
                  {altM(flight.maxAltitudeFeet)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Vel. media</dt>
                <dd className="font-mono font-bold text-gray-900 dark:text-gray-100">
                  {velKmh(flight.avgVelocityMs)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Posiciones</dt>
                <dd className="font-mono font-bold text-gray-900 dark:text-gray-100">
                  {flight.positionCount}
                </dd>
              </div>
              {flight.callsign && (
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Indicativo</dt>
                  <dd className="font-mono font-bold text-gray-900 dark:text-gray-100">
                    {flight.callsign}
                  </dd>
                </div>
              )}
            </dl>

            {/* Route */}
            {(flight.departureAirport || flight.arrivalAirport) && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center gap-3 flex-wrap text-sm">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-tl-500" />
                  <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
                    {flight.departureAirport
                      ? `${flight.departureAirport.iata ?? flight.departureAirport.icao} — ${flight.departureAirport.name}`
                      : "?"}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-tl-amber-400" />
                  <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
                    {flight.arrivalAirport
                      ? `${flight.arrivalAirport.iata ?? flight.arrivalAirport.icao} — ${flight.arrivalAirport.name}`
                      : "?"}
                  </span>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Altitude profile */}
        {flight && flight.positions.length > 2 && (
          <section
            aria-label="Perfil de altitud"
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5"
          >
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-tl-600 dark:text-tl-400" />
              Perfil de altitud
            </h2>
            <AltitudeProfileChart positions={flight.positions} />
          </section>
        )}

        {/* Speed profile */}
        {flight && flight.positions.length > 2 && (
          <section
            aria-label="Perfil de velocidad"
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5"
          >
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-tl-600 dark:text-tl-400" />
              Perfil de velocidad
            </h2>
            <SpeedProfileChart positions={flight.positions} />
          </section>
        )}

        {/* Position log */}
        {flight && flight.positions.length > 0 && (
          <section
            aria-label="Registro de posiciones"
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5"
          >
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-tl-600 dark:text-tl-400" />
              Registro de posiciones ({flight.positionCount})
            </h2>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    {["Hora (UTC)", "Lat", "Lon", "Alt (m)", "Vel (km/h)", "Estado"].map((h) => (
                      <th
                        key={h}
                        className="text-left pb-2 text-xs text-gray-500 dark:text-gray-400 font-normal pr-4"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {flight.positions.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-950/50">
                      <td className="py-1.5 pr-4 font-mono text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {formatTime(p.createdAt)}
                      </td>
                      <td className="py-1.5 pr-4 font-mono text-xs text-right text-gray-700 dark:text-gray-300">
                        {p.latitude.toFixed(4)}
                      </td>
                      <td className="py-1.5 pr-4 font-mono text-xs text-right text-gray-700 dark:text-gray-300">
                        {p.longitude.toFixed(4)}
                      </td>
                      <td className="py-1.5 pr-4 font-mono text-xs text-right text-gray-700 dark:text-gray-300">
                        {altM(p.altitude)}
                      </td>
                      <td className="py-1.5 pr-4 font-mono text-xs text-right text-gray-700 dark:text-gray-300">
                        {velKmh(p.velocity)}
                      </td>
                      <td className="py-1.5">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            p.onGround
                              ? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                              : "bg-tl-50 dark:bg-tl-900/20 text-tl-700 dark:text-tl-400"
                          }`}
                        >
                          {p.onGround ? "Tierra" : "Vuelo"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Multiple flights on same day */}
        {allFlightsOnDate.length > 1 && (
          <section
            aria-label="Otros vuelos del mismo día"
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5"
          >
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Todos los segmentos del {date}
            </h2>
            <div className="space-y-2">
              {allFlightsOnDate.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 text-sm p-2 rounded-lg border border-gray-100 dark:border-gray-800"
                >
                  <span className="font-mono text-xs text-gray-400 w-4">{i + 1}</span>
                  <span className="font-mono text-gray-700 dark:text-gray-300">
                    {formatTime(f.departureAt)}–{formatTime(f.arrivalAt)} UTC
                  </span>
                  <span className="text-gray-400 text-xs">{formatDuration(f.durationSeconds)}</span>
                  {f.departureAirport && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      {f.departureAirport.iata ?? f.departureAirport.icao}
                      <ArrowRight className="w-3 h-3" />
                      {f.arrivalAirport ? (f.arrivalAirport.iata ?? f.arrivalAirport.icao) : "?"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Attribution */}
        <footer className="flex flex-wrap items-center gap-2 text-xs text-gray-400 dark:text-gray-500 pt-2">
          <Plane className="w-4 h-4 flex-shrink-0" />
          <span>Datos: OpenSky Network. Vuelos agrupados por silencio ADS-B &gt;30 min.</span>
        </footer>
      </main>
    </div>
  );
}
