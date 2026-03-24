import { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gasolineras Baratas por Ciudad — Precios Hoy | trafico.live",
  description:
    "Encuentra las gasolineras más baratas en tu ciudad. Precios actualizados de Gasóleo A y Gasolina 95 para las principales ciudades de España.",
  alternates: {
    canonical: "/gasolineras/baratas",
  },
};

const CITIES = [
  { slug: "madrid", name: "Madrid" },
  { slug: "barcelona", name: "Barcelona" },
  { slug: "valencia", name: "Valencia" },
  { slug: "sevilla", name: "Sevilla" },
  { slug: "zaragoza", name: "Zaragoza" },
  { slug: "malaga", name: "Málaga" },
  { slug: "murcia", name: "Murcia" },
  { slug: "bilbao", name: "Bilbao" },
  { slug: "alicante", name: "Alicante" },
  { slug: "cordoba", name: "Córdoba" },
  { slug: "valladolid", name: "Valladolid" },
  { slug: "granada", name: "Granada" },
  { slug: "oviedo", name: "Oviedo" },
  { slug: "santander", name: "Santander" },
  { slug: "pamplona", name: "Pamplona" },
  { slug: "san-sebastian", name: "San Sebastián" },
  { slug: "vitoria", name: "Vitoria" },
  { slug: "palma", name: "Palma" },
  { slug: "las-palmas", name: "Las Palmas" },
  { slug: "santa-cruz", name: "S.C. Tenerife" },
];

export default function BaratasIndexPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <nav aria-label="Migas de pan" className="flex items-center gap-1.5 text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-gray-700 transition-colors">Inicio</Link>
        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        <Link href="/gasolineras" className="hover:text-gray-700 transition-colors">Combustible</Link>
        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-gray-900 font-medium">Baratas</span>
      </nav>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Gasolineras Baratas por Ciudad
      </h1>
      <p className="text-gray-600 mb-8">
        Selecciona tu ciudad para ver las gasolineras más baratas hoy, con precios de Gasóleo A y
        Gasolina 95 actualizados desde la fuente oficial del Ministerio.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {CITIES.map((city) => (
          <Link
            key={city.slug}
            href={`/gasolineras/baratas/${city.slug}`}
            className="flex items-center gap-2 p-3 bg-white rounded-xl border border-gray-200 hover:border-orange-300 hover:shadow-sm transition-all group"
          >
            <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-800 group-hover:text-orange-700 transition-colors">
              {city.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
