import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { StructuredData } from "@/components/seo/StructuredData";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import {
  Ship,
  Clock,
  Anchor,
  ArrowRight,
  CalendarClock,
  MapPin,
  ExternalLink,
} from "lucide-react";

export const revalidate = 300; // ISR 5 min

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "Próximo ferry — Próximas salidas hoy | trafico.live",
  description:
    "¿Cuándo sale el próximo ferry? Consulta las próximas salidas de ferry en España y Portugal, ordenadas por hora. Rutas Algeciras–Ceuta, Barcelona–Mallorca, Valencia–Ibiza y más.",
  keywords: [
    "próximo ferry",
    "proximo ferry",
    "próximas salidas ferry",
    "ferry horario hoy",
    "cuando sale el ferry",
    "horario ferry hoy",
  ],
  alternates: {
    canonical: `${BASE_URL}/maritimo/ferries/proximo`,
  },
  openGraph: {
    title: "Próximo ferry — Próximas salidas hoy | trafico.live",
    description:
      "Consulta las próximas salidas de ferry en España y Portugal, ordenadas por hora. Datos GTFS actualizados.",
    url: `${BASE_URL}/maritimo/ferries/proximo`,
    type: "website",
    locale: "es_ES",
    siteName: "trafico.live",
  },
};

// ---------------------------------------------------------------------------
// Data types
// ---------------------------------------------------------------------------

type DepartureRow = {
  routeId: string;
  routeName: string;
  operator: string;
  routeColor: string | null;
  tripId: string;
  departsAt: string;
  arrivesAt: string | null;
  headsign: string | null;
  serviceDay: string | null;
  originStop: string | null;
  destinationStop: string | null;
};

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Convert "HH:MM:SS" or "HH:MM" time string to total minutes */
function timeToMinutes(t: string): number {
  const parts = t.split(":").map(Number);
  return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
}

/** Get current time in "HH:MM" format (Spain time) */
function nowTimeString(): string {
  return new Date().toLocaleTimeString("es-ES", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Today's day-of-week keys that GTFS serviceDay might match */
function todayServiceDayKeys(): string[] {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const d = new Date();
  const key = days[d.getDay()];
  return [key, "daily", "weekdays", "weekends", d.toISOString().slice(0, 10).replace(/-/g, "")];
}

async function getUpcomingDepartures(): Promise<DepartureRow[]> {
  const routes = await prisma.ferryRoute.findMany({
    select: {
      id: true,
      operator: true,
      routeName: true,
      routeColor: true,
      stops: {
        select: { stopName: true, stopId: true },
        orderBy: { stopName: "asc" },
        take: 10,
      },
      trips: {
        where: { departsAt: { not: null } },
        select: {
          tripId: true,
          departsAt: true,
          arrivesAt: true,
          headsign: true,
          serviceDay: true,
        },
        orderBy: { departsAt: "asc" },
      },
    },
  });

  const currentMinutes = timeToMinutes(nowTimeString());
  const validDays = todayServiceDayKeys();
  const rows: DepartureRow[] = [];

  for (const route of routes) {
    // Determine origin / destination from stops (first + last alphabetically is a simplification;
    // in practice routeName often has "Origin - Destination")
    const originStop = route.stops[0]?.stopName ?? null;
    const destinationStop = route.stops[route.stops.length - 1]?.stopName ?? null;

    for (const trip of route.trips) {
      if (!trip.departsAt) continue;

      // Filter to today or no serviceDay restriction
      if (
        trip.serviceDay &&
        !validDays.some((d) => trip.serviceDay!.toLowerCase().includes(d))
      ) {
        continue;
      }

      const tripMinutes = timeToMinutes(trip.departsAt);
      // Only future departures within the next 24h window
      const rawDiff = tripMinutes - currentMinutes;
      const adjustedMinutes = rawDiff < -60 ? rawDiff + 24 * 60 : rawDiff;
      if (adjustedMinutes < -60 || adjustedMinutes > 24 * 60) continue;

      rows.push({
        routeId: route.id,
        routeName: route.routeName,
        operator: route.operator,
        routeColor: route.routeColor,
        tripId: trip.tripId,
        departsAt: trip.departsAt,
        arrivesAt: trip.arrivesAt ?? null,
        headsign: trip.headsign ?? null,
        serviceDay: trip.serviceDay ?? null,
        originStop,
        destinationStop,
      });
    }
  }

  // Sort by departure time (minutes since midnight), future-first
  rows.sort((a, b) => {
    const am = timeToMinutes(a.departsAt);
    const bm = timeToMinutes(b.departsAt);
    const now = currentMinutes;
    const ad = am >= now ? am - now : am + 24 * 60 - now;
    const bd = bm >= now ? bm - now : bm + 24 * 60 - now;
    return ad - bd;
  });

  return rows.slice(0, 60);
}

// ---------------------------------------------------------------------------
// Structured data
// ---------------------------------------------------------------------------

function buildJsonLd(departures: DepartureRow[]) {
  const todayISO = new Date().toISOString().slice(0, 10);

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Próximas salidas de ferry hoy",
    description: "Listado de las próximas salidas de ferry en España y Portugal",
    url: `${BASE_URL}/maritimo/ferries/proximo`,
    numberOfItems: departures.length,
    itemListElement: departures.slice(0, 20).map((dep, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Trip",
        name: `Ferry ${dep.operator} ${dep.routeName} — ${dep.departsAt}`,
        provider: { "@type": "Organization", name: dep.operator },
        departureTime: `${todayISO}T${dep.departsAt}:00`,
        ...(dep.arrivesAt && { arrivalTime: `${todayISO}T${dep.arrivesAt}:00` }),
        ...(dep.originStop && {
          itinerary: {
            "@type": "ItemList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: dep.originStop },
              ...(dep.destinationStop
                ? [{ "@type": "ListItem", position: 2, name: dep.destinationStop }]
                : []),
            ],
          },
        }),
      },
    })),
  };

  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "¿Cómo saber cuándo sale el próximo ferry?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Consulta esta página para ver las próximas salidas de ferry en España y Portugal ordenadas por hora. Los datos se obtienen de los horarios GTFS oficiales de cada naviera.",
        },
      },
      {
        "@type": "Question",
        name: "¿Qué rutas de ferry aparecen?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Se muestran las rutas de Fred Olsen, Baleària, Vizcaya y otras navieras con datos GTFS públicos: Algeciras–Ceuta, Barcelona–Palma, Valencia–Ibiza, Dénia–Ibiza y más.",
        },
      },
      {
        "@type": "Question",
        name: "¿Con qué frecuencia se actualiza el horario?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Los horarios se actualizan cada 5 minutos y se basan en datos GTFS oficiales de las navieras. Para información de reserva, haz clic en 'Ver disponibilidad' en cada salida.",
        },
      },
    ],
  };

  return [itemList, faqPage];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function minutesUntil(departsAt: string): number {
  const now = timeToMinutes(nowTimeString());
  const dep = timeToMinutes(departsAt);
  const diff = dep - now;
  return diff < -60 ? diff + 24 * 60 : diff;
}

function formatMinutesUntil(mins: number): { label: string; urgent: boolean } {
  if (mins < 0) return { label: "Salió hace poco", urgent: false };
  if (mins === 0) return { label: "Ahora", urgent: true };
  if (mins < 60) return { label: `En ${mins} min`, urgent: mins < 15 };
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return {
    label: m > 0 ? `En ${h}h ${m}min` : `En ${h}h`,
    urgent: false,
  };
}

/** Parse routeName "A - B" into origin/destination */
function parseRoute(routeName: string): { origin: string; destination: string } | null {
  const seps = [" - ", " – ", " — ", " → ", " > "];
  for (const sep of seps) {
    if (routeName.includes(sep)) {
      const [o, ...rest] = routeName.split(sep);
      return { origin: o.trim(), destination: rest.join(sep).trim() };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ProximoFerryPage() {
  const departures = await getUpcomingDepartures();

  // Group by operator for display
  const byOperator = new Map<string, DepartureRow[]>();
  for (const dep of departures) {
    if (!byOperator.has(dep.operator)) byOperator.set(dep.operator, []);
    byOperator.get(dep.operator)!.push(dep);
  }

  return (
    <>
      <StructuredData data={buildJsonLd(departures)} />

      {/* ------------------------------------------------------------------ */}
      {/* Hero                                                                */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-gradient-to-br from-tl-sea-700 via-tl-sea-600 to-tl-sea-500 text-white">
        <div className="max-w-5xl mx-auto px-4 py-10 sm:py-12">
          <Breadcrumbs
            items={[
              { name: "Inicio", href: "/" },
              { name: "Marítimo", href: "/maritimo" },
              { name: "Ferries", href: "/maritimo/ferries" },
              { name: "Próximo ferry", href: "/maritimo/ferries/proximo" },
            ]}
          />

          <div className="mt-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <CalendarClock className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold leading-tight">
                Próximo ferry
              </h1>
              <p className="text-tl-sea-100 text-sm mt-1">
                Próximas salidas hoy en España y Portugal · Horarios GTFS actualizados
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/10 rounded-xl p-3.5">
              <div className="text-xs text-tl-sea-100">Salidas próximas</div>
              <div className="font-mono font-bold text-lg tabular-nums mt-0.5">
                {departures.length}
              </div>
            </div>
            <div className="bg-white/10 rounded-xl p-3.5">
              <div className="text-xs text-tl-sea-100">Navieras</div>
              <div className="font-mono font-bold text-lg tabular-nums mt-0.5">
                {byOperator.size}
              </div>
            </div>
            <div className="bg-white/10 rounded-xl p-3.5">
              <div className="text-xs text-tl-sea-100">Próxima salida</div>
              <div className="font-mono font-bold text-lg tabular-nums mt-0.5">
                {departures[0]?.departsAt ?? "—"}
              </div>
            </div>
            <div className="bg-white/10 rounded-xl p-3.5">
              <div className="text-xs text-tl-sea-100">Actualización</div>
              <div className="font-mono font-bold text-lg tabular-nums mt-0.5">
                5 min
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Departures list                                                     */}
      {/* ------------------------------------------------------------------ */}
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {departures.length === 0 ? (
          <div className="text-center py-20 text-gray-500 dark:text-gray-400">
            <Ship className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-700" />
            <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              No hay salidas próximas
            </p>
            <p className="text-sm">
              Los horarios GTFS pueden no incluir todas las navieras. Consulta directamente con la
              naviera para horarios actualizados.
            </p>
          </div>
        ) : (
          <>
            {/* Main table: next 24h all departures */}
            <section>
              <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-tl-sea-500" />
                Próximas salidas
              </h2>

              <div className="space-y-2">
                {departures.map((dep, i) => {
                  const parsed = parseRoute(dep.routeName);
                  const routeSlug = `${slugify(dep.operator)}-${slugify(dep.routeName)}`;
                  const mins = minutesUntil(dep.departsAt);
                  const { label: timeLabel, urgent } = formatMinutesUntil(mins);

                  return (
                    <div
                      key={`${dep.tripId}-${i}`}
                      className={`flex flex-wrap items-center gap-3 bg-white dark:bg-gray-900 rounded-xl border px-4 py-3 transition-all ${
                        urgent
                          ? "border-tl-amber-400 dark:border-tl-amber-600 shadow-sm"
                          : "border-gray-200 dark:border-gray-800"
                      }`}
                    >
                      {/* Time */}
                      <div className="flex-shrink-0 w-14 text-center">
                        <div className="font-mono text-xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                          {dep.departsAt.slice(0, 5)}
                        </div>
                        {dep.arrivesAt && (
                          <div className="font-mono text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                            → {dep.arrivesAt.slice(0, 5)}
                          </div>
                        )}
                      </div>

                      {/* Route info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          {dep.routeColor && (
                            <span
                              className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: `#${dep.routeColor.replace("#", "")}` }}
                            />
                          )}
                          <span className="font-semibold text-gray-900 dark:text-gray-100 truncate text-sm">
                            {parsed
                              ? `${parsed.origin} → ${parsed.destination}`
                              : dep.headsign ?? dep.routeName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Ship className="w-3 h-3 text-tl-sea-400 flex-shrink-0" />
                          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {dep.operator}
                          </span>
                          {dep.originStop && (
                            <>
                              <span className="text-xs text-gray-300 dark:text-gray-700">·</span>
                              <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {dep.originStop}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Countdown badge */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            urgent
                              ? "bg-tl-amber-100 dark:bg-tl-amber-900/40 text-tl-amber-700 dark:text-tl-amber-300"
                              : "bg-tl-sea-50 dark:bg-tl-sea-900/30 text-tl-sea-700 dark:text-tl-sea-300"
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          {timeLabel}
                        </span>

                        {/* Link to route detail */}
                        <Link
                          href={`/maritimo/ferries/${routeSlug}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-tl-sea-600 hover:bg-tl-sea-700 text-white text-xs font-medium transition-colors"
                        >
                          Horario
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>

                      {/* Affiliate CTA placeholder */}
                      {/* TODO Sprint 6: Replace with AffiliateCTA component once DirectFerries partnership is active */}
                      {/* <AffiliateCTA program="directferries" origin={parsed?.origin} destination={parsed?.destination} date={todayISO} /> */}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Operator breakdown */}
            {byOperator.size > 1 && (
              <section>
                <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Anchor className="w-5 h-5 text-tl-sea-500" />
                  Por naviera
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Array.from(byOperator.entries()).map(([operator, deps]) => (
                    <div
                      key={operator}
                      className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                          {operator}
                        </span>
                        <span className="font-mono text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                          {deps.length} salidas
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {deps.slice(0, 6).map((dep, j) => (
                          <span
                            key={`${dep.tripId}-${j}`}
                            className="font-mono text-xs bg-tl-sea-50 dark:bg-tl-sea-900/20 text-tl-sea-700 dark:text-tl-sea-300 px-2 py-0.5 rounded tabular-nums"
                          >
                            {dep.departsAt.slice(0, 5)}
                          </span>
                        ))}
                        {deps.length > 6 && (
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            +{deps.length - 6} más
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Affiliate placeholder banner */}
            <section className="rounded-xl border border-dashed border-tl-sea-300 dark:border-tl-sea-700 bg-tl-sea-50 dark:bg-tl-sea-900/20 p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-tl-sea-100 dark:bg-tl-sea-800 flex items-center justify-center flex-shrink-0">
                  <ExternalLink className="w-5 h-5 text-tl-sea-600 dark:text-tl-sea-400" />
                </div>
                <div>
                  <div className="font-heading font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">
                    ¿Quieres reservar tu billete?
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Compara precios y disponibilidad en DirectFerries, Ferryhopper y otras
                    plataformas de reserva. El servicio de búsqueda estará disponible próximamente.
                  </p>
                  {/* TODO Sprint 6: <AffiliateCTA program="directferries" /> */}
                </div>
              </div>
            </section>

            {/* FAQ section */}
            <section className="space-y-4">
              <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-gray-100">
                Preguntas frecuentes
              </h2>
              {[
                {
                  q: "¿Cómo saber cuándo sale el próximo ferry?",
                  a: "Esta página muestra las próximas salidas de ferry en España y Portugal, ordenadas por hora de salida. Los datos provienen de horarios GTFS oficiales de cada naviera y se actualizan cada 5 minutos.",
                },
                {
                  q: "¿Qué navieras aparecen en esta lista?",
                  a: "Incluimos datos de Fred Olsen, Baleària, Trasmediterránea, Vizcaya y otras navieras con GTFS públicos disponibles. La cobertura se amplía periódicamente.",
                },
                {
                  q: "¿Puedo ver el estado en tiempo real del ferry?",
                  a: "Sí. Haz clic en 'Horario' junto a cualquier salida para ver la ruta completa. La posición AIS del buque asignado está disponible en la ficha de cada embarcación.",
                },
              ].map(({ q, a }) => (
                <details
                  key={q}
                  className="group bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800"
                >
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-semibold text-gray-900 dark:text-gray-100 text-sm select-none list-none">
                    {q}
                    <ArrowRight className="w-4 h-4 text-tl-sea-500 group-open:rotate-90 transition-transform flex-shrink-0" />
                  </summary>
                  <div className="px-5 pb-4 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-3">
                    {a}
                  </div>
                </details>
              ))}
            </section>
          </>
        )}

        {/* Attribution */}
        <p className="text-xs text-gray-400 dark:text-gray-600 text-center">
          Datos de horarios de fuentes GTFS públicas (Fred Olsen, Baleária, Vizcaya).
          Horarios orientativos — confirma con la naviera antes de embarcar. ·{" "}
          <Link href="/maritimo" className="underline hover:text-tl-sea-500">
            Hub Marítimo
          </Link>
        </p>
      </div>
    </>
  );
}
