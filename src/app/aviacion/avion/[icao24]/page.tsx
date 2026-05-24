/**
 * /aviacion/avion/[icao24] — página definitiva de aeronave individual.
 *
 * Muestra historial completo de posiciones, vuelos computados, aeropuertos
 * visitados, patrones de horario, histograma de altitudes, velocidades por
 * fase y rutas frecuentes con puntuación de predecibilidad.
 *
 * Datos: AircraftPosition (TimescaleDB, hasta 30d de historia), Airport (AENA).
 * Fuente: OpenSky Network · Revalidación ISR: 60 s.
 */

import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import {
  Plane,
  AlertTriangle,
  MapPin,
  Clock,
  BarChart2,
  TrendingUp,
  Calendar,
  Route,
  Gauge,
} from "lucide-react";

import {
  groupIntoFlights,
  enrichFlightsWithAirports,
  aggregateAirportVisits,
  computeFrequentRoutes,
  computeFlightPatternHeatmap,
  computeAltitudeHistogram,
  computeSpeedByPhase,
  computeAircraftSummary,
  type RawPosition,
  type AirportLookup,
} from "@/lib/aviacion/flight-grouping";
import { lookupIcaoCountry } from "@/lib/aviacion/icao-lookup";

// Client components loaded dynamically (charts need browser)
const AircraftHero = dynamic(
  () => import("@/components/aviacion/AircraftHero").then((m) => m.AircraftHero),
  { ssr: false }
);
const FlightTable = dynamic(
  () => import("@/components/aviacion/FlightTable").then((m) => m.FlightTable),
  { ssr: false }
);
const AirportVisits = dynamic(
  () => import("@/components/aviacion/AirportVisits").then((m) => m.AirportVisits),
  { ssr: false }
);
const FlightPatternHeatmap = dynamic(
  () =>
    import("@/components/aviacion/FlightPatternHeatmap").then(
      (m) => m.FlightPatternHeatmap
    ),
  { ssr: false }
);
const AltitudeHistogram = dynamic(
  () =>
    import("@/components/aviacion/AltitudeHistogram").then(
      (m) => m.AltitudeHistogram
    ),
  { ssr: false }
);
const SpeedPhaseChart = dynamic(
  () =>
    import("@/components/aviacion/SpeedPhaseChart").then((m) => m.SpeedPhaseChart),
  { ssr: false }
);
const FrequentRoutes = dynamic(
  () =>
    import("@/components/aviacion/FrequentRoutes").then((m) => m.FrequentRoutes),
  { ssr: false }
);

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const revalidate = 60;
export const dynamicParams = true;

// ---------------------------------------------------------------------------
// generateStaticParams — top 200 aeronaves más activas
// ---------------------------------------------------------------------------

export async function generateStaticParams() {
  try {
    const rows = await prisma.aircraftPosition.findMany({
      select: { icao24: true },
      distinct: ["icao24"],
      take: 200,
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => ({ icao24: r.icao24.toLowerCase() }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getAircraftData(icao24: string): Promise<{
  positions: RawPosition[];
  latest: RawPosition | null;
  airports: AirportLookup[];
}> {
  const cleanId = icao24.trim().toLowerCase();
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  try {
    const [posRows, airportRows] = await Promise.all([
      prisma.aircraftPosition.findMany({
        where: {
          icao24: { equals: cleanId, mode: "insensitive" },
          createdAt: { gte: since30d },
        },
        orderBy: { createdAt: "desc" },
        // 30 days × 96 pings/day (every 15min) = ~2880; take generous cap
        take: 5000,
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
        select: {
          icao: true,
          iata: true,
          name: true,
          city: true,
          latitude: true,
          longitude: true,
        },
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

    return {
      positions,
      latest: positions[0] ?? null, // most recent first
      airports,
    };
  } catch {
    return { positions: [], latest: null, airports: [] };
  }
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ icao24: string }>;
}): Promise<Metadata> {
  const { icao24 } = await params;
  const id = icao24.trim().toUpperCase();
  const countryInfo = lookupIcaoCountry(icao24);
  const countryStr = countryInfo ? ` · ${countryInfo.country}` : "";

  return {
    title: `Aeronave ${id}${countryStr} — Historial de vuelos, rutas y estadísticas`,
    description: `Historial completo de la aeronave ${id}. Vuelos, aeropuertos visitados, patrones de horario, altitudes y rutas frecuentes. Datos ADS-B de OpenSky Network.`,
    alternates: { canonical: `${BASE_URL}/aviacion/avion/${icao24.toLowerCase()}` },
    robots: { index: true, follow: true },
  };
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function Section({
  title,
  icon,
  children,
  id,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      aria-label={title}
      className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6"
    >
      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AircraftEntityPage({
  params,
}: {
  params: Promise<{ icao24: string }>;
}) {
  const { icao24 } = await params;
  const cleanId = icao24.trim().toLowerCase();
  const displayId = cleanId.toUpperCase();

  const { positions, latest, airports } = await getAircraftData(cleanId);

  // Compute derived data
  const rawFlights = groupIntoFlights(positions, []);
  const enrichedFlights = enrichFlightsWithAirports(rawFlights, airports);
  const recentFlights = enrichedFlights.slice(0, 30);

  const airportVisits = aggregateAirportVisits(enrichedFlights);
  const frequentRoutes = computeFrequentRoutes(enrichedFlights);
  const heatmapCells = computeFlightPatternHeatmap(enrichedFlights);
  const altBins = computeAltitudeHistogram(positions);
  const speedPhases = computeSpeedByPhase(positions);
  const summary = computeAircraftSummary(enrichedFlights, positions);

  const countryInfo = lookupIcaoCountry(cleanId);
  const callsign = latest?.callsign?.trim() ?? null;

  // 24h trail for hero map
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const trail = positions.filter((p) => p.createdAt >= since24h);

  // JSON-LD — Vehicle + ItemList of recent flights
  const vehicleSchema = {
    "@context": "https://schema.org",
    "@type": "Vehicle",
    vehicleIdentificationNumber: displayId,
    name: callsign ? `${callsign} (${displayId})` : `Aeronave ${displayId}`,
    description: `Aeronave ${displayId}${countryInfo ? ` registrada en ${countryInfo.country}` : ""}. Datos ADS-B de OpenSky Network.`,
    ...(countryInfo ? { manufacturer: countryInfo.country } : {}),
    ...(latest
      ? {
          location: {
            "@type": "GeoCoordinates",
            latitude: latest.latitude,
            longitude: latest.longitude,
          },
        }
      : {}),
    url: `${BASE_URL}/aviacion/avion/${cleanId}`,
  };

  const flightListSchema =
    recentFlights.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `Vuelos recientes de ${displayId}`,
          numberOfItems: recentFlights.length,
          itemListElement: recentFlights.slice(0, 10).map((f, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "Trip",
              name: `Vuelo ${displayId} ${f.date}`,
              identifier: `${cleanId}-${f.date}`,
              departureTime: f.departureAt.toISOString(),
              arrivalTime: f.arrivalAt.toISOString(),
              url: `${BASE_URL}/aviacion/avion/${cleanId}/vuelo/${f.date}`,
            },
          })),
        }
      : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <StructuredData data={vehicleSchema} />
      {flightListSchema && <StructuredData data={flightListSchema} />}

      {/* Breadcrumbs */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Aviación", href: "/aviacion" },
            { name: `Aeronave ${displayId}`, href: `/aviacion/avion/${cleanId}` },
          ]}
        />
      </div>

      {/* Hero band */}
      <section
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #0c4a6e 100%)" }}
      >
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <Plane className="w-7 h-7 text-white/90" />
            <span className="font-heading text-white/70 text-xs font-semibold uppercase tracking-widest">
              OpenSky · ICAO24
            </span>
            {countryInfo && (
              <span className="text-white/60 text-xs">
                {countryInfo.flag} {countryInfo.country}
              </span>
            )}
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-white font-mono leading-tight">
            Aeronave {displayId}
          </h1>
          {callsign && (
            <p className="mt-1 text-white/70 text-sm font-mono">{callsign}</p>
          )}
          {summary.totalFlights > 0 && (
            <p className="mt-2 text-white/60 text-sm">
              {summary.totalFlights} vuelos registrados ·{" "}
              {summary.totalDistanceKm.toLocaleString("es-ES")} km volados ·{" "}
              {summary.daysTracked} días con datos
            </p>
          )}
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* No data */}
        {!latest && (
          <section className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Sin datos para {displayId}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Esta aeronave no ha sido detectada sobre España en los últimos 30 días.
                El código ICAO24 puede no estar activo o volar fuera de cobertura ADS-B.
              </p>
              <Link
                href="/aviacion"
                className="inline-flex items-center gap-1.5 mt-3 text-sm text-tl-600 dark:text-tl-400 hover:underline"
              >
                <Plane className="w-4 h-4" />
                Ver aeronaves en vivo
              </Link>
            </div>
          </section>
        )}

        {/* Hero (current position + stats strip) */}
        {latest && (
          <AircraftHero
            icao24={cleanId}
            displayId={displayId}
            latest={latest}
            trail={trail}
            summary={summary}
            countryInfo={countryInfo}
          />
        )}

        {/* Vuelos recientes */}
        {recentFlights.length > 0 && (
          <Section
            id="vuelos-recientes"
            title={`Vuelos recientes (${recentFlights.length})`}
            icon={<Plane className="w-4 h-4 text-tl-600 dark:text-tl-400" />}
          >
            <FlightTable flights={recentFlights} icao24={cleanId} />
          </Section>
        )}

        {/* Aeropuertos visitados */}
        {airportVisits.length > 0 && (
          <Section
            id="aeropuertos-visitados"
            title="Aeropuertos visitados"
            icon={<MapPin className="w-4 h-4 text-tl-600 dark:text-tl-400" />}
          >
            <AirportVisits visits={airportVisits} />
          </Section>
        )}

        {/* Two-column: Heatmap + Altitude histogram */}
        {(enrichedFlights.length > 0 || altBins.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {enrichedFlights.length > 0 && (
              <Section
                id="patrones-vuelo"
                title="Patrones de vuelo"
                icon={<Calendar className="w-4 h-4 text-tl-600 dark:text-tl-400" />}
              >
                <FlightPatternHeatmap cells={heatmapCells} />
              </Section>
            )}
            {altBins.length > 0 && (
              <Section
                id="histograma-altitud"
                title="Histograma de altitud"
                icon={<BarChart2 className="w-4 h-4 text-tl-600 dark:text-tl-400" />}
              >
                <AltitudeHistogram bins={altBins} />
              </Section>
            )}
          </div>
        )}

        {/* Two-column: Speed phases + Frequent routes */}
        {(speedPhases.length > 0 || frequentRoutes.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {speedPhases.length > 0 && (
              <Section
                id="velocidad-por-fase"
                title="Velocidad por fase"
                icon={<Gauge className="w-4 h-4 text-tl-600 dark:text-tl-400" />}
              >
                <SpeedPhaseChart phases={speedPhases} />
              </Section>
            )}
            {frequentRoutes.length > 0 && (
              <Section
                id="rutas-frecuentes"
                title="Rutas frecuentes"
                icon={<Route className="w-4 h-4 text-tl-600 dark:text-tl-400" />}
              >
                <div className="space-y-3">
                  {frequentRoutes.map((r, i) => (
                    <div
                      key={`${r.departure.icao}-${r.arrival.icao}`}
                      className="flex items-center gap-3 text-sm"
                    >
                      <span className="font-mono text-xs text-gray-400 w-4">{i + 1}.</span>
                      <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
                        {r.departure.iata ?? r.departure.icao}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
                        {r.arrival.iata ?? r.arrival.icao}
                      </span>
                      <span className="ml-auto font-mono text-xs text-tl-600 dark:text-tl-400">
                        {r.count}×
                      </span>
                      <span className="text-xs text-gray-400 hidden sm:block">
                        Pred. {r.predictabilityScore}/100
                      </span>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}

        {/* Rutas frecuentes detalladas */}
        {frequentRoutes.length > 0 && (
          <Section
            id="rutas-detalle"
            title="Análisis de rutas y predecibilidad"
            icon={<TrendingUp className="w-4 h-4 text-tl-600 dark:text-tl-400" />}
          >
            <FrequentRoutes routes={frequentRoutes} />
          </Section>
        )}

        {/* Tiempo de actividad / últimos datos */}
        {positions.length > 0 && (
          <Section
            id="actividad"
            title="Registro de actividad"
            icon={<Clock className="w-4 h-4 text-tl-600 dark:text-tl-400" />}
          >
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Posiciones totales</dt>
                <dd className="font-mono font-bold text-gray-900 dark:text-gray-100">
                  {positions.length.toLocaleString("es-ES")}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Vuelos computados</dt>
                <dd className="font-mono font-bold text-gray-900 dark:text-gray-100">
                  {enrichedFlights.length}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Aeropuertos detectados</dt>
                <dd className="font-mono font-bold text-gray-900 dark:text-gray-100">
                  {airportVisits.length}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Días con datos</dt>
                <dd className="font-mono font-bold text-gray-900 dark:text-gray-100">
                  {summary.daysTracked}
                </dd>
              </div>
            </dl>
          </Section>
        )}

        {/* Cross-links */}
        <section
          aria-label="Más sobre aviación"
          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5"
        >
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Más sobre aviación en España
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Link
              href="/aviacion"
              className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors text-sm text-gray-700 dark:text-gray-300"
            >
              <Plane className="w-4 h-4 text-tl-600 dark:text-tl-400 flex-shrink-0" />
              Mapa de tráfico aéreo en vivo
            </Link>
            <Link
              href="/aviacion/aeropuertos"
              className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors text-sm text-gray-700 dark:text-gray-300"
            >
              <MapPin className="w-4 h-4 text-tl-600 dark:text-tl-400 flex-shrink-0" />
              Aeropuertos AENA — catálogo completo
            </Link>
          </div>
        </section>

        {/* Attribution */}
        <footer className="flex flex-wrap items-center gap-2 text-xs text-gray-400 dark:text-gray-500 pt-2">
          <Plane className="w-4 h-4 flex-shrink-0" />
          <span>
            Datos: OpenSky Network. Recolector cada 15 minutos. Historial: hasta 30 días.
            Vuelos computados por agrupación de posiciones (umbral de silencio: 30 min).
          </span>
        </footer>
      </main>
    </div>
  );
}
