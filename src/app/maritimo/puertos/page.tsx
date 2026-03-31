import { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Anchor, Ship, MapPin, Fuel, Navigation } from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Puertos de España",
  description:
    "Directorio completo de puertos españoles con estaciones de suministro de combustible náutico. Consulta precios de gasóleo A y gasolina 95 en más de 50 puertos del litoral español.",
  alternates: {
    canonical: `${BASE_URL}/maritimo/puertos`,
  },
  openGraph: {
    title: "Puertos de España — Directorio de Combustible Náutico | trafico.live",
    description:
      "Directorio completo de puertos españoles con estaciones de suministro de combustible náutico. Precios actualizados del MITERD.",
    url: `${BASE_URL}/maritimo/puertos`,
    type: "website",
    locale: "es_ES",
  },
};

// ---------------------------------------------------------------------------
// Coast region mapping (province code → region)
// ---------------------------------------------------------------------------

const COAST_REGIONS: Record<string, string> = {
  // Mediterráneo
  "08": "Mediterráneo", "17": "Mediterráneo", "43": "Mediterráneo",
  "03": "Mediterráneo", "12": "Mediterráneo", "46": "Mediterráneo",
  "30": "Mediterráneo", "04": "Mediterráneo", "18": "Mediterráneo", "29": "Mediterráneo",
  // Atlántico Sur
  "21": "Atlántico Sur", "11": "Atlántico Sur", "41": "Atlántico Sur",
  "35": "Atlántico Sur", "38": "Atlántico Sur",
  // Atlántico Norte
  "15": "Atlántico Norte", "27": "Atlántico Norte", "36": "Atlántico Norte",
  "33": "Atlántico Norte", "39": "Atlántico Norte", "48": "Atlántico Norte",
  "20": "Atlántico Norte",
  // Baleares
  "07": "Baleares",
  // Ciudades autónomas
  "51": "Ceuta y Melilla", "52": "Ceuta y Melilla",
};

const REGION_ORDER = [
  "Mediterráneo",
  "Atlántico Sur",
  "Atlántico Norte",
  "Baleares",
  "Ceuta y Melilla",
  "Otras",
];

interface RegionStyle {
  bg: string;
  border: string;
  badge: string;
  icon: typeof Anchor;
  description: string;
}

const REGION_STYLES: Record<string, RegionStyle> = {
  "Mediterráneo": {
    bg: "bg-cyan-50 dark:bg-cyan-900/20",
    border: "border-cyan-200 dark:border-cyan-800",
    badge: "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-200",
    icon: Ship,
    description: "Cataluña, Valencia, Murcia y Andalucía oriental",
  },
  "Atlántico Sur": {
    bg: "bg-tl-sea-50 dark:bg-tl-sea-900/20",
    border: "border-tl-sea-200 dark:border-tl-sea-800",
    badge: "bg-tl-sea-100 dark:bg-tl-sea-900/40 text-tl-sea-800 dark:text-tl-sea-200",
    icon: Anchor,
    description: "Andalucía occidental e Islas Canarias",
  },
  "Atlántico Norte": {
    bg: "bg-indigo-50 dark:bg-indigo-900/20",
    border: "border-indigo-200 dark:border-indigo-800",
    badge: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200",
    icon: Navigation,
    description: "Galicia, Asturias, Cantabria y País Vasco",
  },
  Baleares: {
    bg: "bg-teal-50 dark:bg-teal-900/20",
    border: "border-teal-200 dark:border-teal-800",
    badge: "bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-200",
    icon: Ship,
    description: "Islas Baleares",
  },
  "Ceuta y Melilla": {
    bg: "bg-tl-amber-50 dark:bg-tl-amber-900/20",
    border: "border-tl-amber-200 dark:border-tl-amber-800",
    badge: "bg-tl-amber-100 dark:bg-tl-amber-900/40 text-tl-amber-800 dark:text-tl-amber-200",
    icon: Anchor,
    description: "Ciudades autónomas con fiscalidad especial",
  },
  Otras: {
    bg: "bg-gray-50 dark:bg-gray-900/20",
    border: "border-gray-200 dark:border-gray-800",
    badge: "bg-gray-100 dark:bg-gray-900/40 text-gray-800 dark:text-gray-200",
    icon: MapPin,
    description: "Otros puertos y localizaciones",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function regionForProvince(code: string | null): string {
  if (!code) return "Otras";
  return COAST_REGIONS[code.padStart(2, "0")] ?? "Otras";
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

interface PortEntry {
  port: string;
  province: string | null;
  provinceName: string | null;
  stationCount: number;
  avgGasoleoA: number | null;
  avgGasolina95: number | null;
  region: string;
  slug: string;
}

async function getPortData(): Promise<{
  ports: PortEntry[];
  totalStations: number;
}> {
  const [portGroups, totalStations] = await Promise.all([
    prisma.maritimeStation.groupBy({
      by: ["port", "province", "provinceName"],
      where: { port: { not: null } },
      _count: true,
      _avg: { priceGasoleoA: true, priceGasolina95E5: true },
      orderBy: { _count: { port: "desc" } },
    }),
    prisma.maritimeStation.count(),
  ]);

  const ports: PortEntry[] = portGroups
    .filter((g) => g.port != null)
    .map((g) => ({
      port: g.port as string,
      province: g.province,
      provinceName: g.provinceName,
      stationCount: g._count,
      avgGasoleoA: g._avg.priceGasoleoA != null ? Number(g._avg.priceGasoleoA) : null,
      avgGasolina95: g._avg.priceGasolina95E5 != null ? Number(g._avg.priceGasolina95E5) : null,
      region: regionForProvince(g.province),
      slug: slugify(g.port as string),
    }));

  return { ports, totalStations };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PuertosPage() {
  const { ports, totalStations } = await getPortData();

  // Group ports by region
  const portsByRegion: Record<string, PortEntry[]> = {};
  for (const port of ports) {
    if (!portsByRegion[port.region]) {
      portsByRegion[port.region] = [];
    }
    portsByRegion[port.region].push(port);
  }

  const regionsPresent = REGION_ORDER.filter((r) => portsByRegion[r]?.length > 0);
  const totalPorts = ports.length;
  const totalRegions = regionsPresent.length;

  // JSON-LD ItemList
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Directorio de Puertos de España",
    description:
      "Puertos españoles con estaciones de combustible náutico. Datos del MITERD.",
    url: `${BASE_URL}/maritimo/puertos`,
    numberOfItems: totalPorts,
    itemListElement: ports.slice(0, 50).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: p.port,
      url: `${BASE_URL}/maritimo/puertos/${p.slug}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Hero */}
        <div className="bg-gradient-to-br from-tl-sea-700 via-tl-sea-600 to-tl-sea-500 text-white">
          <div className="max-w-7xl mx-auto px-4 py-12 sm:py-16">
            <Breadcrumbs
              items={[
                { name: "Inicio", href: "/" },
                { name: "Marítimo", href: "/maritimo" },
                { name: "Puertos", href: "/maritimo/puertos" },
              ]}
            />
            <div className="mt-4 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
                <Anchor className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-heading font-bold">
                  Puertos de España
                </h1>
                <p className="mt-1 text-tl-sea-100 text-lg">
                  Directorio de puertos con estaciones de combustible náutico
                </p>
              </div>
            </div>

            {/* Stats row */}
            <div className="mt-8 grid grid-cols-3 gap-4 max-w-lg">
              <div className="bg-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-heading font-bold">{totalPorts}</div>
                <div className="text-xs text-tl-sea-100 mt-0.5">Puertos</div>
              </div>
              <div className="bg-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-heading font-bold">{totalStations}</div>
                <div className="text-xs text-tl-sea-100 mt-0.5">Estaciones</div>
              </div>
              <div className="bg-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-heading font-bold">{totalRegions}</div>
                <div className="text-xs text-tl-sea-100 mt-0.5">Costas</div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 py-10 space-y-12">
          {ports.length === 0 ? (
            <div className="text-center py-20">
              <Anchor className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                Datos de puertos no disponibles temporalmente.
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                Las estaciones náuticas se actualizan cada hora desde el MITERD.
              </p>
            </div>
          ) : (
            regionsPresent.map((region) => {
              const regionPorts = portsByRegion[region] ?? [];
              const style = REGION_STYLES[region] ?? REGION_STYLES["Otras"];
              const RegionIcon = style.icon;

              return (
                <section key={region}>
                  {/* Region header */}
                  <div className="flex items-center gap-3 mb-5">
                    <div
                      className={`w-9 h-9 rounded-lg ${style.bg} ${style.border} border flex items-center justify-center flex-shrink-0`}
                    >
                      <RegionIcon className="w-5 h-5 text-tl-sea-600 dark:text-tl-sea-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-heading font-semibold text-gray-900 dark:text-gray-100">
                        {region}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {style.description} · {regionPorts.length}{" "}
                        {regionPorts.length === 1 ? "puerto" : "puertos"}
                      </p>
                    </div>
                  </div>

                  {/* Port cards grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {regionPorts.map((portEntry) => (
                      <Link
                        key={portEntry.slug}
                        href={`/maritimo/puertos/${portEntry.slug}`}
                        className={`group rounded-xl border ${style.border} ${style.bg} p-5 hover:shadow-md transition-all hover:-translate-y-0.5`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-tl-sea-700 dark:group-hover:text-tl-sea-300 transition-colors">
                              {portEntry.port}
                            </h3>
                            {portEntry.provinceName && (
                              <div className="flex items-center gap-1 mt-1 text-sm text-gray-500 dark:text-gray-400">
                                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="truncate">{portEntry.provinceName}</span>
                              </div>
                            )}
                          </div>
                          <span
                            className={`flex-shrink-0 text-xs font-medium px-2 py-1 rounded-full ${style.badge}`}
                          >
                            {portEntry.stationCount}{" "}
                            {portEntry.stationCount === 1 ? "est." : "est."}
                          </span>
                        </div>

                        {/* Prices */}
                        <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5 grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <Fuel className="w-3 h-3" />
                              Gasóleo A
                            </div>
                            <div className="font-data font-semibold text-tl-sea-700 dark:text-tl-sea-300 tabular-nums mt-0.5">
                              {portEntry.avgGasoleoA != null
                                ? `${portEntry.avgGasoleoA.toFixed(3)} €`
                                : "N/D"}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <Fuel className="w-3 h-3" />
                              Gasolina 95
                            </div>
                            <div className="font-data font-semibold text-tl-sea-700 dark:text-tl-sea-300 tabular-nums mt-0.5">
                              {portEntry.avgGasolina95 != null
                                ? `${portEntry.avgGasolina95.toFixed(3)} €`
                                : "N/D"}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })
          )}

          {/* SEO text */}
          <section className="prose prose-sm dark:prose-invert max-w-none pt-4 border-t border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-heading font-semibold text-gray-900 dark:text-gray-100 not-prose">
              El sistema portuario español
            </h2>
            <div className="mt-3 space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <p>
                España cuenta con uno de los sistemas portuarios más extensos del mundo, gestionado
                en su mayoría por Puertos del Estado y las 28 Autoridades Portuarias distribuidas a
                lo largo de más de 7.880 km de litoral. Los puertos españoles mueven anualmente más
                de 550 millones de toneladas de mercancía y dan servicio a millones de embarcaciones
                de recreo, pesqueras y comerciales.
              </p>
              <p>
                Las estaciones de suministro de combustible náutico —también llamadas estaciones
                marítimas— están reguladas por el Ministerio para la Transición Ecológica y el Reto
                Demográfico (MITERD) y sus precios se publican diariamente en el Boletín de
                Hidrocarburos. En trafico.live actualizamos estos precios cada hora para que puedas
                comparar el gasóleo A, gasóleo B y gasolina 95 antes de zarpar.
              </p>
              <p>
                El litoral mediterráneo concentra la mayor densidad de estaciones náuticas,
                especialmente en Cataluña, la Comunitat Valenciana, la Región de Murcia y Andalucía
                oriental. El arco atlántico norte —Galicia, Asturias, Cantabria y el País Vasco—
                destaca por la presencia de flota pesquera profesional, con acceso a gasóleo B
                bonificado. Las Islas Baleares y Canarias, así como Ceuta y Melilla, aplican
                regímenes fiscales especiales que suelen resultar en precios más competitivos.
              </p>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
