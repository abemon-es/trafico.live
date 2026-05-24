"use client";

import Link from "next/link";
import {
  TrainFront,
  Ship,
  Bus,
  AlertTriangle,
  Zap,
  Fuel,
  ArrowRight,
} from "lucide-react";

/**
 * Home-page visible entity-pages showcase.
 *
 * Hand-picked cards advertising the deep per-entity landing pages
 * shipped in iter-4 (PR #30). Each card shows ONE concrete entity
 * surface — not just a hub — so first-time visitors immediately
 * understand the depth: "this site has a page for every train, every
 * boat, every charger, every fuel station, every transit route".
 *
 * Designed for the position between LiveCounterStrip and
 * VerticalShowcase in HomeClient so the eye lands on these cards
 * right after the live counters establish the data volume.
 */

interface EntityCard {
  href: string;
  Icon: typeof TrainFront;
  iconColorVar: string;
  bgColorVar: string;
  category: string;
  title: string;
  example: string;
  description: string;
}

const CARDS: EntityCard[] = [
  {
    href: "/trenes/tren/03241",
    Icon: TrainFront,
    iconColorVar: "#9b1c2e",
    bgColorVar: "rgba(155,28,46,0.08)",
    category: "Trenes en vivo",
    title: "Cada tren tiene su página",
    example: "Ej: AVE 03241 →",
    description:
      "Posición actual, retraso, próxima parada y trayecto completo con cada parada enlazada a su estación.",
  },
  {
    href: "/maritimo/buques",
    Icon: Ship,
    iconColorVar: "#1c4e80",
    bgColorVar: "rgba(28,78,128,0.08)",
    category: "Buques AIS",
    title: "Cada buque tiene su historial",
    example: "Directorio + recorrido →",
    description:
      "Ficha de cualquier MMSI con bandera, tipo y posiciones AIS; sub-página de recorrido con viajes y escalas portuarias.",
  },
  {
    href: "/transporte-publico/metro-de-madrid",
    Icon: Bus,
    iconColorVar: "#1e40af",
    bgColorVar: "rgba(30,64,175,0.08)",
    category: "Transporte público",
    title: "Cada línea, cada parada",
    example: "Ej: Metro de Madrid →",
    description:
      "15+ operadores GTFS con páginas por operador, por línea (con horarios completos) y por parada.",
  },
  {
    href: "/accidentes/carretera/AP-7",
    Icon: AlertTriangle,
    iconColorVar: "#b91c1c",
    bgColorVar: "rgba(185,28,28,0.08)",
    category: "Siniestralidad DGT",
    title: "Cada carretera, sus accidentes",
    example: "Ej: AP-7 →",
    description:
      "80 carreteras pre-analizadas con puntos kilométricos negros, evolución 2019–2023 y desglose por gravedad y clima.",
  },
  {
    href: "/carga-ev",
    Icon: Zap,
    iconColorVar: "#0891b2",
    bgColorVar: "rgba(8,145,178,0.08)",
    category: "Carga eléctrica",
    title: "Cada cargador, sus conectores",
    example: "12 000 puntos →",
    description:
      "Potencia, tipos de conector, métodos de pago, cargadores y gasolineras cerca. Cómo llegar en un tap.",
  },
  {
    href: "/gasolineras",
    Icon: Fuel,
    iconColorVar: "#d97706",
    bgColorVar: "rgba(217,119,6,0.08)",
    category: "Combustible",
    title: "Cada gasolinera, sus precios",
    example: "11 000 estaciones →",
    description:
      "Precios oficiales MINETUR + histórico + comparativa con misma marca cerca y la más barata de la marca en España.",
  },
];

export function EntitySamples() {
  return (
    <section
      aria-labelledby="entity-samples-heading"
      className="py-16 px-6 bg-gray-50 dark:bg-gray-950 border-t border-b border-gray-100 dark:border-gray-900"
    >
      <div className="max-w-7xl mx-auto">
        <div className="max-w-3xl mb-10">
          <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-tl-600 dark:text-tl-400 mb-2">
            Páginas individuales
          </p>
          <h2
            id="entity-samples-heading"
            className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-50 leading-tight"
          >
            Cada entidad tiene su propia página
          </h2>
          <p className="mt-3 text-base sm:text-lg text-gray-600 dark:text-gray-300">
            No solo los hubs. Cada tren en circulación, cada buque AIS, cada gasolinera, cada
            cargador, cada parada de metro y cada carretera estatal tiene una página de
            aterrizaje con datos en vivo y enlaces a su contexto.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CARDS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group flex flex-col gap-3 p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-tl-300 dark:hover:border-tl-700 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: card.bgColorVar }}
                >
                  <card.Icon className="w-5 h-5" style={{ color: card.iconColorVar }} />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {card.category}
                </span>
              </div>
              <h3 className="font-heading text-lg font-bold text-gray-900 dark:text-gray-100 leading-snug">
                {card.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed flex-1">
                {card.description}
              </p>
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {card.example}
                </span>
                <ArrowRight
                  className="w-4 h-4 text-gray-400 group-hover:text-tl-600 dark:group-hover:text-tl-400 group-hover:translate-x-0.5 transition-all"
                  aria-hidden="true"
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
