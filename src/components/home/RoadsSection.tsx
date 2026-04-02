import Link from "next/link";

interface RoadTypeCard {
  typeLabel: string;
  typeLabelColor: string;
  title: string;
  examples: string;
  stats: Array<{ value: string; label: string }>;
  href: string;
}

const ROAD_TYPES: RoadTypeCard[] = [
  {
    typeLabel: "Alta capacidad",
    typeLabelColor: "text-tl-600 dark:text-tl-400",
    title: "Autopistas",
    examples: "AP-1 · AP-2 · AP-6 · AP-7 · AP-68",
    stats: [
      { value: "23", label: "autopistas" },
      { value: "156", label: "radares" },
      { value: "89", label: "cámaras" },
    ],
    href: "/carreteras/autopistas",
  },
  {
    typeLabel: "Alta capacidad",
    typeLabelColor: "text-tl-600 dark:text-tl-400",
    title: "Autovías",
    examples: "A-1 · A-2 · A-3 · A-4 · A-5 · A-6",
    stats: [
      { value: "87", label: "autovías" },
      { value: "412", label: "radares" },
      { value: "234", label: "cámaras" },
    ],
    href: "/carreteras/autovias",
  },
  {
    typeLabel: "Convencional",
    typeLabelColor: "text-tl-amber-500 dark:text-tl-amber-400",
    title: "Nacionales",
    examples: "N-I · N-II · N-III · N-IV · N-V",
    stats: [
      { value: "165", label: "nacionales" },
      { value: "389", label: "radares" },
    ],
    href: "/carreteras/nacionales",
  },
  {
    typeLabel: "Autonómica",
    typeLabelColor: "text-gray-400 dark:text-gray-500",
    title: "Regionales",
    examples: "M-30 · B-20 · AG-55 · CT-31",
    stats: [
      { value: "2.400+", label: "vías" },
      { value: "290", label: "radares" },
    ],
    href: "/carreteras/regionales",
  },
];

const EXTRA_TAGS = [
  { label: "Límites de velocidad", href: "/carreteras/limites-velocidad" },
  { label: "Puntos negros", href: "/carreteras/puntos-negros" },
  { label: "Zonas ZBE (13+)", href: "/zbe" },
  { label: "14.400+ estaciones aforo", href: "/estaciones-aforo" },
  { label: "IMD 2017-2022", href: "/intensidad" },
  { label: "Distribución horaria", href: "/carreteras/distribucion-horaria" },
  { label: "Detectores velocidad", href: "/carreteras/detectores" },
  { label: "Operaciones DGT", href: "/carreteras/operaciones" },
];

export function RoadsSection() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between mb-7">
          <div>
            <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-tl-600 dark:text-tl-400 mb-1">
              Red viaria
            </p>
            <h2 className="font-heading text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
              Carreteras con flujo en vivo
            </h2>
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 max-w-lg leading-relaxed">
              Cada carretera con detectores de velocidad, incidencias, cámaras,
              radares, límites de velocidad, puntos negros e IMD histórico.
            </p>
          </div>
          <Link
            href="/carreteras"
            className="text-xs text-tl-600 dark:text-tl-400 font-medium whitespace-nowrap hover:text-tl-700 dark:hover:text-tl-300 transition-colors"
          >
            Ver todas &rarr;
          </Link>
        </div>

        {/* Road type cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {ROAD_TYPES.map((road) => (
            <Link
              key={road.title}
              href={road.href}
              className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-4 hover:border-tl-300 dark:hover:border-tl-700 transition-colors group"
            >
              <p
                className={`font-heading text-[0.575rem] font-semibold uppercase tracking-wider mb-1 ${road.typeLabelColor}`}
              >
                {road.typeLabel}
              </p>
              <h3 className="font-heading text-[0.85rem] font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
                {road.title}
              </h3>
              <p className="font-data text-[0.625rem] text-gray-400 dark:text-gray-500 mb-2">
                {road.examples}
              </p>

              {/* Stats row */}
              <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-800 mt-2">
                {road.stats.map((stat) => (
                  <div key={stat.label}>
                    <span className="font-data text-[0.725rem] font-medium text-gray-900 dark:text-gray-100 block">
                      {stat.value}
                    </span>
                    <span className="text-[0.575rem] text-gray-400 dark:text-gray-500">
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>
            </Link>
          ))}
        </div>

        {/* Extra tag row */}
        <div className="flex flex-wrap gap-1.5 mt-4">
          {EXTRA_TAGS.map((tag) => (
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
