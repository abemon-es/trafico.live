import Link from "next/link";
import { provinceSlug } from "@/lib/geo/slugify";
import { PROVINCE_NAMES } from "@/lib/geo/ine-codes";

// ─── 50 cities for /atascos/{slug} ──────────────────────────────────────────
const GEO_CITIES: { name: string; slug: string }[] = [
  { name: "Madrid", slug: "madrid" },
  { name: "Barcelona", slug: "barcelona" },
  { name: "Valencia", slug: "valencia" },
  { name: "Sevilla", slug: "sevilla" },
  { name: "Bilbao", slug: "bilbao" },
  { name: "Zaragoza", slug: "zaragoza" },
  { name: "Málaga", slug: "malaga" },
  { name: "Murcia", slug: "murcia" },
  { name: "Palma", slug: "palma" },
  { name: "Las Palmas", slug: "las-palmas" },
  { name: "Granada", slug: "granada" },
  { name: "Vigo", slug: "vigo" },
  { name: "Gijón", slug: "gijon" },
  { name: "Oviedo", slug: "oviedo" },
  { name: "Pamplona", slug: "pamplona" },
  { name: "A Coruña", slug: "a-coruna" },
  { name: "Vitoria", slug: "vitoria" },
  { name: "Elche", slug: "elche" },
  { name: "Alicante", slug: "alicante" },
  { name: "Córdoba", slug: "cordoba" },
  { name: "Valladolid", slug: "valladolid" },
  { name: "Santander", slug: "santander" },
  { name: "Lleida", slug: "lleida" },
  { name: "Tarragona", slug: "tarragona" },
  { name: "León", slug: "leon" },
  { name: "Burgos", slug: "burgos" },
  { name: "Logroño", slug: "logrono" },
  { name: "Salamanca", slug: "salamanca" },
  { name: "Huelva", slug: "huelva" },
  { name: "Marbella", slug: "marbella" },
  { name: "Cádiz", slug: "cadiz" },
  { name: "Mataró", slug: "mataro" },
  { name: "Dos Hermanas", slug: "dos-hermanas" },
  { name: "Terrassa", slug: "terrassa" },
  { name: "Cartagena", slug: "cartagena" },
  { name: "Jerez", slug: "jerez" },
  { name: "Sabadell", slug: "sabadell" },
  { name: "Alcalá Henares", slug: "alcala-de-henares" },
  { name: "Móstoles", slug: "mostoles" },
  { name: "Fuenlabrada", slug: "fuenlabrada" },
  { name: "Leganés", slug: "leganes" },
  { name: "Donostia", slug: "donostia-san-sebastian" },
  { name: "Castellón", slug: "castellon-de-la-plana" },
  { name: "Albacete", slug: "albacete" },
  { name: "Getafe", slug: "getafe" },
  { name: "Almería", slug: "almeria" },
  { name: "Badajoz", slug: "badajoz" },
  { name: "Parla", slug: "parla" },
  { name: "Torrejón", slug: "torrejon-de-ardoz" },
  { name: "Santa Cruz de Tenerife", slug: "santa-cruz-de-tenerife" },
];

// ─── 25+ road codes for /carreteras/{slug} ──────────────────────────────────
const GEO_ROADS: { name: string; slug: string }[] = [
  { name: "AP-1", slug: "ap-1" },
  { name: "AP-2", slug: "ap-2" },
  { name: "AP-4", slug: "ap-4" },
  { name: "AP-6", slug: "ap-6" },
  { name: "AP-7", slug: "ap-7" },
  { name: "AP-9", slug: "ap-9" },
  { name: "AP-66", slug: "ap-66" },
  { name: "AP-68", slug: "ap-68" },
  { name: "A-1", slug: "a-1" },
  { name: "A-2", slug: "a-2" },
  { name: "A-3", slug: "a-3" },
  { name: "A-4", slug: "a-4" },
  { name: "A-5", slug: "a-5" },
  { name: "A-6", slug: "a-6" },
  { name: "A-7", slug: "a-7" },
  { name: "A-8", slug: "a-8" },
  { name: "A-9", slug: "a-9" },
  { name: "A-23", slug: "a-23" },
  { name: "A-31", slug: "a-31" },
  { name: "A-49", slug: "a-49" },
  { name: "A-66", slug: "a-66" },
  { name: "A-92", slug: "a-92" },
  { name: "N-340", slug: "n-340" },
  { name: "N-630", slug: "n-630" },
  { name: "N-II", slug: "n-ii" },
];

// ─── Rondas urbanas for /rondas/{slug} ──────────────────────────────────────
const GEO_RONDAS: { name: string; slug: string }[] = [
  { name: "M-30", slug: "m-30" },
  { name: "M-40", slug: "m-40" },
  { name: "M-45", slug: "m-45" },
  { name: "M-50", slug: "m-50" },
  { name: "Ronda Dalt", slug: "ronda-de-dalt" },
  { name: "Ronda Litoral", slug: "ronda-litoral" },
  { name: "Bypass Valencia", slug: "bypass-valencia" },
];

// ─── Camera cities for /camaras/{slug} ──────────────────────────────────────
const GEO_CAMERA_CITIES: { name: string; slug: string }[] = [
  { name: "Madrid", slug: "madrid" },
  { name: "Barcelona", slug: "barcelona" },
  { name: "Sevilla", slug: "sevilla" },
  { name: "Valencia", slug: "valencia" },
  { name: "Bilbao", slug: "bilbao" },
  { name: "Málaga", slug: "malaga" },
  { name: "Murcia", slug: "murcia" },
  { name: "Zaragoza", slug: "zaragoza" },
  { name: "Las Palmas", slug: "las-palmas" },
  { name: "Palma", slug: "palma" },
];

// ─── Accident cities for /accidentes/{slug} ─────────────────────────────────
const GEO_ACCIDENT_CITIES: { name: string; slug: string }[] = [
  { name: "Madrid", slug: "madrid" },
  { name: "Barcelona", slug: "barcelona" },
  { name: "Valencia", slug: "valencia" },
  { name: "Sevilla", slug: "sevilla" },
  { name: "Bilbao", slug: "bilbao" },
  { name: "Zaragoza", slug: "zaragoza" },
  { name: "Málaga", slug: "malaga" },
  { name: "Murcia", slug: "murcia" },
];

// ─── All 52 provinces from PROVINCE_NAMES ───────────────────────────────────
const GEO_PROVINCES: { name: string; slug: string; code: string }[] =
  Object.entries(PROVINCE_NAMES).map(([code, name]) => ({
    code,
    name,
    slug: provinceSlug(name),
  }));

// ─── Row component ───────────────────────────────────────────────────────────
function GeoRow({
  label,
  items,
  buildHref,
}: {
  label: string;
  items: { name: string; slug: string }[];
  buildHref: (slug: string) => string;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-0.5 gap-y-1">
      <span className="text-xs font-semibold text-white/40 mr-2 shrink-0 font-heading uppercase tracking-wide">
        {label} →
      </span>
      {items.map((item, idx) => (
        <span key={item.slug} className="inline-flex items-center">
          <Link
            href={buildHref(item.slug)}
            className="text-xs text-white/40 hover:text-tl-300 transition-colors duration-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-tl-400 rounded"
          >
            {item.name}
          </Link>
          {idx < items.length - 1 && (
            <span className="text-white/20 mx-1 select-none" aria-hidden="true">
              ·
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

export function GeoLinks() {
  return (
    <nav
      aria-label="Tráfico por ciudad, provincia y carretera"
      className="w-full bg-ink-950 dark:bg-gray-950 border-b border-white/5"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-3">
        <GeoRow
          label="Tráfico en"
          items={GEO_CITIES}
          buildHref={(slug) => `/atascos/${slug}`}
        />
        <GeoRow
          label="Provincias"
          items={GEO_PROVINCES}
          buildHref={(slug) => `/espana/${slug}`}
        />
        <GeoRow
          label="Carreteras"
          items={GEO_ROADS}
          buildHref={(slug) => `/carreteras/${slug}`}
        />
        <GeoRow
          label="Rondas urbanas"
          items={GEO_RONDAS}
          buildHref={(slug) => `/rondas/${slug}`}
        />
        <GeoRow
          label="Cámaras"
          items={GEO_CAMERA_CITIES}
          buildHref={(slug) => `/camaras/${slug}`}
        />
        <GeoRow
          label="Accidentes"
          items={GEO_ACCIDENT_CITIES}
          buildHref={(slug) => `/accidentes/${slug}`}
        />
      </div>
    </nav>
  );
}

// Export total link count for verification
export const GEO_LINK_COUNT =
  GEO_CITIES.length +
  GEO_PROVINCES.length +
  GEO_ROADS.length +
  GEO_RONDAS.length +
  GEO_CAMERA_CITIES.length +
  GEO_ACCIDENT_CITIES.length;

