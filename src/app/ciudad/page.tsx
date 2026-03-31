import { Metadata } from "next";
import Link from "next/link";
import { MapPin, Search, ChevronRight } from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Tráfico por Ciudades",
  description:
    "Información de tráfico en tiempo real por ciudad: incidencias, cámaras, combustible y zonas de bajas emisiones en las principales ciudades de España.",
  keywords: [
    "tráfico ciudades",
    "tráfico Madrid",
    "tráfico Barcelona",
    "cámaras tráfico",
    "incidencias tráfico",
  ],
  alternates: {
    canonical: `${BASE_URL}/ciudad`,
  },
};

// Major Spanish cities
const CITIES = [
  { name: "Madrid", slug: "madrid", province: "Madrid", population: "3.3M" },
  { name: "Barcelona", slug: "barcelona", province: "Barcelona", population: "1.6M" },
  { name: "Valencia", slug: "valencia", province: "Valencia", population: "800K" },
  { name: "Sevilla", slug: "sevilla", province: "Sevilla", population: "690K" },
  { name: "Zaragoza", slug: "zaragoza", province: "Zaragoza", population: "675K" },
  { name: "Málaga", slug: "malaga", province: "Málaga", population: "580K" },
  { name: "Murcia", slug: "murcia", province: "Murcia", population: "460K" },
  { name: "Palma", slug: "palma", province: "Baleares", population: "420K" },
  { name: "Bilbao", slug: "bilbao", province: "Bizkaia", population: "350K" },
  { name: "Alicante", slug: "alicante", province: "Alicante", population: "340K" },
  { name: "Córdoba", slug: "cordoba", province: "Córdoba", population: "325K" },
  { name: "Valladolid", slug: "valladolid", province: "Valladolid", population: "300K" },
  { name: "Vigo", slug: "vigo", province: "Pontevedra", population: "295K" },
  { name: "Gijón", slug: "gijon", province: "Asturias", population: "270K" },
  { name: "Granada", slug: "granada", province: "Granada", population: "235K" },
  { name: "Vitoria-Gasteiz", slug: "vitoria", province: "Álava", population: "255K" },
  { name: "Oviedo", slug: "oviedo", province: "Asturias", population: "220K" },
  { name: "San Sebastián", slug: "san-sebastian", province: "Gipuzkoa", population: "190K" },
  { name: "Santander", slug: "santander", province: "Cantabria", population: "175K" },
  { name: "Pamplona", slug: "pamplona", province: "Navarra", population: "200K" },
];

export default function CiudadesPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={[
          { name: "Inicio", href: "/" },
          { name: "Ciudades", href: "/ciudad" },
        ]} />
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-tl-100 dark:bg-tl-900/30 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-tl-600 dark:text-tl-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Tráfico por ciudades
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Selecciona una ciudad para ver información de tráfico en tiempo real
          </p>
        </div>

        {/* Search hint */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 mb-8">
          <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
            <Search className="w-5 h-5" />
            <p className="text-sm">
              ¿No encuentras tu ciudad? Prueba a buscar por{" "}
              <Link href="/espana" className="text-tl-600 dark:text-tl-400 hover:underline">
                provincia
              </Link>{" "}
              o{" "}
              <Link href="/comunidad-autonoma" className="text-tl-600 dark:text-tl-400 hover:underline">
                comunidad autónoma
              </Link>
            </p>
          </div>
        </div>

        {/* Cities Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {CITIES.map((city) => (
            <Link
              key={city.slug}
              href={`/ciudad/${city.slug}`}
              className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 hover:border-tl-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-tl-700 dark:text-tl-300 transition-colors">
                    {city.name}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{city.province}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-tl-600 dark:text-tl-400 transition-colors" />
              </div>
              <p className="text-xs text-gray-400 mt-2">{city.population} habitantes</p>
            </Link>
          ))}
        </div>

        {/* More cities note */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            Más ciudades disponibles a través de{" "}
            <Link href="/espana" className="text-tl-600 dark:text-tl-400 hover:underline">
              navegación por provincias
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
