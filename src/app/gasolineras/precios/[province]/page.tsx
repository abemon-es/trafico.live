import { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { MapPin, ArrowLeft, Clock, Map, Tag, Fuel, BarChart3 } from "lucide-react";
import { RelatedLinks } from "@/components/seo/RelatedLinks";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { PRICE_PROVINCE_SLUGS } from "@/lib/geo/area-routes";
import { DIRECTORY_PAGE_SIZE, pageHref, resolvePage } from "@/lib/seo/pagination";

// force-dynamic: Coolify builds with DATABASE_URL='' which caches empty ISR pages.
export const revalidate = 300;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";


interface Props {
  params: Promise<{ province: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}

// Every station of the province, 100 per page, so each station page is reachable
// from this hub with a plain link (it is not in any sitemap of its own).
async function directoryPage(provinceCode: string, page: number) {
  return prisma.gasStation.findMany({
    where: { province: provinceCode },
    orderBy: [{ municipality: "asc" }, { name: "asc" }, { id: "asc" }],
    skip: (page - 1) * DIRECTORY_PAGE_SIZE,
    take: DIRECTORY_PAGE_SIZE,
    select: { id: true, name: true, address: true, locality: true, municipality: true },
  });
}

type DirectoryItem = Awaited<ReturnType<typeof directoryPage>>[number];

function StationDirectory({
  provinceName,
  path,
  page,
  pages,
  total,
  items,
}: {
  provinceName: string;
  path: string;
  page: number;
  pages: number;
  total: number;
  items: DirectoryItem[];
}) {
  const first = (page - 1) * DIRECTORY_PAGE_SIZE + 1;
  const last = first + items.length - 1;
  return (
    <section aria-labelledby="directorio" className="mt-8 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h2 id="directorio" className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Todas las gasolineras de {provinceName}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {total.toLocaleString("es-ES")} estaciones por municipio
          {pages > 1 ? ` · ${first}–${last} · página ${page} de ${pages}` : ""}
        </p>
      </div>
      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {items.map((s) => (
          <li key={s.id} className="px-4 py-2 text-sm flex flex-wrap gap-x-3">
            <Link href={`/gasolineras/terrestres/${s.id}`} className="font-medium text-orange-700 dark:text-orange-300 hover:underline">
              {s.name}
            </Link>
            <span className="text-gray-600 dark:text-gray-400">{s.municipality ?? s.locality ?? ""}</span>
            {s.address && <span className="text-gray-500 dark:text-gray-500">{s.address}</span>}
          </li>
        ))}
      </ul>
      {pages > 1 && (
        <nav aria-label="Páginas del listado" className="p-4 border-t border-gray-200 dark:border-gray-800 flex flex-wrap gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) =>
            n === page ? (
              <span key={n} aria-current="page" className="px-3 py-1 rounded bg-orange-600 text-white text-sm font-mono">
                {n}
              </span>
            ) : (
              <Link key={n} href={pageHref(path, n)} className="px-3 py-1 rounded border border-gray-300 dark:border-gray-700 text-sm font-mono text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
                {n}
              </Link>
            )
          )}
        </nav>
      )}
    </section>
  );
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { province } = await params;
  const provinceData = PRICE_PROVINCE_SLUGS[province];

  if (!provinceData) {
    return { title: "Provincia no encontrada" };
  }

  const { page: rawPage } = await searchParams;
  if (rawPage !== undefined) {
    const total = await prisma.gasStation.count({ where: { province: provinceData.code } });
    const r = resolvePage(rawPage, total);
    if (r.kind !== "ok") return { title: "Página no encontrada" };
    const url = `${BASE_URL}${pageHref(`/gasolineras/precios/${province}`, r.page)}`;
    const title = `Gasolineras de ${provinceData.name}: página ${r.page} de ${r.pages}`;
    return {
      title,
      description: `Listado de las gasolineras de ${provinceData.name} por municipio, página ${r.page} de ${r.pages}, con enlace a la ficha y los precios de cada una.`,
      alternates: { canonical: url },
      openGraph: { title, url },
    };
  }

  return {
    title: `Precios Combustible en ${provinceData.name} | Tráfico España`,
    description: `Consulta los precios de combustible en las gasolineras de ${provinceData.name}. Encuentra la gasolinera más barata.`,
    alternates: {
      canonical: `${BASE_URL}/gasolineras/precios/${province}`,
    },
    openGraph: {
      title: `Precios Combustible en ${provinceData.name} | Tráfico España`,
      description: `Consulta los precios de combustible en las gasolineras de ${provinceData.name}. Encuentra la gasolinera más barata.`,
      url: `${BASE_URL}/gasolineras/precios/${province}`,
      images: [`${BASE_URL}/og-image.webp`],
    },
  };
}

// generateStaticParams removed: Coolify builds with DATABASE_URL='' causing empty pre-renders.
// Pages render on-demand via ISR instead.

export default async function ProvincePricesPage({ params, searchParams }: Props) {
  const { province } = await params;
  const provinceData = PRICE_PROVINCE_SLUGS[province];

  if (!provinceData) {
    notFound();
  }

  const path = `/gasolineras/precios/${province}`;
  const total = await prisma.gasStation.count({ where: { province: provinceData.code } });
  const resolved = resolvePage((await searchParams).page, total);
  if (resolved.kind === "redirect-to-first") permanentRedirect(path);
  if (resolved.kind === "not-found") notFound();
  const { page, pages } = resolved;
  const directory = await directoryPage(provinceData.code, page);

  // ?page=N: only the list, with its own title, so it is not a copy of page 1.
  if (page > 1) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Breadcrumbs items={[
          { name: "Inicio", href: "/" },
          { name: "Gasolineras", href: "/gasolineras" },
          { name: "Precios", href: "/gasolineras/precios" },
          { name: provinceData.name, href: path },
        ]} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Gasolineras de {provinceData.name}: página {page} de {pages}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Todas las estaciones de servicio de {provinceData.name}, ordenadas por municipio. Los precios de hoy y las más
          baratas están en{" "}
          <Link href={path} className="text-orange-700 dark:text-orange-300 underline">
            precios de combustible en {provinceData.name}
          </Link>
          . Fuente: Ministerio para la Transición Ecológica y el Reto Demográfico (MITERD).
        </p>
        <StationDirectory provinceName={provinceData.name} path={path} page={page} pages={pages} total={total} items={directory} />
      </div>
    );
  }

  const stations = await prisma.gasStation.findMany({
    where: { province: provinceData.code },
    orderBy: { priceGasoleoA: "asc" },
    take: 100,
  });

  const formatPrice = (price: unknown) => {
    if (price == null) return "N/D";
    const num = typeof price === "object" && "toNumber" in price
      ? (price as { toNumber: () => number }).toNumber()
      : Number(price);
    return `${num.toFixed(3)}€`;
  };

  const cheapestDiesel = stations.find((s) => s.priceGasoleoA != null);
  const cheapestGas95 = [...stations]
    .filter((s) => s.priceGasolina95E5 != null)
    .sort((a, b) => Number(a.priceGasolina95E5) - Number(b.priceGasolina95E5))[0];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumbs items={[
        { name: "Inicio", href: "/" },
        { name: "Gasolineras", href: "/gasolineras" },
        { name: "Precios", href: "/gasolineras/precios" },
        { name: provinceData.name, href: `/gasolineras/precios/${province}` },
      ]} />

      <Link
        href="/gasolineras/precios"
        className="inline-flex items-center gap-2 text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a precios nacionales
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        Precios de Combustible en {provinceData.name}
      </h1>

      {/* Cheapest Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {cheapestDiesel && (
          <Link
            href={`/gasolineras/terrestres/${cheapestDiesel.id}`}
            className="bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 p-4 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">1</span>
              </div>
              <div>
                <div className="text-sm text-green-600 dark:text-green-400">Gasóleo A más barato</div>
                <div className="font-semibold text-green-800 dark:text-green-200">{cheapestDiesel.name}</div>
              </div>
            </div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400 mb-1">
              {formatPrice(cheapestDiesel.priceGasoleoA)}
            </div>
            <div className="text-sm text-green-600 dark:text-green-400">{cheapestDiesel.locality}</div>
          </Link>
        )}
        {cheapestGas95 && (
          <Link
            href={`/gasolineras/terrestres/${cheapestGas95.id}`}
            className="bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 p-4 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">1</span>
              </div>
              <div>
                <div className="text-sm text-green-600 dark:text-green-400">Gasolina 95 más barata</div>
                <div className="font-semibold text-green-800 dark:text-green-200">{cheapestGas95.name}</div>
              </div>
            </div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400 mb-1">
              {formatPrice(cheapestGas95.priceGasolina95E5)}
            </div>
            <div className="text-sm text-green-600 dark:text-green-400">{cheapestGas95.locality}</div>
          </Link>
        )}
      </div>

      {/* Station List */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Gasolineras en {provinceData.name}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{stations.length} estaciones (ordenadas por Gasóleo A)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-950">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Gasolinera
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Gasóleo A
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Gasolina 95
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Gasolina 98
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {stations.map((station, idx) => (
                <tr key={station.id} className={idx < 3 ? "bg-green-50/50 dark:bg-green-900/20" : ""}>
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      {idx < 3 && (
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          idx === 0 ? "bg-green-900 text-white" :
                          idx === 1 ? "bg-green-800 text-white" :
                          "bg-green-700 text-white"
                        }`}>
                          {idx + 1}
                        </span>
                      )}
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                          {station.name}
                          {station.is24h && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs rounded">
                              <Clock className="w-3 h-3" />
                              24h
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{station.locality}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-mono ${idx < 3 ? "text-green-700 dark:text-green-400 font-bold" : "text-tl-amber-700 dark:text-tl-amber-300"}`}>
                      {formatPrice(station.priceGasoleoA)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono text-tl-700 dark:text-tl-300">{formatPrice(station.priceGasolina95E5)}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono text-purple-700 dark:text-purple-400">{formatPrice(station.priceGasolina98E5)}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/gasolineras/terrestres/${station.id}`}
                      className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300"
                    >
                      <MapPin className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {stations.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No se encontraron gasolineras en {provinceData.name}
        </div>
      )}

      {total > 0 && (
        <StationDirectory provinceName={provinceData.name} path={path} page={1} pages={pages} total={total} items={directory} />
      )}

      <RelatedLinks
        title={`Más sobre gasolineras en ${provinceData.name}`}
        links={[
          {
            title: `Mapa de gasolineras en ${provinceData.name}`,
            description: "Ver todas las estaciones en el mapa interactivo",
            href: "/gasolineras/mapa",
            icon: <Map className="w-5 h-5" />,
          },
          {
            title: "Comparar precios por marca",
            description: "Repsol, Cepsa, BP y más — precios medios por marca",
            href: "/gasolineras/marcas",
            icon: <Tag className="w-5 h-5" />,
          },
          {
            title: "Directorio completo",
            description: "Busca y filtra entre todas las gasolineras de España",
            href: "/gasolineras/terrestres",
            icon: <Fuel className="w-5 h-5" />,
          },
          {
            title: "Precios nacionales",
            description: "Comparativa de precios medios por provincia",
            href: "/gasolineras/precios",
            icon: <BarChart3 className="w-5 h-5" />,
          },
        ]}
      />
    </div>
  );
}
