"use client";

import Link from "next/link";
import useSWR from "swr";
import {
  Activity,
  Fuel,
  Zap,
  Camera,
  Anchor,
  Cloud,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface StatsResponse {
  incidents?: number;
  cameras?: number;
  chargers?: number;
  radars?: number;
  v16Active?: number;
  stationCount?: number;
  [key: string]: unknown;
}

const VERTICALS = [
  {
    key: "traffic",
    icon: Activity,
    iconBg: "bg-red-50 dark:bg-red-950/40",
    iconColor: "text-signal-red",
    title: "Tráfico e incidencias",
    statKey: (s: StatsResponse) =>
      `${(s.incidents ?? 342).toLocaleString("es-ES")} activas · ${s.v16Active ?? 14} V16`,
    description:
      "Retenciones, accidentes, obras, cortes y balizas V16 en tiempo real. SSE push.",
    tags: [
      { label: "Incidencias", href: "/incidencias" },
      { label: "Atascos", href: "/incidencias/atascos" },
      { label: "Cortes", href: "/incidencias/cortes" },
      { label: "V16", href: "/incidencias/v16" },
      { label: "Mejor hora", href: "/incidencias/mejor-hora" },
    ],
  },
  {
    key: "fuel",
    icon: Fuel,
    iconBg: "bg-tl-amber-50 dark:bg-tl-amber-950/40",
    iconColor: "text-tl-amber-500",
    title: "Combustible",
    statKey: (s: StatsResponse) =>
      `${(s.stationCount ?? 12437).toLocaleString("es-ES")} estaciones · 6 tipos`,
    description:
      "Gasolina, diésel, GLP. Precios MINETUR diarios. Histórico. Marítimo.",
    tags: [
      { label: "Gasolina hoy", href: "/gasolineras" },
      { label: "Diésel", href: "/gasolineras/gasóleo" },
      { label: "Baratas", href: "/gasolineras/baratas" },
      { label: "24h", href: "/gasolineras/24-horas" },
      { label: "Marcas", href: "/gasolineras/marcas" },
      { label: "Portugal", href: "/portugal/combustible" },
    ],
  },
  {
    key: "ev",
    icon: Zap,
    iconBg: "bg-green-50 dark:bg-green-950/40",
    iconColor: "text-signal-green",
    title: "Movilidad eléctrica",
    statKey: (s: StatsResponse) =>
      `${(s.chargers ?? 18642).toLocaleString("es-ES")} cargadores`,
    description:
      "Electrolineras, calculadora coste kWh, búsqueda por ciudad y potencia.",
    tags: [
      { label: "Cargadores", href: "/carga-ev" },
      { label: "Electrolineras", href: "/carga-ev/electrolineras" },
      { label: "Calculadora", href: "/carga-ev/calculadora" },
      { label: "Por ciudad", href: "/carga-ev/ciudades" },
    ],
  },
  {
    key: "cameras",
    icon: Camera,
    iconBg: "bg-tl-50 dark:bg-tl-950/40",
    iconColor: "text-tl-600 dark:text-tl-400",
    title: "Cámaras y radares",
    statKey: (s: StatsResponse) =>
      `${(s.cameras ?? 847).toLocaleString("es-ES")} + ${(s.radars ?? 1247).toLocaleString("es-ES")}`,
    description:
      "Imágenes DGT en directo. Radares fijos, móviles y de tramo con alertas.",
    tags: [
      { label: "Cámaras", href: "/camaras" },
      { label: "Radares", href: "/radares" },
      { label: "Paneles", href: "/paneles" },
      { label: "Por ciudad", href: "/camaras/ciudades" },
    ],
  },
  {
    key: "maritime",
    icon: Anchor,
    iconBg: "bg-tl-sea-50 dark:bg-tl-sea-950/40",
    iconColor: "text-tl-sea-500",
    title: "Marítimo",
    statKey: () => "42 puertos · AIS · SASEMAR",
    description:
      "Puertos, combustible marítimo, cartas náuticas, buques en vivo, emergencias.",
    tags: [
      { label: "Puertos", href: "/maritimo/puertos" },
      { label: "Buques AIS", href: "/maritimo/buques" },
      { label: "SASEMAR", href: "/maritimo/emergencias" },
      { label: "Meteo", href: "/maritimo/meteorologia" },
      { label: "Combustible", href: "/maritimo/combustible" },
    ],
  },
  {
    key: "meteo",
    icon: Cloud,
    iconBg: "bg-tl-50 dark:bg-tl-950/40",
    iconColor: "text-tl-600 dark:text-tl-400",
    title: "Meteorología",
    statKey: () => "AEMET · Viento · Nubes",
    description:
      "Alertas activas, capas de viento, temperatura y nubes en el mapa.",
    tags: [
      { label: "Alertas", href: "/meteorologia/alertas" },
      { label: "Viento", href: "/meteorologia/viento" },
      { label: "Temperatura", href: "/meteorologia" },
      { label: "Nubes", href: "/meteorologia/nubes" },
    ],
  },
];

export function VerticalShowcase() {
  const { data: stats } = useSWR<StatsResponse>("/api/stats", fetcher, {
    refreshInterval: 60000,
  });

  const s: StatsResponse = stats ?? {};

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between mb-7">
          <div>
            <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-tl-600 dark:text-tl-400 mb-1">
              Todas las secciones
            </p>
            <h2 className="font-heading text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
              11 verticales de datos
            </h2>
          </div>
          <Link
            href="/explorar"
            className="text-xs text-tl-600 dark:text-tl-400 font-medium whitespace-nowrap hover:text-tl-700 dark:hover:text-tl-300 transition-colors"
          >
            Ver todo &rarr;
          </Link>
        </div>

        {/* Grid — 3 cols on md+, 1 on mobile */}
        <div className="grid gap-px grid-cols-1 sm:grid-cols-2 md:grid-cols-3 bg-gray-200 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          {VERTICALS.map((v) => {
            const Icon = v.icon;
            return (
              <Link
                key={v.key}
                href={v.tags[0].href}
                className="group flex flex-col bg-white dark:bg-gray-950 p-5 transition-colors hover:bg-tl-50/50 dark:hover:bg-tl-950/60"
              >
                {/* Top row */}
                <div className="flex items-center gap-2.5 mb-2.5">
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${v.iconBg}`}
                  >
                    <Icon className={`w-4 h-4 ${v.iconColor}`} />
                  </span>
                  <div>
                    <h3 className="font-heading text-[0.8rem] font-semibold text-gray-900 dark:text-gray-100">
                      {v.title}
                    </h3>
                    <span className="font-data text-[0.6rem] text-gray-400 dark:text-gray-500">
                      {v.statKey(s)}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-[0.725rem] text-gray-500 dark:text-gray-400 leading-relaxed mb-2.5 flex-1">
                  {v.description}
                </p>

                {/* Tag pills */}
                <div className="flex flex-wrap gap-1">
                  {v.tags.map((tag) => (
                    <span
                      key={tag.label}
                      className="text-[0.575rem] bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 rounded px-1.5 py-0.5 group-hover:bg-tl-100 dark:group-hover:bg-tl-900/30 group-hover:text-tl-600 dark:group-hover:text-tl-400 transition-colors"
                    >
                      {tag.label}
                    </span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
