"use client";

import useSWR from "swr";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface FuelPricesToday {
  national?: {
    avgGasolina95?: number | null;
    avgGasoleoA?: number | null;
    avgGasolina98?: number | null;
    avgGlp?: number | null;
    deltaGasolina95?: number | null;
    deltaGasoleoA?: number | null;
    deltaGasolina98?: number | null;
    deltaGlp?: number | null;
  } | null;
}

interface FuelCard {
  key: string;
  label: string;
  staticPrice: number;
  staticDelta: number;
  getPrice: (d: FuelPricesToday) => number | null | undefined;
  getDelta: (d: FuelPricesToday) => number | null | undefined;
  isGlp?: boolean;
}

const FUEL_CARDS: FuelCard[] = [
  {
    key: "g95",
    label: "Gasolina 95",
    staticPrice: 1.389,
    staticDelta: -0.8,
    getPrice: (d) => d.national?.avgGasolina95,
    getDelta: (d) => d.national?.deltaGasolina95,
  },
  {
    key: "ga",
    label: "Gasóleo A",
    staticPrice: 1.312,
    staticDelta: -1.2,
    getPrice: (d) => d.national?.avgGasoleoA,
    getDelta: (d) => d.national?.deltaGasoleoA,
  },
  {
    key: "g98",
    label: "Gasolina 98",
    staticPrice: 1.542,
    staticDelta: 0.3,
    getPrice: (d) => d.national?.avgGasolina98,
    getDelta: (d) => d.national?.deltaGasolina98,
  },
  {
    key: "glp",
    label: "GLP",
    staticPrice: 0.734,
    staticDelta: -0.5,
    getPrice: (d) => d.national?.avgGlp,
    getDelta: (d) => d.national?.deltaGlp,
    isGlp: true,
  },
];

const BOTTOM_TAGS = [
  { label: "Baratas", href: "/gasolineras/baratas" },
  { label: "24h", href: "/gasolineras/24-horas" },
  { label: "Marcas", href: "/gasolineras/marcas" },
  { label: "Por provincia", href: "/gasolineras/provincias" },
  { label: "Histórico", href: "/gasolineras/historico" },
  { label: "Marítimo", href: "/maritimo/combustible" },
  { label: "Portugal (3.000+)", href: "/portugal/combustible" },
];

function formatPrice(price: number): string {
  return price.toLocaleString("es-ES", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

function DeltaBadge({ delta }: { delta: number }) {
  const isDown = delta <= 0;
  return (
    <span
      className={`text-[0.625rem] mt-1 block ${
        isDown
          ? "text-signal-green"
          : "text-signal-red"
      }`}
    >
      {isDown ? "▼" : "▲"}{" "}
      {Math.abs(delta).toLocaleString("es-ES", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })}
      %
    </span>
  );
}

export function FuelSection() {
  const { data } = useSWR<FuelPricesToday>("/api/fuel-prices/today", fetcher, {
    refreshInterval: 300000,
  });

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between mb-7">
          <div>
            <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-tl-600 dark:text-tl-400 mb-1">
              Precios hoy
            </p>
            <h2 className="font-heading text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
              Combustible · 12.437 estaciones
            </h2>
          </div>
          <Link
            href="/gasolineras"
            className="text-xs text-tl-600 dark:text-tl-400 font-medium whitespace-nowrap hover:text-tl-700 dark:hover:text-tl-300 transition-colors"
          >
            Todas las gasolineras &rarr;
          </Link>
        </div>

        {/* Price cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {FUEL_CARDS.map((card) => {
            const rawPrice = data ? card.getPrice(data) : null;
            const rawDelta = data ? card.getDelta(data) : null;
            const price = rawPrice != null ? rawPrice : card.staticPrice;
            const delta = rawDelta != null ? rawDelta : card.staticDelta;

            return (
              <Link
                key={card.key}
                href={`/gasolineras/${card.key}`}
                className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-center hover:border-tl-amber-400 dark:hover:border-tl-amber-600 transition-colors"
              >
                <p className="text-[0.7rem] text-gray-500 dark:text-gray-400 font-medium mb-0.5">
                  {card.label}
                </p>
                <p
                  className={`font-data text-2xl font-bold ${
                    card.isGlp
                      ? "text-signal-green"
                      : "text-tl-amber-500 dark:text-tl-amber-400"
                  }`}
                >
                  {formatPrice(price)}
                </p>
                <p className="text-[0.6rem] text-gray-400 dark:text-gray-500">
                  €/litro
                </p>
                <DeltaBadge delta={delta} />
              </Link>
            );
          })}
        </div>

        {/* Bottom tags */}
        <div className="flex flex-wrap gap-1.5 mt-4">
          {BOTTOM_TAGS.map((tag) => (
            <Link
              key={tag.label}
              href={tag.href}
              className="text-[0.575rem] bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 rounded px-1.5 py-0.5 hover:bg-tl-50 dark:hover:bg-tl-900/30 hover:text-tl-600 dark:hover:text-tl-400 transition-colors"
            >
              {tag.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
