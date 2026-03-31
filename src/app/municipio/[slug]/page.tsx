import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";
import {
  MapPin,
  Fuel,
  Camera,
  Radar,
  Zap,
  AlertTriangle,
  Users,
  Ruler,
} from "lucide-react";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const municipality = await prisma.municipality.findUnique({
    where: { slug },
    include: { province: true },
  });

  if (!municipality) {
    return { title: "Municipio no encontrado" };
  }

  const { name, province } = municipality;

  return {
    title: `Tráfico en ${name} — Información local de tráfico`,
    description: `Tráfico en ${name} (${province.name}) en tiempo real: incidencias activas, cámaras de tráfico, radares, gasolineras, cargadores eléctricos y más.`,
    keywords: [
      `tráfico ${name}`,
      `incidencias ${name}`,
      `cámaras ${name}`,
      `gasolineras ${name}`,
      `radares ${name}`,
      `${name} ${province.name}`,
    ],
    alternates: {
      canonical: `${BASE_URL}/municipio/${slug}`,
    },
    openGraph: {
      title: `Tráfico en ${name}`,
      description: `Estado del tráfico, gasolineras, radares y cargadores eléctricos en ${name}, ${province.name}.`,
      url: `${BASE_URL}/municipio/${slug}`,
      type: "website",
    },
  };
}

export default async function MunicipioPage({ params }: Props) {
  const { slug } = await params;

  const municipality = await prisma.municipality.findUnique({
    where: { slug },
    include: { province: true },
  });

  if (!municipality) {
    notFound();
  }

  const provinceCode = municipality.provinceCode;

  const munCode = municipality.code;
  const [
    gasStationCount,
    cameraCount,
    incidentCount,
    radarCount,
    evChargerCount,
  ] = await Promise.all([
    // Gas stations filtered at municipality level (has municipalityCode)
    prisma.gasStation.count({ where: { municipalityCode: munCode } }),
    // Cameras/incidents/radars only have province-level data
    prisma.camera.count({ where: { province: provinceCode } }),
    prisma.trafficIncident.count({
      where: { province: provinceCode, isActive: true },
    }),
    prisma.radar.count({ where: { province: provinceCode } }),
    prisma.eVCharger.count({ where: { province: provinceCode } }),
  ]);

  const { name, province, population, area, latitude, longitude } =
    municipality;

  // JSON-LD: City / Place schema
  const placeSchema = {
    "@context": "https://schema.org",
    "@type": "City",
    name,
    containedInPlace: {
      "@type": "AdministrativeArea",
      name: province.name,
    },
    ...(latitude && longitude
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: Number(latitude),
            longitude: Number(longitude),
          },
        }
      : {}),
    ...(population ? { numberOfEmployees: undefined, population } : {}),
    url: `${BASE_URL}/municipio/${slug}`,
  };

  // JSON-LD: FAQPage schema
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `¿Cuántas gasolineras hay en ${name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: gasStationCount > 0
            ? `En ${name} hay ${gasStationCount} gasolineras registradas. Puedes consultar precios actualizados y encontrar la más barata en trafico.live/gasolineras.`
            : `No hay gasolineras registradas directamente en ${name}. Consulta las gasolineras cercanas en la provincia de ${province.name}.`,
        },
      },
      {
        "@type": "Question",
        name: `¿Hay incidencias de tráfico activas en ${name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text:
            incidentCount > 0
              ? `Actualmente hay ${incidentCount} incidencia${incidentCount > 1 ? "s" : ""} activa${incidentCount > 1 ? "s" : ""} en la provincia de ${province.name}. Consulta el detalle en tiempo real en trafico.live.`
              : `No hay incidencias de tráfico activas registradas en la provincia de ${province.name} en este momento.`,
        },
      },
    ],
  };

  const stats = [
    {
      label: "Gasolineras",
      value: gasStationCount,
      icon: <Fuel className="w-5 h-5" />,
      color: "text-tl-amber-600 dark:text-tl-amber-400",
      bg: "bg-tl-amber-50 dark:bg-tl-amber-900/20",
      href: `/gasolineras/precios/${provinceCode}`,
    },
    {
      label: "Cámaras",
      value: cameraCount,
      icon: <Camera className="w-5 h-5" />,
      color: "text-tl-600 dark:text-tl-400",
      bg: "bg-tl-50 dark:bg-tl-900/20",
      href: `/camaras`,
    },
    {
      label: "Radares",
      value: radarCount,
      icon: <Radar className="w-5 h-5" />,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-900/20",
      href: `/radares`,
    },
    {
      label: "Incidencias activas",
      value: incidentCount,
      icon: <AlertTriangle className="w-5 h-5" />,
      color: incidentCount > 0 ? "text-orange-600 dark:text-orange-400" : "text-gray-400",
      bg: incidentCount > 0 ? "bg-orange-50 dark:bg-orange-900/20" : "bg-gray-50 dark:bg-gray-950",
      href: `/incidencias`,
    },
    {
      label: "Cargadores EV",
      value: evChargerCount,
      icon: <Zap className="w-5 h-5" />,
      color: "text-tl-600 dark:text-tl-400",
      bg: "bg-tl-50 dark:bg-tl-900/20",
      href: `/carga-ev`,
    },
    {
      label: "ZBE",
      value: "Ver info",
      icon: <MapPin className="w-5 h-5" />,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-900/20",
      href: `/zbe`,
      isText: true,
    },
  ];

  const relatedLinks = [
    {
      title: `Gasolineras en ${province.name}`,
      description: "Precios actualizados de combustible",
      href: `/gasolineras/precios/${provinceCode}`,
      icon: <Fuel className="w-4 h-4" />,
    },
    {
      title: "Cámaras de tráfico",
      description: "Imágenes en tiempo real de la DGT",
      href: `/camaras`,
      icon: <Camera className="w-4 h-4" />,
    },
    {
      title: "Radares de velocidad",
      description: "Todos los radares fijos y de tramo",
      href: `/radares`,
      icon: <Radar className="w-4 h-4" />,
    },
    {
      title: "Carga eléctrica",
      description: "Puntos de recarga para vehículos eléctricos",
      href: `/carga-ev`,
      icon: <Zap className="w-4 h-4" />,
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(placeSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumbs */}
          <Breadcrumbs
            items={[
              { name: "Inicio", href: "/" },
              { name: province.name, href: `/provincias/${provinceCode}` },
              { name, href: `/municipio/${slug}` },
            ]}
          />

          {/* Hero */}
          <div className="mb-8">
            <div className="flex items-center gap-1.5 text-sm text-tl-600 dark:text-tl-400 mb-2">
              <MapPin className="w-4 h-4" />
              <Link
                href={`/provincias/${provinceCode}`}
                className="hover:underline"
              >
                {province.name}
              </Link>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">
              Tráfico en {name}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-2xl">
              Información de tráfico local en {name}: incidencias activas,
              cámaras, radares, gasolineras y puntos de carga eléctrica.
            </p>

            {/* Municipality meta */}
            {(population || area) && (
              <div className="flex flex-wrap gap-4 mt-4">
                {population && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                    <Users className="w-4 h-4" />
                    <span>
                      {population.toLocaleString("es-ES")} habitantes
                    </span>
                  </div>
                )}
                {area && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                    <Ruler className="w-4 h-4" />
                    <span>{Number(area).toLocaleString("es-ES")} km²</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Stats grid */}
          <section aria-labelledby="stats-heading" className="mb-8">
            <h2
              id="stats-heading"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4"
            >
              Infraestructura en {name} y provincia
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {stats.map((stat) => (
                <Link
                  key={stat.label}
                  href={stat.href}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 hover:shadow-md hover:border-tl-300 transition-all group"
                >
                  <div
                    className={`inline-flex p-2 rounded-lg ${stat.bg} mb-3`}
                  >
                    <span className={stat.color}>{stat.icon}</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {"isText" in stat && stat.isText
                      ? stat.value
                      : (stat.value as number).toLocaleString("es-ES")}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</p>
                </Link>
              ))}
            </div>
          </section>

          {/* Quick info card */}
          <section className="mb-8">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Datos del municipio
              </h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <div className="flex justify-between sm:block">
                  <dt className="text-gray-500 dark:text-gray-400">Nombre</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100 sm:mt-0.5">
                    {name}
                  </dd>
                </div>
                <div className="flex justify-between sm:block">
                  <dt className="text-gray-500 dark:text-gray-400">Provincia</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100 sm:mt-0.5">
                    <Link
                      href={`/provincias/${provinceCode}`}
                      className="text-tl-600 dark:text-tl-400 hover:underline"
                    >
                      {province.name}
                    </Link>
                  </dd>
                </div>
                {population && (
                  <div className="flex justify-between sm:block">
                    <dt className="text-gray-500 dark:text-gray-400">Población</dt>
                    <dd className="font-medium text-gray-900 dark:text-gray-100 sm:mt-0.5">
                      {population.toLocaleString("es-ES")} hab.
                    </dd>
                  </div>
                )}
                {area && (
                  <div className="flex justify-between sm:block">
                    <dt className="text-gray-500 dark:text-gray-400">Superficie</dt>
                    <dd className="font-medium text-gray-900 dark:text-gray-100 sm:mt-0.5">
                      {Number(area).toLocaleString("es-ES")} km²
                    </dd>
                  </div>
                )}
                {latitude && longitude && (
                  <div className="flex justify-between sm:block">
                    <dt className="text-gray-500 dark:text-gray-400">Coordenadas</dt>
                    <dd className="font-medium text-gray-900 dark:text-gray-100 sm:mt-0.5">
                      {Number(latitude).toFixed(4)},{" "}
                      {Number(longitude).toFixed(4)}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between sm:block">
                  <dt className="text-gray-500 dark:text-gray-400">Código INE</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100 sm:mt-0.5 font-mono">
                    {municipality.code}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          {/* FAQ section — also rendered for SEO visibility */}
          <section className="mb-8">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Preguntas frecuentes
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    ¿Cuántas gasolineras hay en {name}?
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {gasStationCount > 0 ? (
                      <>
                        En {name} hay{" "}
                        <strong>{gasStationCount}</strong> gasolineras registradas.
                        Puedes consultar precios actualizados y encontrar la más
                        barata en nuestra sección de gasolineras.
                      </>
                    ) : (
                      <>
                        No hay gasolineras registradas directamente en {name}.
                        Consulta las gasolineras cercanas en la provincia de {province.name}.
                      </>
                    )}
                  </p>
                </div>
                <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    ¿Hay incidencias de tráfico activas en {name}?
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {incidentCount > 0 ? (
                      <>
                        Actualmente hay{" "}
                        <strong className="text-orange-600 dark:text-orange-400">
                          {incidentCount} incidencia
                          {incidentCount > 1 ? "s" : ""} activa
                          {incidentCount > 1 ? "s" : ""}
                        </strong>{" "}
                        en la provincia de {province.name}.
                      </>
                    ) : (
                      <>
                        No hay incidencias de tráfico activas en la provincia
                        de {province.name} en este momento.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Related links */}
          <RelatedLinks
            title="Información de tráfico relacionada"
            links={relatedLinks}
          />
        </main>
      </div>
    </>
  );
}
