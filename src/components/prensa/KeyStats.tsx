interface Stat {
  value: string;
  label: string;
  sublabel?: string;
}

interface KeyStatsProps {
  stats?: Stat[];
}

const DEFAULT_STATS: Stat[] = [
  { value: "150+", label: "páginas indexadas", sublabel: "SEO multimodal" },
  { value: "43", label: "colectores de datos", sublabel: "fuentes oficiales" },
  { value: "121", label: "endpoints API", sublabel: "REST + MCP" },
  { value: "26", label: "colecciones Typesense", sublabel: "búsqueda geo" },
  { value: "78", label: "modelos Prisma", sublabel: "PostgreSQL + PostGIS" },
  { value: "27K+", label: "páginas SSG", sublabel: "entidades estáticas" },
  { value: "10M+", label: "posiciones AIS/día", sublabel: "tracking marítimo" },
  { value: "565", label: "estaciones calidad aire", sublabel: "Red MITECO" },
];

export function KeyStats({ stats = DEFAULT_STATS }: KeyStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 text-center"
        >
          <div className="text-3xl font-heading font-bold text-tl-600 dark:text-tl-400 mb-1 font-mono">
            {stat.value}
          </div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
            {stat.label}
          </div>
          {stat.sublabel && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {stat.sublabel}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
