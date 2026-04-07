import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  Ship,
  Anchor,
  Compass,
  ArrowRight,
  Navigation,
  MapPin,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";

export const revalidate = 300;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Zonas Maritimas de Espana — Trafico Maritimo por Zonas Costeras",
  description:
    "Explora las 11 zonas maritimas de Espana: Galicia, Cantabrico, Baleares, Mediterraneo, Estrecho de Gibraltar, Canarias y mas. Buques activos, puertos y alertas costeras por zona.",
  alternates: {
    canonical: `${BASE_URL}/maritimo/zonas`,
  },
  openGraph: {
    title: "Zonas Maritimas de Espana | trafico.live",
    description:
      "Trafico maritimo por zonas costeras: buques activos, puertos y alertas meteorologicas.",
    url: `${BASE_URL}/maritimo/zonas`,
    type: "website",
    locale: "es_ES",
  },
};

// ---------------------------------------------------------------------------
// Zone definitions (same as detail page, ordered geographically)
// ---------------------------------------------------------------------------

interface ZoneDef {
  slug: string;
  label: string;
  bbox: [number, number, number, number];
  provinces: string[];
  shortDesc: string;
}

const ZONES: ZoneDef[] = [
  {
    slug: "galicia",
    label: "Galicia",
    bbox: [-9.3, 41.8, -7.0, 43.8],
    provinces: ["15", "27", "32", "36"],
    shortDesc: "Rias Baixas y Altas, trafico pesquero intenso",
  },
  {
    slug: "cantabrico",
    label: "Cantabrico",
    bbox: [-7.0, 43.2, -1.7, 44.0],
    provinces: ["33", "39", "48", "20"],
    shortDesc: "Litoral cantabrico, Asturias a Pais Vasco",
  },
  {
    slug: "golfo-vizcaya",
    label: "Golfo de Vizcaya",
    bbox: [-4.0, 43.3, -1.0, 44.5],
    provinces: ["48", "20"],
    shortDesc: "Transito internacional hacia el norte de Europa",
  },
  {
    slug: "mediterraneo-norte",
    label: "Mediterraneo Norte",
    bbox: [0.5, 40.5, 3.5, 42.5],
    provinces: ["08", "17", "43"],
    shortDesc: "Costa catalana, Puerto de Barcelona",
  },
  {
    slug: "baleares",
    label: "Baleares",
    bbox: [1.0, 38.5, 4.5, 40.5],
    provinces: ["07"],
    shortDesc: "Mallorca, Menorca, Ibiza y Formentera",
  },
  {
    slug: "mediterraneo-central",
    label: "Mediterraneo Central",
    bbox: [-1.0, 37.5, 1.0, 40.5],
    provinces: ["46", "12", "03"],
    shortDesc: "Comunitat Valenciana, hub de contenedores",
  },
  {
    slug: "mediterraneo-sur",
    label: "Mediterraneo Sur",
    bbox: [-5.5, 35.8, -1.0, 37.5],
    provinces: ["29", "18", "04", "30"],
    shortDesc: "Mar de Alboran, Murcia a Malaga",
  },
  {
    slug: "estrecho",
    label: "Estrecho de Gibraltar",
    bbox: [-6.0, 35.5, -5.0, 36.5],
    provinces: ["11"],
    shortDesc: "Ruta mas transitada del Mediterraneo",
  },
  {
    slug: "golfo-cadiz",
    label: "Golfo de Cadiz",
    bbox: [-7.5, 36.0, -6.0, 37.5],
    provinces: ["11", "21"],
    shortDesc: "Atlantico sur andaluz, pesca de altura",
  },
  {
    slug: "atlantico-sur",
    label: "Atlantico Sur",
    bbox: [-7.5, 36.5, -6.0, 37.5],
    provinces: ["21", "11"],
    shortDesc: "Frontera maritima con Portugal",
  },
  {
    slug: "canarias",
    label: "Canarias",
    bbox: [-18.5, 27.5, -13.0, 29.5],
    provinces: ["35", "38"],
    shortDesc: "Bunkering y escala transatlantica",
  },
];

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getZoneCounts(): Promise<
  Map<string, { vessels: number; ports: number }>
> {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const counts = new Map<string, { vessels: number; ports: number }>();

  // Fetch all vessel positions in one query (last 2h, distinct mmsi)
  const allPositions = await prisma.vesselPosition.findMany({
    where: { createdAt: { gte: twoHoursAgo } },
    distinct: ["mmsi"],
    orderBy: { createdAt: "desc" },
    select: {
      mmsi: true,
      latitude: true,
      longitude: true,
    },
  });

  // Fetch all ports
  const allPorts = await prisma.spanishPort.findMany({
    select: { province: true },
  });

  for (const zone of ZONES) {
    const [minLng, minLat, maxLng, maxLat] = zone.bbox;

    // Count vessels in bbox
    const vesselCount = allPositions.filter((p) => {
      const lat = Number(p.latitude);
      const lng = Number(p.longitude);
      return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
    }).length;

    // Count ports by province
    const portCount = allPorts.filter(
      (p) => p.province && zone.provinces.includes(p.province)
    ).length;

    counts.set(zone.slug, { vessels: vesselCount, ports: portCount });
  }

  return counts;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function densityBorder(vesselCount: number): string {
  if (vesselCount >= 200) return "border-t-red-500";
  if (vesselCount >= 50) return "border-t-tl-amber-500";
  return "border-t-green-500";
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ZonasIndexPage() {
  const zoneCounts = await getZoneCounts();

  // Total active vessels across all zones
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const totalVessels = await prisma.vesselPosition.findMany({
    where: { createdAt: { gte: twoHoursAgo } },
    distinct: ["mmsi"],
    select: { mmsi: true },
  });

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Zonas Maritimas de Espana",
    description:
      "Las 11 zonas maritimas costeras de Espana con seguimiento AIS de buques en tiempo real.",
    url: `${BASE_URL}/maritimo/zonas`,
    inLanguage: "es",
    publisher: {
      "@type": "Organization",
      name: "trafico.live",
      url: BASE_URL,
    },
  };

  return (
    <>
      <StructuredData data={webPageSchema} />

      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Maritimo", href: "/maritimo" },
            { name: "Zonas Maritimas", href: "/maritimo/zonas" },
          ]}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Hero                                                                */}
      {/* ------------------------------------------------------------------ */}
      <section
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, var(--color-tl-sea-800) 0%, var(--color-tl-sea-600) 50%, var(--color-tl-sea-500) 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute -bottom-12 -right-12 w-72 h-72 rounded-full opacity-10"
          style={{ background: "var(--color-tl-sea-300)" }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -top-8 -left-8 w-48 h-48 rounded-full opacity-10"
          style={{ background: "var(--color-tl-sea-200)" }}
          aria-hidden="true"
        />

        <div className="relative max-w-7xl mx-auto px-4 py-14 md:py-18">
          <div className="flex items-center gap-3 mb-3">
            <Compass className="w-8 h-8 text-tl-sea-200" />
            <span className="font-heading text-tl-sea-200 text-sm font-semibold uppercase tracking-widest">
              trafico.live / Maritimo
            </span>
          </div>
          <h1 className="font-heading text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Zonas Maritimas de Espana
          </h1>
          <p className="text-tl-sea-100 text-lg max-w-2xl leading-relaxed">
            Seguimiento del trafico maritimo en las 11 zonas costeras de Espana.
            Buques activos, puertos, alertas y condiciones meteorologicas por zona.
          </p>

          {/* Total vessels badge */}
          <div className="flex items-center gap-3 mt-6">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tl-sea-300 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-tl-sea-200" />
            </span>
            <span className="text-white font-semibold">
              <span className="font-mono">{totalVessels.length}</span> buques
              detectados en aguas españolas
            </span>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10 space-y-12">
        {/* ---------------------------------------------------------------- */}
        {/* Zone cards grid                                                   */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Zonas maritimas">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {ZONES.map((zone) => {
              const stats = zoneCounts.get(zone.slug) ?? {
                vessels: 0,
                ports: 0,
              };

              return (
                <Link
                  key={zone.slug}
                  href={`/maritimo/zonas/${zone.slug}`}
                  className={`group flex flex-col gap-4 p-6 rounded-xl border-t-4 border bg-white dark:bg-gray-900 border-tl-sea-200 dark:border-tl-sea-800/50 hover:border-tl-sea-400 dark:hover:border-tl-sea-600 hover:shadow-md transition-all ${densityBorder(stats.vessels)}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">
                        {zone.label}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                        {zone.shortDesc}
                      </p>
                    </div>
                    <Navigation className="w-5 h-5 text-tl-sea-400 dark:text-tl-sea-500 flex-shrink-0 mt-1" />
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <Ship className="w-4 h-4 text-tl-sea-500 dark:text-tl-sea-400" />
                      <span className="font-mono text-sm font-bold text-gray-900 dark:text-gray-100">
                        {stats.vessels}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        buques
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Anchor className="w-4 h-4 text-tl-sea-500 dark:text-tl-sea-400" />
                      <span className="font-mono text-sm font-bold text-gray-900 dark:text-gray-100">
                        {stats.ports}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        puertos
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-tl-sea-600 dark:text-tl-sea-400 text-sm font-medium group-hover:gap-2 transition-all mt-auto">
                    Explorar zona <ArrowRight className="w-4 h-4" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Legend                                                             */}
        {/* ---------------------------------------------------------------- */}
        <section
          className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 p-6"
          aria-label="Leyenda de densidad"
        >
          <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
            Densidad de trafico
          </h2>
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-8 h-1 rounded-full bg-green-500" />
              <span className="text-gray-600 dark:text-gray-400">
                Baja (&lt; 50 buques)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-1 rounded-full bg-tl-amber-500" />
              <span className="text-gray-600 dark:text-gray-400">
                Media (50-200 buques)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-1 rounded-full bg-red-500" />
              <span className="text-gray-600 dark:text-gray-400">
                Alta (&gt; 200 buques)
              </span>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* SEO text                                                          */}
        {/* ---------------------------------------------------------------- */}
        <section
          className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 p-8"
          aria-label="Informacion sobre zonas maritimas"
        >
          <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Zonas Costeras y Trafico Maritimo en Espana
          </h2>
          <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 space-y-3">
            <p>
              Espana cuenta con mas de <strong>8.000 kilometros de costa</strong>{" "}
              repartidos entre el oceano Atlantico, el mar Mediterraneo y el mar
              Cantabrico. El litoral se divide en zonas maritimas diferenciadas
              por sus condiciones oceanograficas, trafico naval y actividad
              portuaria.
            </p>
            <p>
              El sistema AIS (Automatic Identification System) permite rastrear
              en tiempo real la posicion, velocidad y rumbo de miles de buques
              que transitan por aguas españolas. trafico.live recopila estas
              señales y las organiza por zona costera para facilitar el
              seguimiento del trafico maritimo.
            </p>
            <p>
              Las zonas de mayor densidad de trafico se concentran en el{" "}
              <strong>Estrecho de Gibraltar</strong> (paso obligado entre el
              Atlantico y el Mediterraneo), el{" "}
              <strong>Mediterraneo Norte</strong> (Puerto de Barcelona) y la{" "}
              <strong>Comunitat Valenciana</strong> (Puerto de Valencia, mayor
              hub de contenedores de Espana).
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Fuentes: aisstream.io (posiciones AIS), Puertos del Estado
              (directorio portuario), AEMET (alertas costeras). Datos
              actualizados cada 5 minutos.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
