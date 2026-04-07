import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Train, ArrowLeft, AlertTriangle, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

export const revalidate = 3600;
export const dynamicParams = true;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

type Props = {
  params: Promise<{ community: string; province: string }>;
};

const SERVICE_TYPE_LABELS: Record<string, string> = {
  CERCANIAS: "Cercanias",
  AVE: "AVE",
  AVLO: "AVLO",
  ALVIA: "Alvia",
  AVANT: "Avant",
  EUROMED: "Euromed",
  LARGA_DISTANCIA: "Larga Distancia",
  MEDIA_DISTANCIA: "Media Distancia",
  REGIONAL: "Regional",
  REGIONAL_EXPRESS: "Reg. Expres",
  PROXIMIDAD: "Proximidad",
  INTERCITY: "Intercity",
  TRENHOTEL: "Trenhotel",
  TRENCELTA: "TrenCelta",
  FEVE: "FEVE",
  RODALIES: "Rodalies",
};

const SERVICE_TYPE_COLORS: Record<string, string> = {
  CERCANIAS: "bg-tl-100 text-tl-700",
  RODALIES: "bg-tl-100 text-tl-700",
  AVE: "bg-red-100 text-red-700",
  AVLO: "bg-red-100 text-red-700",
  ALVIA: "bg-orange-100 text-orange-700",
  AVANT: "bg-orange-100 text-orange-700",
  EUROMED: "bg-orange-100 text-orange-700",
  LARGA_DISTANCIA: "bg-purple-100 text-purple-700",
  MEDIA_DISTANCIA: "bg-indigo-100 text-indigo-700",
  REGIONAL: "bg-gray-100 text-gray-700",
  REGIONAL_EXPRESS: "bg-gray-100 text-gray-700",
  PROXIMIDAD: "bg-blue-100 text-blue-700",
  INTERCITY: "bg-purple-100 text-purple-700",
  TRENHOTEL: "bg-indigo-100 text-indigo-700",
  TRENCELTA: "bg-green-100 text-green-700",
  FEVE: "bg-green-100 text-green-700",
};

async function getProvince(communitySlug: string, provinceSlug: string) {
  const province = await prisma.province.findUnique({
    where: { slug: provinceSlug },
    include: { community: true },
  });
  if (!province || province.community.slug !== communitySlug) return null;
  return province;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { community, province: provSlug } = await params;
  const prov = await getProvince(community, provSlug);
  if (!prov) return { title: "Provincia no encontrada" };

  const title = `Trenes en ${prov.name} — Estaciones y rutas ferroviarias`;
  const description = `Estaciones de tren en ${prov.name} (${prov.community.name}). Red de Cercanias, AVE, Alvia, Media Distancia y mas. Alertas activas y rutas.`;

  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/espana/${community}/${provSlug}/trenes` },
    openGraph: {
      title: `Trenes en ${prov.name}`,
      description,
      url: `${BASE_URL}/espana/${community}/${provSlug}/trenes`,
      type: "website",
    },
  };
}

export async function generateStaticParams() {
  return [];
}

export default async function ProvinceTrenesPage({ params }: Props) {
  const { community, province: provSlug } = await params;
  const prov = await getProvince(community, provSlug);
  if (!prov) notFound();

  // Fetch all stations in province
  const stations = await prisma.railwayStation.findMany({
    where: { province: prov.code },
    orderBy: { name: "asc" },
  });

  if (stations.length === 0) notFound();

  // Group stations by network
  const networkMap = new Map<string, typeof stations>();
  const noNetwork: typeof stations = [];
  for (const s of stations) {
    if (s.network) {
      const list = networkMap.get(s.network) ?? [];
      list.push(s);
      networkMap.set(s.network, list);
    } else {
      noNetwork.push(s);
    }
  }
  const networks = Array.from(networkMap.entries()).sort((a, b) =>
    a[0].localeCompare(b[0], "es")
  );

  // Collect all station names for route matching
  const stationNames = stations.map((s) => s.name);

  // Routes serving these stations
  const routes = await prisma.railwayRoute.findMany({
    where: {
      stopNames: { hasSome: stationNames },
    },
    orderBy: [{ brand: "asc" }, { longName: "asc" }],
    take: 50,
  });

  // Active alerts mentioning province stations
  const stationStopIds = stations.map((s) => s.stopId);
  const alerts = await prisma.railwayAlert.findMany({
    where: {
      isActive: true,
      OR: [
        { stopIds: { hasSome: stationStopIds } },
      ],
    },
    orderBy: { activePeriodStart: "desc" },
    take: 10,
  });

  // Count service types
  const serviceTypeCounts = new Map<string, number>();
  for (const s of stations) {
    for (const st of s.serviceTypes) {
      serviceTypeCounts.set(st, (serviceTypeCounts.get(st) ?? 0) + 1);
    }
  }
  const sortedServiceTypes = Array.from(serviceTypeCounts.entries()).sort(
    (a, b) => b[1] - a[1]
  );

  const breadcrumbs = [
    { name: "Inicio", href: "/" },
    { name: "Espana", href: "/espana" },
    { name: prov.community.name, href: `/espana/${community}` },
    { name: prov.name, href: `/espana/${community}/${provSlug}` },
    { name: "Trenes", href: `/espana/${community}/${provSlug}/trenes` },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Breadcrumbs items={breadcrumbs} />

        {/* Hero */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-tl-50 flex items-center justify-center shrink-0">
              <Train className="w-6 h-6 text-tl-600" />
            </div>
            <div className="flex-1">
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-gray-900">
                Trenes en {prov.name}
              </h1>
              <p className="mt-1 text-sm text-gray-500">{prov.community.name}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                  <p className="font-data text-lg font-bold text-gray-900">
                    {stations.length}
                  </p>
                  <p className="text-[10px] text-gray-500">Estaciones</p>
                </div>
                <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                  <p className="font-data text-lg font-bold text-gray-900">
                    {routes.length}
                  </p>
                  <p className="text-[10px] text-gray-500">Rutas</p>
                </div>
                <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                  <p className="font-data text-lg font-bold text-gray-900">
                    {networks.length}
                  </p>
                  <p className="text-[10px] text-gray-500">Redes</p>
                </div>
                {alerts.length > 0 && (
                  <div className="bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                    <p className="font-data text-lg font-bold text-red-700">
                      {alerts.length}
                    </p>
                    <p className="text-[10px] text-red-600">Alertas activas</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Service types summary */}
        {sortedServiceTypes.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="font-heading text-lg font-bold text-gray-900 mb-4">
              Tipos de servicio
            </h2>
            <div className="flex flex-wrap gap-2">
              {sortedServiceTypes.map(([type, count]) => (
                <span
                  key={type}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    SERVICE_TYPE_COLORS[type] ?? "bg-gray-100 text-gray-700"
                  }`}
                >
                  {SERVICE_TYPE_LABELS[type] ?? type}{" "}
                  <span className="font-data">({count})</span>
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Active alerts */}
        {alerts.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h2 className="font-heading text-lg font-bold text-gray-900">
                Alertas activas
              </h2>
            </div>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-xl border border-red-100 bg-red-50 p-4"
                >
                  {alert.headerText && (
                    <p className="text-sm font-semibold text-red-800 mb-1">
                      {alert.headerText}
                    </p>
                  )}
                  <p className="text-sm text-red-700 line-clamp-3">
                    {alert.description}
                  </p>
                  <p className="text-[10px] text-red-500 mt-2 font-data">
                    Desde{" "}
                    {alert.activePeriodStart.toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {alert.activePeriodEnd &&
                      ` hasta ${alert.activePeriodEnd.toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}`}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Stations by network */}
        {networks.map(([network, netStations]) => (
          <section
            key={network}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6"
          >
            <h2 className="font-heading text-lg font-bold text-gray-900 mb-4">
              Cercanias {network}{" "}
              <span className="text-sm font-normal text-gray-500">
                ({netStations.length} estaciones)
              </span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {netStations.map((station) => (
                <Link
                  key={station.id}
                  href={
                    station.slug
                      ? `/trenes/estacion/${station.slug}`
                      : "/trenes/estaciones"
                  }
                  className="rounded-xl border border-gray-100 bg-gray-50 p-3 hover:border-tl-300 hover:bg-tl-50 transition-all group"
                >
                  <p className="text-sm font-medium text-gray-900 group-hover:text-tl-600 truncate">
                    {station.name}
                  </p>
                  {station.serviceTypes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {station.serviceTypes.slice(0, 4).map((type) => (
                        <span
                          key={type}
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            SERVICE_TYPE_COLORS[type] ??
                            "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {SERVICE_TYPE_LABELS[type] ?? type}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </section>
        ))}

        {/* Stations without network */}
        {noNetwork.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="font-heading text-lg font-bold text-gray-900 mb-4">
              Otras estaciones{" "}
              <span className="text-sm font-normal text-gray-500">
                ({noNetwork.length})
              </span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {noNetwork.map((station) => (
                <Link
                  key={station.id}
                  href={
                    station.slug
                      ? `/trenes/estacion/${station.slug}`
                      : "/trenes/estaciones"
                  }
                  className="rounded-xl border border-gray-100 bg-gray-50 p-3 hover:border-tl-300 hover:bg-tl-50 transition-all group"
                >
                  <p className="text-sm font-medium text-gray-900 group-hover:text-tl-600 truncate">
                    {station.name}
                  </p>
                  {station.serviceTypes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {station.serviceTypes.slice(0, 4).map((type) => (
                        <span
                          key={type}
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            SERVICE_TYPE_COLORS[type] ??
                            "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {SERVICE_TYPE_LABELS[type] ?? type}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Routes serving this province */}
        {routes.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="font-heading text-lg font-bold text-gray-900 mb-4">
              Rutas que pasan por {prov.name}
            </h2>
            <div className="space-y-2">
              {routes.map((route) => (
                <div
                  key={route.id}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3"
                >
                  {route.brand && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        SERVICE_TYPE_COLORS[route.serviceType] ??
                        "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {route.brand}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">
                      {route.originName && route.destName
                        ? `${route.originName} → ${route.destName}`
                        : route.longName ?? route.shortName ?? "Ruta"}
                    </p>
                  </div>
                  {route.shortName && (
                    <span className="text-xs font-data text-gray-500">
                      {route.shortName}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <Link
              href="/trenes/lineas"
              className="mt-4 inline-flex items-center gap-1 text-sm text-tl-600 hover:text-tl-700 font-medium"
            >
              Ver todas las lineas <ChevronRight className="w-4 h-4" />
            </Link>
          </section>
        )}

        {/* Back link + attribution */}
        <div className="flex items-center justify-between mt-8">
          <Link
            href={`/espana/${community}/${provSlug}`}
            className="inline-flex items-center gap-2 text-sm text-tl-600 hover:text-tl-700 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a {prov.name}
          </Link>
          <p className="text-[10px] text-gray-400">
            Fuente: Renfe GTFS, GTFS-RT
          </p>
        </div>
      </div>
    </div>
  );
}
