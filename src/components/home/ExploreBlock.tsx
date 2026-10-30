import Link from "next/link";
import { COMMUNITIES, PROVINCES } from "@/lib/geo/ine-codes";
import { provincePath } from "@/lib/geo/geo-paths";
import { CERCANIAS_NETWORKS } from "@/lib/trenes/cercanias-networks";

// Plain links from the home page, the page search engines visit most, to the
// hubs whose children they barely know: provinces (→ municipalities → postal
// codes), trains and the per-province data pages. Server-rendered and visible
// at every width; static data so it renders even when the DB does not answer.

const PROVINCE_DATA: Array<{ href: string; label: string }> = [
  { href: "/gasolineras/precios", label: "Precios de gasolina por provincia" },
  { href: "/camaras", label: "Cámaras de tráfico" },
  { href: "/radares", label: "Radares por provincia y carretera" },
  { href: "/calidad-aire/provincia", label: "Calidad del aire por provincia" },
  { href: "/clima", label: "Clima y estaciones meteorológicas" },
];

const linkClass = "text-tl-700 dark:text-tl-300 hover:underline";

export function ExploreBlock() {
  const regions = COMMUNITIES.map((c) => ({
    name: c.name,
    provinces: PROVINCES.filter((p) => p.communityCode === c.code)
      .map((p) => ({ name: p.name, href: provincePath(p.code) }))
      .filter((p): p is { name: string; href: string } => Boolean(p.href))
      .sort((a, b) => a.name.localeCompare(b.name, "es")),
  })).filter((r) => r.provinces.length > 0);

  return (
    <section aria-labelledby="explora-heading" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10" data-explora="">
      <h2 id="explora-heading" className="text-lg font-bold text-gray-900 dark:text-gray-100">
        Tráfico, trenes y datos de tu provincia
      </h2>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 max-w-3xl">
        Elige tu provincia para ver el tráfico, las cámaras y los radares de sus carreteras, o entra en las estaciones,
        líneas y cercanías de tren.
      </p>

      <h3 className="mt-6 text-sm font-semibold text-gray-900 dark:text-gray-100">Tráfico por provincia</h3>
      <div className="mt-2 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        {regions.map((r) => (
          <div key={r.name}>
            <div className="text-xs text-gray-500 dark:text-gray-400">{r.name}</div>
            <ul className="flex flex-wrap gap-x-2 gap-y-0.5">
              {r.provinces.map((p) => (
                <li key={p.href}>
                  <Link href={p.href} className={linkClass}>
                    {p.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <h3 className="mt-6 text-sm font-semibold text-gray-900 dark:text-gray-100">Trenes y cercanías</h3>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
        <li>
          <Link href="/trenes/estaciones" className={linkClass}>
            Estaciones de tren
          </Link>
        </li>
        <li>
          <Link href="/trenes/lineas" className={linkClass}>
            Líneas de tren
          </Link>
        </li>
        <li>
          <Link href="/trenes/cercanias" className={linkClass}>
            Cercanías
          </Link>
        </li>
      </ul>
      <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm" aria-label="Redes de Cercanías">
        {Object.entries(CERCANIAS_NETWORKS).map(([slug, name]) => (
          <li key={slug}>
            <Link href={`/trenes/cercanias/${slug}`} className={linkClass}>
              {name}
            </Link>
          </li>
        ))}
      </ul>

      <h3 className="mt-6 text-sm font-semibold text-gray-900 dark:text-gray-100">Datos por provincia</h3>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {PROVINCE_DATA.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className={linkClass}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
