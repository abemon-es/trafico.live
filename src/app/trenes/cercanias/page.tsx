import type { Metadata } from "next";
import Link from "next/link";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import {
  Train,
  MapPin,
  Route,
  AlertTriangle,
  ArrowRight,
  Clock,
  Radio,
  Info,
  CheckCircle,
} from "lucide-react";

// Server-rendered: stats and alerts are computed from the DB at request time.
// 300 s ISR keeps alert counts near-live without a client waterfall (the old
// client version hardcoded stations to 0 and grepped alert JSON for city names).
export const revalidate = 300;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

const NETWORKS: { slug: string; name: string; region: string }[] = [
  { slug: "madrid", name: "Madrid", region: "Comunidad de Madrid" },
  { slug: "barcelona", name: "Barcelona", region: "Cataluña" },
  { slug: "valencia", name: "Valencia", region: "Comunidad Valenciana" },
  { slug: "sevilla", name: "Sevilla", region: "Andalucía" },
  { slug: "malaga", name: "Málaga", region: "Andalucía" },
  { slug: "bilbao", name: "Bilbao", region: "País Vasco" },
  { slug: "asturias", name: "Asturias", region: "Principado de Asturias" },
  { slug: "santander", name: "Santander", region: "Cantabria" },
  { slug: "cadiz", name: "Cádiz", region: "Andalucía" },
  { slug: "murcia-alicante", name: "Murcia/Alicante", region: "Murcia · C. Valenciana" },
  { slug: "zaragoza", name: "Zaragoza", region: "Aragón" },
  { slug: "san-sebastian", name: "San Sebastián", region: "País Vasco" },
];

// Network accent colors — one per network for visual distinction
const NETWORK_COLORS: Record<string, string> = {
  madrid: "#dc2626",
  barcelona: "#7c3aed",
  valencia: "#d97706",
  sevilla: "#059669",
  malaga: "#0891b2",
  bilbao: "#16a34a",
  asturias: "#ca8a04",
  santander: "#0369a1",
  cadiz: "#c026d3",
  "murcia-alicante": "#ea580c",
  zaragoza: "#0d9488",
  "san-sebastian": "#4f46e5",
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

export const metadata: Metadata = {
  title: "Cercanías de España — 12 redes",
  description:
    "Mapa y directorio de las 12 redes de Cercanías de España: Madrid, Barcelona, Valencia, Sevilla, Málaga, Bilbao, Asturias, Santander, Cádiz, Murcia/Alicante, Zaragoza y San Sebastián. Estaciones, líneas y alertas en tiempo real.",
  keywords: [
    "Cercanías España",
    "trenes de cercanías",
    "Renfe Cercanías",
    "estaciones cercanías",
    "líneas cercanías",
    "transporte ferroviario urbano",
  ],
  alternates: {
    canonical: `${BASE_URL}/trenes/cercanias`,
  },
  openGraph: {
    title: "Cercanías de España — 12 redes | trafico.live",
    description:
      "Las 12 redes de Cercanías de España: estaciones, líneas y alertas en tiempo real de Renfe.",
    url: `${BASE_URL}/trenes/cercanias`,
    images: [`${BASE_URL}/og-image.webp`],
  },
};

async function getCercaniasData() {
  const [stationGroups, routeGroups, alerts, snapshot] = await Promise.all([
    prisma.railwayStation.groupBy({
      by: ["network"],
      where: { network: { not: null } },
      _count: { _all: true },
    }),
    prisma.railwayRoute.groupBy({
      by: ["network"],
      where: { network: { not: null } },
      _count: { _all: true },
    }),
    prisma.railwayAlert.findMany({
      where: { isActive: true },
      select: {
        id: true,
        headerText: true,
        description: true,
        effect: true,
        routeIds: true,
        serviceType: true,
      },
      orderBy: { activePeriodStart: "desc" },
      take: 200,
    }),
    prisma.railwayDelaySnapshot.findFirst({
      orderBy: { recordedAt: "desc" },
      select: { totalTrains: true, punctualityRate: true, recordedAt: true },
    }),
  ]);

  // Resolve which network each alert belongs to via its affected route_ids
  const alertRouteIds = [...new Set(alerts.flatMap((a) => a.routeIds))];
  const alertRoutes = alertRouteIds.length
    ? await prisma.railwayRoute.findMany({
        where: { routeId: { in: alertRouteIds } },
        select: { routeId: true, network: true, shortName: true, slug: true },
      })
    : [];
  const routeById = new Map(alertRoutes.map((r) => [r.routeId, r]));

  const stationsByNetwork = new Map(
    stationGroups.map((g) => [g.network as string, g._count._all])
  );
  const routesByNetwork = new Map(
    routeGroups.map((g) => [g.network as string, g._count._all])
  );

  // Alerts per network + enriched alert list for the banner
  const alertsByNetwork = new Map<string, number>();
  const cercaniasAlerts: {
    id: string;
    headerText: string | null;
    description: string;
    effect: string;
    networks: string[];
    lines: { shortName: string | null; slug: string | null }[];
  }[] = [];

  for (const a of alerts) {
    const networks = new Set<string>();
    const lines = new Map<string, { shortName: string | null; slug: string | null }>();
    for (const rid of a.routeIds) {
      const r = routeById.get(rid);
      if (r?.network) {
        networks.add(r.network);
        if (r.slug) lines.set(r.slug, { shortName: r.shortName, slug: r.slug });
      }
    }
    for (const n of networks) {
      alertsByNetwork.set(n, (alertsByNetwork.get(n) ?? 0) + 1);
    }
    if (networks.size > 0) {
      cercaniasAlerts.push({
        id: a.id,
        headerText: a.headerText,
        description: a.description,
        effect: a.effect,
        networks: [...networks],
        lines: [...lines.values()].slice(0, 6),
      });
    }
  }

  return {
    stationsByNetwork,
    routesByNetwork,
    alertsByNetwork,
    cercaniasAlerts,
    totalActiveAlerts: alerts.length,
    snapshot,
  };
}

function StatTile({
  icon: Icon,
  label,
  value,
  color,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color?: string;
  href?: string;
}) {
  const inner = (
    <>
      <div className="w-9 h-9 rounded-lg bg-[var(--tl-primary-bg)] flex items-center justify-center shrink-0">
        <Icon className="w-4.5 h-4.5 text-[var(--tl-primary)]" />
      </div>
      <div>
        <p className={`text-xl font-heading font-bold font-mono ${color || "text-gray-900 dark:text-gray-100"}`}>
          {value}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </>
  );
  const cls =
    "bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3";
  if (href) {
    return (
      <Link href={href} className={`${cls} hover:border-[var(--tl-primary)] transition-colors`}>
        {inner}
      </Link>
    );
  }
  return <div className={cls}>{inner}</div>;
}

export default async function CercaniasPage() {
  const data = await getCercaniasData();

  const totalStations = NETWORKS.reduce(
    (sum, n) => sum + (data.stationsByNetwork.get(n.name) ?? 0),
    0
  );
  const totalRoutes = NETWORKS.reduce(
    (sum, n) => sum + (data.routesByNetwork.get(n.name) ?? 0),
    0
  );
  const cercaniasAlertCount = data.cercaniasAlerts.length;
  const punctuality = data.snapshot ? Number(data.snapshot.punctualityRate) : null;

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <Breadcrumbs
        items={[
          { name: "Inicio", href: "/" },
          { name: "Red Ferroviaria", href: "/trenes" },
          { name: "Cercanías", href: "/trenes/cercanias" },
        ]}
      />

      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-gray-900 dark:text-gray-100">
              Cercanías de España
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1.5">
              12 redes regionales · {totalStations.toLocaleString("es-ES")} estaciones ·{" "}
              {totalRoutes} líneas · alertas en tiempo real
            </p>
          </div>
          <Link
            href="/trenes/incidencias"
            className={`shrink-0 flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg border transition-colors ${
              cercaniasAlertCount > 0
                ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20"
                : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-[var(--tl-primary)]"
            }`}
          >
            {cercaniasAlertCount > 0 ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <CheckCircle className="w-4 h-4 text-[var(--tl-success)]" />
            )}
            {cercaniasAlertCount > 0
              ? `${cercaniasAlertCount} incidencias en Cercanías`
              : "Sin incidencias en Cercanías"}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatTile icon={Train} label="Redes operativas" value="12" color="text-[var(--tl-primary)]" />
          <StatTile icon={MapPin} label="Estaciones" value={totalStations.toLocaleString("es-ES")} href="/trenes/estaciones" />
          <StatTile icon={Route} label="Líneas" value={String(totalRoutes)} href="/trenes/lineas" />
          <StatTile
            icon={AlertTriangle}
            label="Alertas Cercanías"
            value={String(cercaniasAlertCount)}
            color={cercaniasAlertCount > 0 ? "text-[var(--tl-danger)]" : "text-[var(--tl-success)]"}
            href="/trenes/incidencias"
          />
          <StatTile
            icon={Clock}
            label="Puntualidad red"
            value={punctuality != null ? `${punctuality.toFixed(0)}%` : "—"}
            color={
              punctuality == null
                ? undefined
                : punctuality >= 80
                ? "text-[var(--tl-success)]"
                : "text-[var(--tl-danger)]"
            }
          />
          <StatTile
            icon={Radio}
            label="Trenes ahora"
            value={data.snapshot ? String(data.snapshot.totalTrains) : "—"}
            href="/trenes/mapa"
          />
        </div>

        {/* Network grid */}
        <div>
          <h2 className="font-heading font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wider mb-4">
            Redes de Cercanías
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {NETWORKS.map((network) => {
              const color = NETWORK_COLORS[network.slug] || "var(--tl-primary)";
              const stations = data.stationsByNetwork.get(network.name) ?? 0;
              const routes = data.routesByNetwork.get(network.name) ?? 0;
              const alerts = data.alertsByNetwork.get(network.name) ?? 0;

              return (
                <Link
                  key={network.slug}
                  href={`/trenes/cercanias/${network.slug}`}
                  className="group flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-[var(--tl-primary)] hover:shadow-md transition-all duration-200"
                >
                  <div
                    className="h-1 w-full rounded-full mb-4 opacity-80"
                    style={{ backgroundColor: color }}
                  />

                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-heading font-bold text-lg text-gray-900 dark:text-gray-100 group-hover:text-[var(--tl-primary)] transition-colors">
                        {network.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {network.region}
                      </p>
                    </div>
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${color}18` }}
                    >
                      <Train className="w-5 h-5" style={{ color }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-auto">
                    <div className="text-center">
                      <p className="text-lg font-heading font-bold font-mono text-gray-900 dark:text-gray-100">
                        {stations}
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center justify-center gap-0.5">
                        <MapPin className="w-2.5 h-2.5" />
                        Estaciones
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-heading font-bold font-mono text-gray-900 dark:text-gray-100">
                        {routes}
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center justify-center gap-0.5">
                        <Route className="w-2.5 h-2.5" />
                        Líneas
                      </p>
                    </div>
                    <div className="text-center">
                      <p
                        className={`text-lg font-heading font-bold font-mono ${
                          alerts > 0 ? "text-[var(--tl-danger)]" : "text-[var(--tl-success)]"
                        }`}
                      >
                        {alerts}
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center justify-center gap-0.5">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        Alertas
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 mt-4 text-xs text-[var(--tl-primary)] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    Ver red <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Active Cercanías alerts */}
        {data.cercaniasAlerts.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="flex items-center gap-2 font-heading font-semibold text-red-700 dark:text-red-400">
                <AlertTriangle className="w-4.5 h-4.5" />
                Incidencias activas en Cercanías ({data.cercaniasAlerts.length})
              </h3>
              <Link
                href="/trenes/incidencias"
                className="text-xs font-semibold text-red-700 dark:text-red-400 hover:underline flex items-center gap-1"
              >
                Ver todas <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {data.cercaniasAlerts.slice(0, 8).map((a) => (
                <div key={a.id} className="flex flex-col gap-1.5">
                  <div className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 mt-1.5" />
                    <p className="min-w-0 line-clamp-2">
                      <span className="font-semibold">
                        {EFFECT_LABELS[a.effect] || "Incidencia"} ·{" "}
                        {a.networks.join(", ")}:
                      </span>{" "}
                      {a.headerText || a.description}
                    </p>
                  </div>
                  {a.lines.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 ml-3.5">
                      {a.lines.map(
                        (l) =>
                          l.slug && (
                            <Link
                              key={l.slug}
                              href={`/trenes/linea/${l.slug}`}
                              className="px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                            >
                              {l.shortName || "línea"}
                            </Link>
                          )
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Link to full map */}
        <div className="bg-[var(--tl-primary-bg)] dark:bg-[var(--tl-primary-bg)] border border-[var(--tl-primary)]/20 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="font-heading font-semibold text-[var(--tl-primary)] text-sm">
              Mapa interactivo ferroviario
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              Visualiza todas las redes, estaciones y trenes en tiempo real en el mapa nacional
            </p>
          </div>
          <Link
            href="/trenes"
            className="shrink-0 flex items-center gap-1.5 bg-[var(--tl-primary)] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[var(--tl-primary-hover)] transition-colors"
          >
            <Train className="w-4 h-4" />
            Ir al mapa
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Attribution */}
        <p className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <Info className="w-3 h-3 shrink-0" />
          Datos: Renfe Operadora (CC-BY 4.0). Alertas actualizadas cada 2 minutos.
        </p>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Cercanías de España — 12 redes",
            description:
              "Directorio de las 12 redes de Cercanías de España con estaciones, líneas y alertas.",
            url: `${BASE_URL}/trenes/cercanias`,
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
