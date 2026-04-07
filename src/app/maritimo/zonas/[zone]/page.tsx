import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/db";
import {
  Ship,
  Anchor,
  Waves,
  Wind,
  MapPin,
  Navigation,
  AlertTriangle,
  Compass,
  ArrowRight,
  ChevronRight,
  Flag,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";

export const revalidate = 300;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// ---------------------------------------------------------------------------
// Zone definitions
// ---------------------------------------------------------------------------

interface ZoneDef {
  label: string;
  bbox: [number, number, number, number];
  provinces: string[];
  description: string;
  neighbors: string[];
}

const ZONES: Record<string, ZoneDef> = {
  galicia: {
    label: "Galicia",
    bbox: [-9.3, 41.8, -7.0, 43.8],
    provinces: ["15", "27", "32", "36"],
    description:
      "Zona maritima del noroeste peninsular, desde la desembocadura del Mino hasta el cabo Ortegal. Incluye las Rias Baixas y Rias Altas, con intenso trafico pesquero y comercial.",
    neighbors: ["cantabrico", "atlantico-sur"],
  },
  cantabrico: {
    label: "Cantabrico",
    bbox: [-7.0, 43.2, -1.7, 44.0],
    provinces: ["33", "39", "48", "20"],
    description:
      "Litoral cantabrico desde Asturias hasta el Pais Vasco. Aguas abiertas al Atlantico Norte con frecuentes temporales y marejadas.",
    neighbors: ["galicia", "golfo-vizcaya"],
  },
  "golfo-vizcaya": {
    label: "Golfo de Vizcaya",
    bbox: [-4.0, 43.3, -1.0, 44.5],
    provinces: ["48", "20"],
    description:
      "Aguas del golfo de Vizcaya frente al litoral vasco. Zona de transito maritimo internacional entre la Peninsula Iberica y el norte de Europa.",
    neighbors: ["cantabrico", "mediterraneo-norte"],
  },
  "mediterraneo-norte": {
    label: "Mediterraneo Norte",
    bbox: [0.5, 40.5, 3.5, 42.5],
    provinces: ["08", "17", "43"],
    description:
      "Costa catalana desde el Cap de Creus hasta el Delta del Ebro. Puerto de Barcelona como nodo principal de cruceros y contenedores del Mediterraneo.",
    neighbors: ["golfo-vizcaya", "baleares", "mediterraneo-central"],
  },
  baleares: {
    label: "Baleares",
    bbox: [1.0, 38.5, 4.5, 40.5],
    provinces: ["07"],
    description:
      "Archipielago balear con trafico de ferries, cruceros y embarcaciones de recreo. Mallorca, Menorca, Ibiza y Formentera.",
    neighbors: ["mediterraneo-norte", "mediterraneo-central"],
  },
  "mediterraneo-central": {
    label: "Mediterraneo Central",
    bbox: [-1.0, 37.5, 1.0, 40.5],
    provinces: ["46", "12", "03"],
    description:
      "Litoral de la Comunitat Valenciana, desde Castellon hasta Alicante. Puerto de Valencia como mayor hub de contenedores de Espana.",
    neighbors: ["mediterraneo-norte", "baleares", "mediterraneo-sur"],
  },
  "mediterraneo-sur": {
    label: "Mediterraneo Sur",
    bbox: [-5.5, 35.8, -1.0, 37.5],
    provinces: ["29", "18", "04", "30"],
    description:
      "Costa del mar de Alboran, desde Murcia hasta Malaga. Aguas de transicion entre el Atlantico y el Mediterraneo con corrientes complejas.",
    neighbors: ["mediterraneo-central", "estrecho"],
  },
  estrecho: {
    label: "Estrecho de Gibraltar",
    bbox: [-6.0, 35.5, -5.0, 36.5],
    provinces: ["11"],
    description:
      "Una de las rutas maritimas mas transitadas del mundo. Separacion de solo 14 km entre Europa y Africa con intenso trafico de petroleros y portacontenedores.",
    neighbors: ["mediterraneo-sur", "golfo-cadiz"],
  },
  "golfo-cadiz": {
    label: "Golfo de Cadiz",
    bbox: [-7.5, 36.0, -6.0, 37.5],
    provinces: ["11", "21"],
    description:
      "Aguas atlanticas al sur de Andalucia, entre Cadiz y Huelva. Zona de pesca de altura y paso obligado hacia el Estrecho.",
    neighbors: ["estrecho", "atlantico-sur"],
  },
  "atlantico-sur": {
    label: "Atlantico Sur",
    bbox: [-7.5, 36.5, -6.0, 37.5],
    provinces: ["21", "11"],
    description:
      "Costa atlantica de Huelva y suroeste de Cadiz. Frontera maritima con Portugal y acceso a las rutas atlanticas africanas.",
    neighbors: ["golfo-cadiz", "galicia"],
  },
  canarias: {
    label: "Canarias",
    bbox: [-18.5, 27.5, -13.0, 29.5],
    provinces: ["35", "38"],
    description:
      "Archipielago atlantico a 100 km de la costa africana. Importante nodo de suministro de combustible (bunkering) y escala de cruceros transatlanticos.",
    neighbors: [],
  },
};

const ZONE_SLUGS = Object.keys(ZONES);

// ---------------------------------------------------------------------------
// Ship type helpers
// ---------------------------------------------------------------------------

function getShipCategory(shipType: number | null): string {
  if (shipType == null) return "DESCONOCIDO";
  if (shipType >= 70 && shipType <= 79) return "CARGO";
  if (shipType >= 80 && shipType <= 89) return "TANKER";
  if (shipType === 31 || shipType === 32) return "TUG";
  if (shipType === 36 || shipType === 37) return "SAILING";
  if (shipType >= 30 && shipType <= 39) return "FISHING";
  if (shipType >= 60 && shipType <= 69) return "PASSENGER";
  return "OTRO";
}

function getShipCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    CARGO: "Carga",
    TANKER: "Petrolero",
    FISHING: "Pesca",
    PASSENGER: "Pasaje",
    TUG: "Remolcador",
    SAILING: "Velero",
    OTRO: "Otro",
    DESCONOCIDO: "Desconocido",
  };
  return labels[category] || category;
}

function getShipCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    CARGO: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    TANKER: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    FISHING: "bg-tl-sea-100 text-tl-sea-700 dark:bg-tl-sea-900/40 dark:text-tl-sea-300",
    PASSENGER: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    TUG: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    SAILING: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
    OTRO: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    DESCONOCIDO: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
  };
  return colors[category] || colors.OTRO;
}

function getNavStatusLabel(navStatus: number | null): string | null {
  switch (navStatus) {
    case 0:
      return "En navegacion";
    case 1:
      return "Fondeado";
    case 5:
      return "Amarrado";
    case 7:
      return "Pescando";
    case 8:
      return "A vela";
    default:
      return null;
  }
}

/** Country code to flag emoji */
function flagEmoji(code: string | null): string {
  if (!code || code.length !== 2) return "";
  const offset = 0x1f1e6 - 65;
  return String.fromCodePoint(
    code.charCodeAt(0) + offset,
    code.charCodeAt(1) + offset
  );
}

function severityLabel(severity: string): string {
  switch (severity) {
    case "HIGH":
      return "Alta";
    case "VERY_HIGH":
      return "Muy alta";
    case "MEDIUM":
      return "Media";
    case "LOW":
      return "Baja";
    default:
      return severity;
  }
}

function severityClasses(severity: string): { card: string; badge: string } {
  switch (severity) {
    case "HIGH":
    case "VERY_HIGH":
      return {
        card: "border-red-300 bg-red-50 dark:border-red-800/50 dark:bg-red-900/20",
        badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
      };
    case "MEDIUM":
      return {
        card: "border-tl-amber-300 bg-tl-amber-50 dark:border-tl-amber-800/50 dark:bg-tl-amber-900/20",
        badge:
          "bg-tl-amber-100 text-tl-amber-700 dark:bg-tl-amber-900/40 dark:text-tl-amber-300",
      };
    default:
      return {
        card: "border-tl-sea-200 bg-tl-sea-50 dark:border-tl-sea-800/50 dark:bg-tl-sea-900/20",
        badge:
          "bg-tl-sea-100 text-tl-sea-700 dark:bg-tl-sea-900/40 dark:text-tl-sea-300",
      };
  }
}

function portTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    COMMERCIAL: "Comercial",
    FISHING: "Pesquero",
    SPORTS: "Deportivo",
    MIXED: "Mixto",
  };
  return labels[type] || type;
}

// ---------------------------------------------------------------------------
// Static params
// ---------------------------------------------------------------------------

export function generateStaticParams() {
  return ZONE_SLUGS.map((zone) => ({ zone }));
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ zone: string }>;
}): Promise<Metadata> {
  const { zone: slug } = await params;
  const zone = ZONES[slug];

  if (!zone) {
    return { title: "Zona no encontrada" };
  }

  return {
    title: `${zone.label} — Zona Maritima | Buques, Puertos y Meteorologia`,
    description: `Trafico maritimo en ${zone.label}: buques activos, puertos, alertas costeras y condiciones meteorologicas. Seguimiento AIS en tiempo real. ${zone.description}`,
    alternates: {
      canonical: `${BASE_URL}/maritimo/zonas/${slug}`,
    },
    openGraph: {
      title: `${zone.label} — Zona Maritima | trafico.live`,
      description: `Trafico maritimo en ${zone.label}: buques activos, puertos y alertas costeras.`,
      url: `${BASE_URL}/maritimo/zonas/${slug}`,
      type: "website",
      locale: "es_ES",
    },
  };
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

interface VesselRow {
  mmsi: number;
  name: string | null;
  shipType: number | null;
  flag: string | null;
  length: number | null;
  destination: string | null;
  latitude: number;
  longitude: number;
  sog: number | null;
  cog: number | null;
  heading: number | null;
  navStatus: number | null;
  updatedAt: Date;
}

const getZoneData = cache(
  async (
    slug: string
  ): Promise<{
    vessels: VesselRow[];
    ports: {
      slug: string;
      name: string;
      type: string;
      latitude: number;
      longitude: number;
      provinceName: string | null;
      stationCount: number;
    }[];
    alerts: {
      id: string;
      severity: string;
      province: string;
      provinceName: string | null;
      description: string | null;
      startedAt: Date;
      endedAt: Date | null;
      type: string;
      waveHeightM: number | null;
      windSpeedKmh: number | null;
    }[];
  } | null> => {
    const zone = ZONES[slug];
    if (!zone) return null;

    const [minLng, minLat, maxLng, maxLat] = zone.bbox;
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const [vesselPositions, ports, alerts] = await Promise.all([
      prisma.vesselPosition.findMany({
        where: {
          latitude: { gte: minLat, lte: maxLat },
          longitude: { gte: minLng, lte: maxLng },
          createdAt: { gte: twoHoursAgo },
        },
        include: { vessel: true },
        distinct: ["mmsi"],
        orderBy: { createdAt: "desc" },
        take: 200,
      }),

      prisma.spanishPort.findMany({
        where: { province: { in: zone.provinces } },
        orderBy: { name: "asc" },
        select: {
          slug: true,
          name: true,
          type: true,
          latitude: true,
          longitude: true,
          provinceName: true,
          stationCount: true,
        },
      }),

      prisma.weatherAlert.findMany({
        where: {
          province: { in: zone.provinces },
          isActive: true,
          type: { in: ["COASTAL", "STORM", "WIND"] },
        },
        orderBy: [{ severity: "desc" }, { startedAt: "desc" }],
        select: {
          id: true,
          severity: true,
          province: true,
          provinceName: true,
          description: true,
          startedAt: true,
          endedAt: true,
          type: true,
          waveHeightM: true,
          windSpeedKmh: true,
        },
      }),
    ]);

    const vessels: VesselRow[] = vesselPositions.map((vp) => ({
      mmsi: vp.mmsi,
      name: vp.vessel?.name ?? null,
      shipType: vp.vessel?.shipType ?? null,
      flag: vp.vessel?.flag ?? null,
      length: vp.vessel?.length ?? null,
      destination: vp.vessel?.destination ?? null,
      latitude: Number(vp.latitude),
      longitude: Number(vp.longitude),
      sog: vp.sog,
      cog: vp.cog,
      heading: vp.heading,
      navStatus: vp.navStatus,
      updatedAt: vp.createdAt,
    }));

    // Sort by speed descending
    vessels.sort((a, b) => (b.sog ?? 0) - (a.sog ?? 0));

    return {
      vessels,
      ports: ports.map((p) => ({
        slug: p.slug,
        name: p.name,
        type: p.type,
        latitude: Number(p.latitude),
        longitude: Number(p.longitude),
        provinceName: p.provinceName,
        stationCount: p.stationCount,
      })),
      alerts: alerts.map((a) => ({
        id: a.id,
        severity: a.severity,
        province: a.province,
        provinceName: a.provinceName,
        description: a.description,
        startedAt: a.startedAt,
        endedAt: a.endedAt,
        type: a.type,
        waveHeightM: a.waveHeightM ? Number(a.waveHeightM) : null,
        windSpeedKmh: a.windSpeedKmh,
      })),
    };
  }
);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ZoneDetailPage({
  params,
}: {
  params: Promise<{ zone: string }>;
}) {
  const { zone: slug } = await params;
  const zone = ZONES[slug];
  if (!zone) notFound();

  const data = await getZoneData(slug);
  if (!data) notFound();

  const { vessels, ports, alerts } = data;

  // Vessel type counts
  const vesselsByType: Record<string, number> = {};
  for (const v of vessels) {
    const cat = getShipCategory(v.shipType);
    vesselsByType[cat] = (vesselsByType[cat] || 0) + 1;
  }

  // Top 50 vessels for table
  const topVessels = vessels.slice(0, 50);

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${zone.label} — Zona Maritima`,
    description: zone.description,
    url: `${BASE_URL}/maritimo/zonas/${slug}`,
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
            { name: "Zonas", href: "/maritimo/zonas" },
            { name: zone.label, href: `/maritimo/zonas/${slug}` },
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
        {/* Decorative wave rings */}
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
              Zona Maritima
            </span>
          </div>
          <h1 className="font-heading text-3xl md:text-5xl font-bold text-white mb-3 leading-tight">
            {zone.label}
          </h1>
          <p className="text-tl-sea-100 text-lg max-w-2xl leading-relaxed mb-6">
            {zone.description}
          </p>

          {/* Live vessel count pulse */}
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tl-sea-300 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-tl-sea-200" />
            </span>
            <span className="text-white font-semibold text-lg">
              <span className="font-mono">{vessels.length}</span>{" "}
              {vessels.length === 1 ? "buque activo" : "buques activos"} en esta zona
            </span>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10 space-y-12">
        {/* ---------------------------------------------------------------- */}
        {/* Vessel count by type                                              */}
        {/* ---------------------------------------------------------------- */}
        {vessels.length > 0 && (
          <section aria-label="Buques por tipo">
            <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Ship className="w-6 h-6 text-tl-sea-500" />
              Buques por tipo
            </h2>
            <div className="flex flex-wrap gap-3">
              {Object.entries(vesselsByType)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, count]) => (
                  <span
                    key={cat}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${getShipCategoryColor(cat)}`}
                  >
                    {getShipCategoryLabel(cat)}
                    <span className="font-mono">{count}</span>
                  </span>
                ))}
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Vessel table                                                      */}
        {/* ---------------------------------------------------------------- */}
        {topVessels.length > 0 && (
          <section aria-label="Listado de buques">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Navigation className="w-6 h-6 text-tl-sea-500" />
                Buques en {zone.label}
              </h2>
              {vessels.length > 50 && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Mostrando 50 de {vessels.length}
                </span>
              )}
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-tl-sea-200 dark:border-tl-sea-800/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 text-left">
                      <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400">
                        Buque
                      </th>
                      <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                        Tipo
                      </th>
                      <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 hidden md:table-cell">
                        Bandera
                      </th>
                      <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-right">
                        Velocidad
                      </th>
                      <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 hidden lg:table-cell">
                        Estado
                      </th>
                      <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 hidden lg:table-cell">
                        Destino
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {topVessels.map((v) => {
                      const cat = getShipCategory(v.shipType);
                      const status = getNavStatusLabel(v.navStatus);
                      return (
                        <tr
                          key={v.mmsi}
                          className="hover:bg-tl-sea-50 dark:hover:bg-tl-sea-900/20 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <Link
                              href={`/maritimo/buques/${v.mmsi}`}
                              className="font-semibold text-tl-sea-700 dark:text-tl-sea-300 hover:underline"
                            >
                              {v.name || `MMSI ${v.mmsi}`}
                            </Link>
                            <div className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">
                              {v.mmsi}
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${getShipCategoryColor(cat)}`}
                            >
                              {getShipCategoryLabel(cat)}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            {v.flag ? (
                              <span className="inline-flex items-center gap-1.5">
                                <span>{flagEmoji(v.flag)}</span>
                                <span className="text-gray-600 dark:text-gray-400 font-mono text-xs">
                                  {v.flag}
                                </span>
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-mono text-gray-900 dark:text-gray-100">
                              {v.sog != null ? `${v.sog.toFixed(1)} kn` : "-"}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            {status ? (
                              <span className="text-gray-600 dark:text-gray-400 text-xs">
                                {status}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <span className="text-gray-600 dark:text-gray-400 text-xs truncate max-w-[200px] block">
                              {v.destination || "-"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Ports in zone                                                     */}
        {/* ---------------------------------------------------------------- */}
        {ports.length > 0 && (
          <section aria-label="Puertos en la zona">
            <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Anchor className="w-6 h-6 text-tl-sea-500" />
              Puertos en {zone.label}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ports.map((port) => (
                <Link
                  key={port.slug}
                  href={`/maritimo/puertos/${port.slug}`}
                  className="group flex flex-col gap-3 p-5 rounded-xl border bg-white dark:bg-gray-900 border-tl-sea-200 dark:border-tl-sea-800/50 hover:border-tl-sea-400 dark:hover:border-tl-sea-600 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Anchor className="w-5 h-5 text-tl-sea-500 dark:text-tl-sea-400 flex-shrink-0" />
                      <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100">
                        {port.name}
                      </h3>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-tl-sea-100 text-tl-sea-700 dark:bg-tl-sea-900/40 dark:text-tl-sea-300 font-semibold whitespace-nowrap">
                      {portTypeLabel(port.type)}
                    </span>
                  </div>
                  {port.provinceName && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      {port.provinceName}
                    </div>
                  )}
                  {port.stationCount > 0 && (
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      <span className="font-mono">{port.stationCount}</span>{" "}
                      {port.stationCount === 1
                        ? "estacion de combustible"
                        : "estaciones de combustible"}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-tl-sea-600 dark:text-tl-sea-400 text-sm font-medium group-hover:gap-2 transition-all mt-auto">
                    Ver puerto <ArrowRight className="w-4 h-4" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Weather alerts                                                    */}
        {/* ---------------------------------------------------------------- */}
        {alerts.length > 0 && (
          <section aria-label="Alertas costeras">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-tl-amber-500" />
                Alertas Costeras
              </h2>
              <Link
                href="/maritimo/meteorologia"
                className="flex items-center gap-1 text-sm text-tl-sea-600 dark:text-tl-sea-400 hover:underline"
              >
                Ver todas <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {alerts.map((alert) => {
                const cls = severityClasses(alert.severity);
                return (
                  <div
                    key={alert.id}
                    className={`rounded-lg border p-4 ${cls.card}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {alert.type === "WIND" ? (
                          <Wind className="w-4 h-4 text-tl-sea-600 dark:text-tl-sea-400 flex-shrink-0" />
                        ) : (
                          <Waves className="w-4 h-4 text-tl-sea-600 dark:text-tl-sea-400 flex-shrink-0" />
                        )}
                        <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                          {alert.provinceName ?? alert.province}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${cls.badge}`}
                      >
                        {severityLabel(alert.severity)}
                      </span>
                    </div>
                    {alert.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {alert.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-500 font-mono">
                      <span>
                        Desde{" "}
                        {new Date(alert.startedAt).toLocaleDateString("es-ES", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {alert.waveHeightM != null && (
                        <span>Olas {alert.waveHeightM} m</span>
                      )}
                      {alert.windSpeedKmh != null && (
                        <span>Viento {alert.windSpeedKmh} km/h</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Related zones                                                     */}
        {/* ---------------------------------------------------------------- */}
        {zone.neighbors.length > 0 && (
          <section aria-label="Zonas relacionadas">
            <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Compass className="w-6 h-6 text-tl-sea-500" />
              Zonas cercanas
            </h2>
            <div className="flex flex-wrap gap-3">
              {zone.neighbors.map((neighborSlug) => {
                const neighbor = ZONES[neighborSlug];
                if (!neighbor) return null;
                return (
                  <Link
                    key={neighborSlug}
                    href={`/maritimo/zonas/${neighborSlug}`}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border bg-white dark:bg-gray-900 border-tl-sea-200 dark:border-tl-sea-800/50 hover:border-tl-sea-400 dark:hover:border-tl-sea-600 hover:shadow-md transition-all font-semibold text-tl-sea-700 dark:text-tl-sea-300"
                  >
                    <Navigation className="w-4 h-4" />
                    {neighbor.label}
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* SEO text                                                          */}
        {/* ---------------------------------------------------------------- */}
        <section
          className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 p-8"
          aria-label="Informacion sobre la zona maritima"
        >
          <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Trafico maritimo en {zone.label}
          </h2>
          <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 space-y-3">
            <p>
              La zona maritima de <strong>{zone.label}</strong> abarca las
              provincias costeras de{" "}
              {zone.provinces.length === 1
                ? "una provincia"
                : `${zone.provinces.length} provincias`}
              . El seguimiento AIS (Sistema de Identificacion Automatica) permite
              monitorizar la posicion, velocidad y rumbo de los buques en tiempo
              real.
            </p>
            <p>
              Los datos de posicion de buques se actualizan mediante señales AIS
              captadas por estaciones costeras y satelites. Cada buque mayor de 300
              GT y todos los buques de pasaje estan obligados a llevar transpondedor
              AIS por el Convenio SOLAS.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Fuentes: aisstream.io (AIS), AEMET (alertas costeras), Puertos del
              Estado (directorio portuario). Datos actualizados cada 5 minutos.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
