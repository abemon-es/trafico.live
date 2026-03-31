import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { MapPin, Loader2, ChevronLeft, Fuel, List, BarChart3 } from "lucide-react";
import prisma from "@/lib/db";
import { getProvinceBounds, getProvinceName, PROVINCE_NAMES } from "@/lib/province-bounds";
import { provinceSlug } from "@/lib/geo/slugify";
import { UnifiedMap } from "@/components/map/UnifiedMap";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const paddedCode = code.padStart(2, "0");
  const provinceName = getProvinceName(paddedCode);

  if (!PROVINCE_NAMES[paddedCode]) {
    return { title: "Provincia no encontrada" };
  }

  return {
    title: `Mapa de Gasolineras en ${provinceName} | Tráfico España`,
    description: `Encuentra gasolineras con los mejores precios en ${provinceName}. Mapa interactivo con estaciones terrestres y precios de combustible actualizados.`,
    alternates: {
      canonical: `${BASE_URL}/gasolineras/mapa/provincia/${paddedCode}`,
    },
    openGraph: {
      title: `Gasolineras en ${provinceName}`,
      description: `Mapa de gasolineras en ${provinceName} con precios de combustible`,
    },
  };
}

// generateStaticParams removed: Coolify builds with DATABASE_URL='' causing empty pre-renders.

export default async function ProvinceGasMapPage({ params }: PageProps) {
  const { code } = await params;
  const paddedCode = code.padStart(2, "0");

  // Validate province code
  if (!PROVINCE_NAMES[paddedCode]) {
    notFound();
  }

  const provinceName = getProvinceName(paddedCode);
  const bounds = getProvinceBounds(paddedCode);

  // Fetch stats for this province
  let stationCount = 0;
  let avgDiesel: number | null = null;
  let avgGas95: number | null = null;
  let cheapestDiesel: { name: string; price: number; id: string } | null = null;
  let cheapestGas95: { name: string; price: number; id: string } | null = null;

  try {
    const [count, avgPrices, cheapDiesel, cheapGas] = await Promise.all([
      prisma.gasStation.count({ where: { province: paddedCode } }),
      prisma.gasStation.aggregate({
        where: { province: paddedCode },
        _avg: {
          priceGasoleoA: true,
          priceGasolina95E5: true,
        },
      }),
      prisma.gasStation.findFirst({
        where: { province: paddedCode, priceGasoleoA: { not: null } },
        orderBy: { priceGasoleoA: "asc" },
        select: { id: true, name: true, priceGasoleoA: true },
      }),
      prisma.gasStation.findFirst({
        where: { province: paddedCode, priceGasolina95E5: { not: null } },
        orderBy: { priceGasolina95E5: "asc" },
        select: { id: true, name: true, priceGasolina95E5: true },
      }),
    ]);

    stationCount = count;
    avgDiesel = avgPrices._avg.priceGasoleoA ? Number(avgPrices._avg.priceGasoleoA) : null;
    avgGas95 = avgPrices._avg.priceGasolina95E5 ? Number(avgPrices._avg.priceGasolina95E5) : null;

    if (cheapDiesel) {
      cheapestDiesel = {
        id: cheapDiesel.id,
        name: cheapDiesel.name,
        price: Number(cheapDiesel.priceGasoleoA),
      };
    }
    if (cheapGas) {
      cheapestGas95 = {
        id: cheapGas.id,
        name: cheapGas.name,
        price: Number(cheapGas.priceGasolina95E5),
      };
    }
  } catch (error) {
    console.error("Error fetching province gas station data:", error);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={[
          { name: "Inicio", href: "/" },
          { name: "Gasolineras", href: "/gasolineras" },
          { name: "Mapa", href: "/gasolineras/mapa" },
          { name: provinceName, href: `/gasolineras/mapa/provincia/${paddedCode}` },
        ]} />

        {/* Header */}
        <div className="mb-6">
          <Link
            href="/gasolineras/mapa"
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100 mb-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Volver al mapa nacional
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Fuel className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Gasolineras en {provinceName}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {stationCount.toLocaleString("es-ES")} estaciones de servicio
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Estaciones</div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {stationCount.toLocaleString("es-ES")}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Gasóleo A (media)</div>
            <div className="text-2xl font-bold text-tl-amber-600 dark:text-tl-amber-400">
              {avgDiesel ? `${avgDiesel.toFixed(3)}€` : "-"}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Gasolina 95 (media)</div>
            <div className="text-2xl font-bold text-tl-600 dark:text-tl-400">
              {avgGas95 ? `${avgGas95.toFixed(3)}€` : "-"}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Más barata</div>
            <div className="text-lg font-bold text-green-600 dark:text-green-400">
              {cheapestDiesel ? `${cheapestDiesel.price.toFixed(3)}€` : "-"}
            </div>
          </div>
        </div>

        {/* Cheapest highlights */}
        {(cheapestDiesel || cheapestGas95) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {cheapestDiesel && (
              <Link
                href={`/gasolineras/terrestres/${cheapestDiesel.id}`}
                className="bg-tl-amber-50 dark:bg-tl-amber-900/20 rounded-lg border border-tl-amber-200 dark:border-tl-amber-800 p-4 hover:bg-tl-amber-100 transition-colors"
              >
                <div className="text-sm text-tl-amber-600 dark:text-tl-amber-400 mb-1">Gasóleo A más barato</div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">{cheapestDiesel.name}</div>
                <div className="text-xl font-bold text-tl-amber-700 dark:text-tl-amber-300 mt-1">
                  {cheapestDiesel.price.toFixed(3)}€
                </div>
              </Link>
            )}
            {cheapestGas95 && (
              <Link
                href={`/gasolineras/terrestres/${cheapestGas95.id}`}
                className="bg-tl-50 dark:bg-tl-900/20 rounded-lg border border-tl-200 dark:border-tl-800 p-4 hover:bg-tl-100 dark:bg-tl-900/30 transition-colors"
              >
                <div className="text-sm text-tl-600 dark:text-tl-400 mb-1">Gasolina 95 más barata</div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">{cheapestGas95.name}</div>
                <div className="text-xl font-bold text-tl-700 dark:text-tl-300 mt-1">
                  {cheapestGas95.price.toFixed(3)}€
                </div>
              </Link>
            )}
          </div>
        )}

        {/* Map */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden mb-6">
          <Suspense
            fallback={
              <div className="h-[500px] bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-orange-600 dark:text-orange-400 animate-spin" />
              </div>
            }
          >
            <UnifiedMap
              defaultHeight="500px"
              showStats={false}
              id={`gasolineras-map-${code}`}
              initialCenter={bounds.center}
              initialZoom={bounds.zoom}
              initialLayers={{ gasStations: true, highways: true }}
              filterProvince={paddedCode}
            />
          </Suspense>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href={`/gasolineras/terrestres?province=${paddedCode}`}
            className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 hover:shadow-md transition-shadow"
          >
            <List className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Ver listado</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Todas las gasolineras de {provinceName}
              </p>
            </div>
          </Link>
          <Link
            href={`/gasolineras/precios/${provinceSlug(provinceName)}`}
            className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 hover:shadow-md transition-shadow"
          >
            <BarChart3 className="w-6 h-6 text-tl-600 dark:text-tl-400" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Precios</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Comparativa de precios en {provinceName}</p>
            </div>
          </Link>
          <Link
            href={`/provincias/${paddedCode}`}
            className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 hover:shadow-md transition-shadow"
          >
            <MapPin className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Provincia</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Tráfico y carreteras en {provinceName}</p>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
