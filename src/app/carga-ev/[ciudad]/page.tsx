import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CiudadCargaEVContent from "./content";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import LinkDirectory from "@/components/seo/LinkDirectory";
import prisma, { isBuildWithoutDb } from "@/lib/db";
import { EV_CITIES as CITIES, evCityProvinceSlug } from "@/lib/geo/ev-cities";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// Without this the page is FULLY static: the DB-less build's copy (no charger
// directory, empty data) was cached forever — x-nextjs-cache HIT on a build
// prerender with no expiry. 300 puts it on the same heal cadence as the rest.
export const revalidate = 300;


type Props = {
  params: Promise<{ ciudad: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ciudad } = await params;
  const cityData = CITIES[ciudad];

  if (!cityData) {
    return {
      title: "Ciudad no encontrada",
    };
  }

  return {
    title: `Cargadores Eléctricos en ${cityData.name}`,
    description: `Encuentra puntos de carga para vehículos eléctricos en ${cityData.name}. Mapa de cargadores, potencia disponible y tipos de conectores.`,
    keywords: [
      `cargadores ${cityData.name}`,
      `puntos de carga ${cityData.name}`,
      "vehículos eléctricos",
      "EV",
      "electrolineras",
      cityData.province,
    ],
    alternates: {
      canonical: `${BASE_URL}/carga-ev/${ciudad}`,
    },
    openGraph: {
      title: `Cargadores Eléctricos en ${cityData.name}`,
      description: `Encuentra puntos de carga para vehículos eléctricos en ${cityData.name}. Mapa de cargadores, potencia disponible y tipos de conectores.`,
      url: `${BASE_URL}/carga-ev/${ciudad}`,
      images: [`${BASE_URL}/og-image.webp`],
    },
  };
}

export function generateStaticParams() {
  if (isBuildWithoutDb()) return [];
  return Object.keys(CITIES).map((ciudad) => ({ ciudad }));
}

export default async function CiudadCargaEVPage({ params }: Props) {
  const { ciudad } = await params;
  const cityData = CITIES[ciudad];

  if (!cityData) {
    notFound();
  }

  // Server-rendered so crawlers can reach the charger detail pages: the
  // interactive content below is a client component, and the 12k
  // /carga-ev/punto/* pages had no crawlable inbound links at all. NOTE: this
  // is the REAL city route — /electrolineras/:city 308s here (next.config), so
  // an earlier attempt to add this on that route never served.
  const chargers = await prisma.eVCharger.findMany({
    where: { city: { contains: cityData.name, mode: "insensitive" }, isPublic: true },
    orderBy: { powerKw: "desc" },
    select: { id: true, name: true, address: true, city: true, powerKw: true },
    take: 500,
  });

  return (
    <>
      <Breadcrumbs
        items={[
          { name: "Inicio", href: "/" },
          { name: "Puntos de Recarga", href: "/carga-ev" },
          { name: cityData.name, href: `/carga-ev/${ciudad}` },
        ]}
      />
      <CiudadCargaEVContent ciudad={ciudad} cityData={cityData} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <LinkDirectory
          title={`Todos los puntos de carga en ${cityData.name}`}
          description="Índice de cargadores públicos con potencia, para acceso directo a cada punto."
          items={chargers.map((c) => ({
            href: `/carga-ev/punto/${encodeURIComponent(c.id)}`,
            label: [c.name || c.address, c.powerKw ? `${Number(c.powerKw).toFixed(0)} kW` : null]
              .filter(Boolean)
              .join(" · "),
            group: c.city,
          }))}
        />
        <p className="mt-6 text-sm">
          <Link
            href={`/carga-ev/provincia/${evCityProvinceSlug(cityData)}`}
            className="font-semibold text-tl-600 dark:text-tl-400 hover:underline"
          >
            Todos los puntos de carga de la provincia de {cityData.province}
          </Link>
        </p>
      </div>
    </>
  );
}
