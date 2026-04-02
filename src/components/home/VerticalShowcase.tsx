"use client";

import Link from "next/link";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface StatsResponse {
  incidents?: number;
  cameras?: number;
  radars?: number;
  [key: string]: unknown;
}

const COLUMN_1 = {
  heading: "Tráfico en vivo",
  links: [
    { label: "Mapa en vivo", href: "/mapa", statKey: null },
    { label: "Incidencias", href: "/incidencias", statKey: "incidents" as const },
    { label: "Atascos", href: "/atascos", statKey: null },
    { label: "Cortes de tráfico", href: "/cortes-trafico", statKey: null },
    { label: "Cámaras DGT", href: "/camaras", statKey: "cameras" as const },
    { label: "Radares", href: "/radares", statKey: "radars" as const },
    { label: "Paneles DGT", href: "/paneles", statKey: null },
    { label: "Alertas meteorológicas", href: "/alertas-meteo", statKey: null },
    { label: "Balizas V16", href: "/mapa", statKey: null },
    { label: "Mejor hora para viajar", href: "/mejor-hora", statKey: null },
  ],
};

const COLUMN_2 = {
  heading: "Combustible y movilidad",
  links: [
    { label: "Precio gasolina hoy", href: "/precio-gasolina-hoy", statKey: null },
    { label: "Precio diésel hoy", href: "/precio-diesel-hoy", statKey: null },
    { label: "Gasolineras baratas", href: "/gasolineras/baratas", statKey: null },
    { label: "Gasolineras 24h", href: "/gasolineras-24-horas", statKey: null },
    { label: "Cargadores EV", href: "/carga-ev", statKey: null },
    { label: "Electrolineras", href: "/electrolineras", statKey: null },
    { label: "Cuánto cuesta cargar", href: "/cuanto-cuesta-cargar", statKey: null },
    { label: "Etiqueta ambiental", href: "/etiqueta-ambiental", statKey: null },
    { label: "Combustible marítimo", href: "/maritimo/combustible", statKey: null },
  ],
};

const COLUMN_3 = {
  heading: "Carreteras y territorio",
  links: [
    { label: "Autopistas", href: "/carreteras/autopistas", statKey: null },
    { label: "Autovías", href: "/carreteras/autovias", statKey: null },
    { label: "Nacionales", href: "/carreteras/nacionales", statKey: null },
    { label: "Zonas ZBE", href: "/zbe", statKey: null },
    { label: "Puntos negros", href: "/puntos-negros", statKey: null },
    { label: "Estaciones de aforo", href: "/estaciones-aforo", statKey: null },
    { label: "Intensidad IMD", href: "/intensidad", statKey: null },
    { label: "Comunidades autónomas", href: "/espana", statKey: null },
    { label: "Provincias", href: "/provincias", statKey: null },
    { label: "Portugal", href: "/portugal", statKey: null },
    { label: "Andorra", href: "/andorra", statKey: null },
  ],
};

const DESTACADO_LINKS = [
  { label: "Semana Santa 2026", href: "/semana-santa-2026" },
  { label: "Puente de Mayo 2026", href: "/puente-mayo-2026" },
  { label: "Operaciones DGT", href: "/operaciones-dgt" },
  { label: "Informe diario", href: "/informe-diario" },
  { label: "Profesional", href: "/profesional" },
  { label: "Ciclistas", href: "/ciclistas" },
  { label: "API", href: "/api-docs" },
];

type StatKey = "incidents" | "cameras" | "radars" | null;

function NavColumn({
  heading,
  links,
  stats,
}: {
  heading: string;
  links: { label: string; href: string; statKey: StatKey }[];
  stats: StatsResponse;
}) {
  return (
    <div>
      <h3 className="font-heading text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
        {heading}
      </h3>
      <ul className="space-y-0.5">
        {links.map((link) => {
          const count =
            link.statKey && stats[link.statKey] != null
              ? (stats[link.statKey] as number).toLocaleString("es-ES")
              : null;
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className="flex items-center justify-between py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-tl-600 dark:hover:text-tl-400 transition-colors"
              >
                <span>{link.label}</span>
                {count && (
                  <span className="font-data text-xs text-gray-400 dark:text-gray-500 ml-2">
                    {count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function VerticalShowcase() {
  const { data: stats } = useSWR<StatsResponse>("/api/stats", fetcher, {
    refreshInterval: 60000,
  });

  const s: StatsResponse = stats ?? {};

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-tl-600 dark:text-tl-400 mb-1">
            Directorio completo
          </p>
          <h2 className="font-heading text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50 mb-2">
            Explora trafico.live
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-2xl leading-relaxed">
            La plataforma de inteligencia de tráfico más completa de España. Datos en tiempo real de incidencias, cámaras, radares, precios de combustible, cargadores eléctricos, zonas ZBE, estaciones de aforo y meteorología, todo integrado en un único lugar.
          </p>
        </div>

        {/* Three-column nav */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
          <NavColumn heading={COLUMN_1.heading} links={COLUMN_1.links} stats={s} />
          <NavColumn heading={COLUMN_2.heading} links={COLUMN_2.links} stats={s} />
          <NavColumn heading={COLUMN_3.heading} links={COLUMN_3.links} stats={s} />
        </div>

        {/* Destacado pills */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
            Destacado
          </p>
          <div className="flex flex-wrap gap-2">
            {DESTACADO_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-tl-400 hover:text-tl-600 dark:hover:text-tl-400 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
