import Link from "next/link";

interface StatPill {
  value: string;
  label: string;
}

interface BorderCard {
  flag: string;
  title: string;
  description: string;
  stats: StatPill[];
  href: string;
}

const CARDS: BorderCard[] = [
  {
    flag: "🇪🇸",
    title: "España",
    description:
      "Cobertura total: 52 provincias, 19 CC.AA., 8.131 municipios. Cada territorio con su propia página de inteligencia de tráfico.",
    stats: [
      { value: "52", label: "provincias" },
      { value: "8.131", label: "municipios" },
      { value: "80+", label: "páginas" },
    ],
    href: "/espana",
  },
  {
    flag: "🇵🇹",
    title: "Portugal",
    description:
      "3.000+ gasolineras DGEG. Meteorología IPMA. Accidentes ANSR. Combustible actualizado diariamente.",
    stats: [
      { value: "3.000+", label: "gasolineras" },
      { value: "IPMA", label: "meteo" },
      { value: "ANSR", label: "accidentes" },
    ],
    href: "/portugal",
  },
  {
    flag: "🇦🇩",
    title: "Andorra",
    description:
      "Incidencias y cámaras de Mobilitat Andorra. Integrado con datos DGT fronterizos.",
    stats: [
      { value: "Mobilitat", label: "fuente" },
      { value: "Cámaras", label: "en vivo" },
      { value: "Incidencias", label: "real-time" },
    ],
    href: "/andorra",
  },
];

export function CrossBorder() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between mb-7">
          <div>
            <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-tl-600 dark:text-tl-400 mb-1">
              Península Ibérica completa
            </p>
            <h2 className="font-heading text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
              España · Portugal · Andorra
            </h2>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {CARDS.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:border-tl-300 dark:hover:border-tl-700 transition-colors group"
            >
              {/* Flag — text character, not UI icon */}
              <span
                className="text-2xl mb-2 block"
                role="img"
                aria-label={card.title}
              >
                {card.flag}
              </span>

              <h3 className="font-heading text-[0.9rem] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {card.title}
              </h3>

              <p className="text-[0.725rem] text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
                {card.description}
              </p>

              {/* Stat pills */}
              <div className="flex flex-wrap gap-2">
                {card.stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="bg-gray-50 dark:bg-gray-800/60 rounded-md px-2 py-1.5"
                  >
                    <span className="font-data text-[0.7rem] font-medium text-gray-900 dark:text-gray-100 block">
                      {stat.value}
                    </span>
                    <span className="text-[0.525rem] text-gray-400 dark:text-gray-500">
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
