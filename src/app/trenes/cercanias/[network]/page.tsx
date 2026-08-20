import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import {
  Train,
  Route,
  AlertTriangle,
  ArrowRight,
  Info,
  CheckCircle,
  CalendarClock,
} from "lucide-react";
import StationsList, { type StationEntry } from "./stations-list";

export const revalidate = 300;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

const NETWORK_MAP: Record<string, string> = {
  madrid: "Madrid",
  barcelona: "Barcelona",
  valencia: "Valencia",
  sevilla: "Sevilla",
  malaga: "Málaga",
  bilbao: "Bilbao",
  asturias: "Asturias",
  santander: "Santander",
  cadiz: "Cádiz",
  "murcia-alicante": "Murcia/Alicante",
  zaragoza: "Zaragoza",
  "san-sebastian": "San Sebastián",
};

const EFFECT_LABELS: Record<string, string> = {
  NO_SERVICE: "Sin servicio",
  REDUCED_SERVICE: "Servicio reducido",
  SIGNIFICANT_DELAYS: "Retrasos significativos",
  DETOUR: "Desvío",
  MODIFIED_SERVICE: "Servicio modificado",
  ADDITIONAL_SERVICE: "Servicio adicional",
  STOP_MOVED: "Parada trasladada",
  OTHER_EFFECT: "Otra incidencia",
  UNKNOWN_EFFECT: "Incidencia",
};

const EFFECT_COLORS: Record<string, string> = {
  NO_SERVICE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  REDUCED_SERVICE: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  SIGNIFICANT_DELAYS: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  DETOUR: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  MODIFIED_SERVICE: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  ADDITIONAL_SERVICE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  STOP_MOVED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  OTHER_EFFECT: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  UNKNOWN_EFFECT: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
};

type Props = {
  params: Promise<{ network: string }>;
};

export function generateStaticParams() {
  return Object.keys(NETWORK_MAP).map((network) => ({ network }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { network } = await params;
  const name = NETWORK_MAP[network];

  if (!name) {
    return { title: "Red no encontrada" };
  }

  return {
    title: `Cercanías ${name} — estaciones y líneas`,
    description: `Todas las estaciones y líneas de Cercanías ${name}. Consulta alertas activas, paradas, conexiones y el estado de la red en tiempo real.`,
    keywords: [
      `Cercanías ${name}`,
      `trenes cercanías ${name}`,
      `estaciones ${name}`,
      `líneas cercanías`,
      `Renfe Cercanías ${name}`,
    ],
    alternates: {
      canonical: `${BASE_URL}/trenes/cercanias/${network}`,
    },
    openGraph: {
      title: `Cercanías ${name} — estaciones y líneas`,
      description: `Estaciones, líneas y alertas de Cercanías ${name}. Información actualizada de Renfe.`,
      url: `${BASE_URL}/trenes/cercanias/${network}`,
      images: [`${BASE_URL}/og-image.webp`],
    },
  };
}

async function getNetworkData(name: string) {
  const [routes, stations] = await Promise.all([
    prisma.railwayRoute.findMany({
      where: { network: { equals: name, mode: "insensitive" } },
      select: {
        routeId: true,
        shortName: true,
        longName: true,
        slug: true,
        color: true,
        originName: true,
        destName: true,
        tripCount: true,
        stopsCount: true,
        stopIds: true,
      },
    }),
    prisma.railwayStation.findMany({
      where: { network: { equals: name, mode: "insensitive" } },
      select: {
        stopId: true,
        name: true,
        slug: true,
        code: true,
        municipality: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const alerts = routes.length
    ? await prisma.railwayAlert.findMany({
        where: {
          isActive: true,
          routeIds: { hasSome: routes.map((r) => r.routeId) },
        },
        select: {
          id: true,
          headerText: true,
          description: true,
          effect: true,
          routeIds: true,
          url: true,
          activePeriodStart: true,
        },
        orderBy: { activePeriodStart: "desc" },
      })
    : [];

  // Lines that stop at each station, from the routes' ordered stop sequences
  const linesByStopId = new Map<string, Set<string>>();
  for (const r of routes) {
    if (!r.shortName) continue;
    for (const stopId of r.stopIds) {
      if (!linesByStopId.has(stopId)) linesByStopId.set(stopId, new Set());
      linesByStopId.get(stopId)!.add(r.shortName);
    }
  }

  const sortedRoutes = [...routes].sort((a, b) =>
    (a.shortName || "").localeCompare(b.shortName || "", "es", { numeric: true })
  );

  return { routes: sortedRoutes, stations, alerts, linesByStopId };
}

export default async function CercaniasNetworkPage({ params }: Props) {
  const { network } = await params;
  const name = NETWORK_MAP[network];

  if (!name) {
    notFound();
  }

  const { routes, stations, alerts, linesByStopId } = await getNetworkData(name);

  const routeByRouteId = new Map(routes.map((r) => [r.routeId, r]));
  const stationEntries: StationEntry[] = stations.map((s) => ({
    name: s.name,
    slug: s.slug,
    code: s.code,
    municipality: s.municipality,
    lines: [...(linesByStopId.get(s.stopId) ?? [])].sort((a, b) =>
      a.localeCompare(b, "es", { numeric: true })
    ),
  }));

  const dailyTrips = routes.reduce((sum, r) => sum + (r.tripCount ?? 0), 0);

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <Breadcrumbs
        items={[
          { name: "Inicio", href: "/" },
          { name: "Red Ferroviaria", href: "/trenes" },
          { name: "Cercanías", href: "/trenes/cercanias" },
          { name: name, href: `/trenes/cercanias/${network}` },
        ]}
      />

      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-gray-900 dark:text-gray-100">
              Cercanías {name}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {stations.length} estaciones · {routes.length} líneas
              {dailyTrips > 0 && <> · {dailyTrips.toLocaleString("es-ES")} servicios/día</>}
            </p>
          </div>
          <Link
            href="/trenes/mapa"
            className="shrink-0 flex items-center gap-1.5 text-sm text-[var(--tl-primary)] font-semibold hover:underline"
          >
            <Train className="w-4 h-4" />
            Ver en el mapa
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Network status */}
        {alerts.length === 0 ? (
          <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/40 rounded-xl p-4">
            <CheckCircle className="w-5 h-5 text-[var(--tl-success)] shrink-0" />
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <span className="font-semibold">Red operando con normalidad.</span> Sin
              incidencias activas en Cercanías {name}.
            </p>
          </div>
        ) : (
          <section>
            <h2 className="font-heading font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-[var(--tl-danger)]" />
              Incidencias en Cercanías {name} ({alerts.length})
            </h2>
            <div className="space-y-2">
              {alerts.map((a) => {
                const affectedLines = [
                  ...new Map(
                    a.routeIds
                      .map((rid) => routeByRouteId.get(rid))
                      .filter((r): r is NonNullable<typeof r> => !!r?.slug)
                      .map((r) => [r.slug as string, r])
                  ).values(),
                ];
                return (
                  <div
                    key={a.id}
                    className="bg-white dark:bg-gray-800 border border-red-100 dark:border-red-900/30 rounded-xl p-4 space-y-2"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded text-[11px] font-semibold ${
                          EFFECT_COLORS[a.effect || ""] || EFFECT_COLORS.UNKNOWN_EFFECT
                        }`}
                      >
                        {EFFECT_LABELS[a.effect || ""] || "Incidencia"}
                      </span>
                      <p className="text-sm text-gray-700 dark:text-gray-300 min-w-0">
                        {a.headerText || a.description || "Incidencia activa en esta red"}
                      </p>
                    </div>
                    {(affectedLines.length > 0 || a.url) && (
                      <div className="flex flex-wrap items-center gap-1.5 ml-1">
                        {affectedLines.map((r) => (
                          <Link
                            key={r.slug}
                            href={`/trenes/linea/${r.slug}`}
                            className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold text-white hover:opacity-80 transition-opacity"
                            style={{
                              backgroundColor: r.color
                                ? `#${r.color.replace(/^#/, "")}`
                                : "var(--tl-primary)",
                            }}
                          >
                            {r.shortName || "línea"}
                          </Link>
                        ))}
                        {a.url && (
                          <a
                            href={a.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-[var(--tl-primary)] underline underline-offset-2"
                          >
                            Más info →
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Lines */}
        <section>
          <h2 className="font-heading font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
            <Route className="w-5 h-5 text-[var(--tl-primary)]" />
            Líneas de Cercanías {name}
          </h2>

          {routes.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No hay líneas disponibles para esta red en este momento.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700/50 overflow-hidden">
              {routes.map((route) => {
                const color = route.color
                  ? `#${route.color.replace(/^#/, "")}`
                  : "var(--tl-primary)";
                const origin =
                  route.originName || (route.longName || "").split(/[-–—]/)[0]?.trim();
                const destination =
                  route.destName ||
                  (route.longName || "").split(/[-–—]/).pop()?.trim();
                const row = (
                  <div className="flex items-center gap-3 py-2.5 px-4 group">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-white font-heading font-bold text-sm"
                      style={{ backgroundColor: color }}
                    >
                      {route.shortName || "C"}
                    </div>
                    <div className="flex-1 min-w-0">
                      {origin && destination ? (
                        <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-[var(--tl-primary)] transition-colors">
                          <span className="truncate">{origin}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="truncate">{destination}</span>
                        </div>
                      ) : (
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-[var(--tl-primary)] transition-colors">
                          {route.longName || route.shortName}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Línea {route.shortName}
                        {route.stopsCount ? <> · {route.stopsCount} paradas</> : null}
                        {route.tripCount ? <> · {route.tripCount} servicios/día</> : null}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[var(--tl-primary)] shrink-0 transition-colors" />
                  </div>
                );
                return route.slug ? (
                  <Link
                    key={route.routeId}
                    href={`/trenes/linea/${route.slug}`}
                    className="block hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    {row}
                  </Link>
                ) : (
                  <div key={route.routeId}>{row}</div>
                );
              })}
            </div>
          )}
        </section>

        {/* Stations (client island: search + show-all over server-provided data) */}
        <StationsList stations={stationEntries} networkName={name} />

        {/* Cross-links */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/trenes/cercanias"
            className="text-sm text-[var(--tl-primary)] hover:underline font-semibold flex items-center gap-1"
          >
            ← Todas las redes de Cercanías
          </Link>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <Link
            href="/trenes/incidencias"
            className="text-sm text-[var(--tl-primary)] hover:underline font-semibold flex items-center gap-1.5"
          >
            <CalendarClock className="w-3.5 h-3.5" />
            Incidencias Renfe
          </Link>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <Link
            href="/trenes"
            className="text-sm text-[var(--tl-primary)] hover:underline font-semibold flex items-center gap-1.5"
          >
            <Train className="w-3.5 h-3.5" />
            Mapa ferroviario
          </Link>
        </div>

        {/* Attribution */}
        <p className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <Info className="w-3 h-3 shrink-0" />
          Datos: Renfe Operadora (CC-BY 4.0). Alertas actualizadas cada 2 minutos. Estaciones y
          líneas GTFS semanales.
        </p>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: `Cercanías ${name}`,
            description: `Estaciones y líneas de la red de Cercanías ${name}.`,
            url: `${BASE_URL}/trenes/cercanias/${network}`,
            publisher: {
              "@type": "Organization",
              name: "trafico.live",
              url: BASE_URL,
            },
          }),
        }}
      />
    </main>
  );
}
