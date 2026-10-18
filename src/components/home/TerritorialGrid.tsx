import Link from "next/link";

interface Community {
  name: string;
  /** DB slug — /espana/<slug> is the final URL (see lib/geo/geo-paths.ts). */
  slug: string;
}

interface City {
  name: string;
  slug: string;
}

// Hard-coded incident counts used to sit next to each name ("Madrid 67") as if
// they were live; they were not. Names only until a live count is wired.
const COMMUNITIES: Community[] = [
  { name: "Andalucía", slug: "andalucia" },
  { name: "Aragón", slug: "aragon" },
  { name: "Asturias", slug: "principado-de-asturias" },
  { name: "Baleares", slug: "islas-baleares" },
  { name: "Canarias", slug: "canarias" },
  { name: "Cantabria", slug: "cantabria" },
  { name: "C.-La Mancha", slug: "castilla-la-mancha" },
  { name: "C. y León", slug: "castilla-y-leon" },
  { name: "Catalunya", slug: "cataluna" },
  { name: "C. Valenciana", slug: "comunidad-valenciana" },
  { name: "Extremadura", slug: "extremadura" },
  { name: "Galicia", slug: "galicia" },
  { name: "La Rioja", slug: "la-rioja" },
  { name: "Madrid", slug: "comunidad-de-madrid" },
  { name: "Murcia", slug: "region-de-murcia" },
  { name: "Navarra", slug: "navarra" },
  { name: "País Vasco", slug: "pais-vasco" },
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
              href={`/espana/${community.slug}`}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 text-sm text-gray-600 dark:text-gray-400 hover:bg-tl-50 dark:hover:bg-tl-900/30 hover:text-tl-700 dark:hover:text-tl-300 transition-colors"
            >
              <span>{community.name}</span>
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
