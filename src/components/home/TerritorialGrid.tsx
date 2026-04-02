import Link from "next/link";

interface Community {
  name: string;
  slug: string;
  incidents: number;
}

interface City {
  name: string;
  slug: string;
}

const COMMUNITIES: Community[] = [
  { name: "Andalucía", slug: "andalucia", incidents: 42 },
  { name: "Aragón", slug: "aragon", incidents: 12 },
  { name: "Asturias", slug: "asturias", incidents: 8 },
  { name: "Baleares", slug: "baleares", incidents: 6 },
  { name: "Canarias", slug: "canarias", incidents: 15 },
  { name: "Cantabria", slug: "cantabria", incidents: 5 },
  { name: "C.-La Mancha", slug: "castilla-la-mancha", incidents: 18 },
  { name: "C. y León", slug: "castilla-y-leon", incidents: 22 },
  { name: "Catalunya", slug: "catalunya", incidents: 56 },
  { name: "C. Valenciana", slug: "comunitat-valenciana", incidents: 31 },
  { name: "Extremadura", slug: "extremadura", incidents: 7 },
  { name: "Galicia", slug: "galicia", incidents: 19 },
  { name: "Madrid", slug: "madrid", incidents: 67 },
  { name: "Murcia", slug: "murcia", incidents: 11 },
  { name: "Navarra", slug: "navarra", incidents: 9 },
  { name: "País Vasco", slug: "pais-vasco", incidents: 14 },
];

const CITIES: City[] = [
  { name: "Madrid", slug: "madrid" },
  { name: "Barcelona", slug: "barcelona" },
  { name: "Valencia", slug: "valencia" },
  { name: "Sevilla", slug: "sevilla" },
  { name: "Zaragoza", slug: "zaragoza" },
  { name: "Málaga", slug: "malaga" },
  { name: "Murcia", slug: "murcia" },
  { name: "Palma", slug: "palma" },
  { name: "Bilbao", slug: "bilbao" },
  { name: "Alicante", slug: "alicante" },
  { name: "Córdoba", slug: "cordoba" },
  { name: "Valladolid", slug: "valladolid" },
  { name: "Vigo", slug: "vigo" },
  { name: "Granada", slug: "granada" },
  { name: "Oviedo", slug: "oviedo" },
];

export function TerritorialGrid() {
  return (
    <section className="py-18 px-4 sm:px-6 lg:px-8 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="font-heading text-xs font-semibold uppercase tracking-widest text-tl-600 mb-1">
              Cobertura territorial
            </p>
            <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">
              Tráfico por comunidad autónoma
            </h2>
          </div>
          <Link
            href="/espana"
            className="text-xs font-medium text-tl-600 hover:text-tl-700 dark:text-tl-400 dark:hover:text-tl-300 whitespace-nowrap"
          >
            Ver todas &rarr;
          </Link>
        </div>

        {/* SEO intro paragraph */}
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-7 max-w-3xl">
          Cada comunidad autónoma, provincia y ciudad de España cuenta con su propia página de inteligencia de tráfico. Consulta incidencias en tiempo real, cámaras DGT, radares, precios de combustible, cargadores eléctricos, alertas meteorológicas y datos históricos de accidentalidad para tu zona.
        </p>

        {/* Communities 4-column grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 mb-4">
          {COMMUNITIES.map((community) => (
            <Link
              key={community.slug}
              href={`/comunidad-autonoma/${community.slug}`}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 text-sm text-gray-600 dark:text-gray-400 hover:bg-tl-50 dark:hover:bg-tl-900/30 hover:text-tl-700 dark:hover:text-tl-300 transition-colors"
            >
              <span>{community.name}</span>
              <span className="font-data text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                {community.incidents}
              </span>
            </Link>
          ))}
        </div>

        {/* City pills */}
        <div className="flex flex-wrap gap-1.5 mt-4">
          {CITIES.map((city) => (
            <Link
              key={city.slug}
              href={`/trafico/${city.slug}`}
              className="border border-gray-200 dark:border-gray-700 rounded-full px-3 py-1 text-sm text-gray-500 dark:text-gray-400 hover:border-tl-400 dark:hover:border-tl-600 hover:text-tl-600 dark:hover:text-tl-400 transition-colors"
            >
              {city.name}
            </Link>
          ))}
        </div>

        {/* SEO footer paragraph */}
        <p className="mt-6 text-xs text-gray-400 dark:text-gray-500 leading-relaxed max-w-3xl">
          Además de las principales ciudades, trafico.live ofrece datos de tráfico para los 8.131 municipios de España, así como cobertura en Portugal (más de 3.000 gasolineras y meteorología IPMA) y Andorra (incidencias y cámaras de Mobilitat).
        </p>
      </div>
    </section>
  );
}
