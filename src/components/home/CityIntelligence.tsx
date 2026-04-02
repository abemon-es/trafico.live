import Link from "next/link";

const MINI_CARDS = [
  {
    title: "Incidencias activas",
    titleColor: "text-signal-red",
    stats: [
      { label: "activas", value: "3" },
      { label: "retenciones", value: "1" },
      { label: "obras", value: "2" },
    ],
  },
  {
    title: "Combustible más barato",
    titleColor: "text-tl-amber-500",
    stats: [
      { label: "Gasolina 95", value: "1,229 €/L" },
      { label: "Diésel", value: "1,189 €/L" },
    ],
  },
  {
    title: "Infraestructura",
    titleColor: "text-tl-600",
    stats: [
      { label: "cámaras", value: "18" },
      { label: "radares", value: "12" },
      { label: "gasolineras", value: "45" },
      { label: "cargadores", value: "24" },
    ],
  },
  {
    title: "Índice de tráfico",
    titleColor: "text-signal-green",
    stats: [
      { label: "Score", value: "87/100", valueColor: "text-signal-green" },
      { label: "IMD medio", value: "18.420 veh/día" },
    ],
  },
];

const SECTION_TAGS = [
  "Resumen",
  "Mapa",
  "Incidencias",
  "Combustible",
  "Cámaras",
  "Radares",
  "Carga EV",
  "Carreteras",
  "Meteorología",
  "ZBE",
  "Accidentes",
  "Zonas riesgo",
  "Paneles DGT",
  "V16",
  "Velocidades",
  "Noticias",
];

export function CityIntelligence() {
  return (
    <section className="py-18 px-4 sm:px-6 lg:px-8 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <p className="font-heading text-xs font-semibold uppercase tracking-widest text-tl-600 mb-1">
          Inteligencia por ciudad
        </p>
        <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight mb-2">
          Cada ciudad, analizada al detalle
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xl mb-7">
          Páginas dedicadas para cada ciudad con incidencias, combustible, cámaras, radares,
          cargadores EV, meteorología, ZBE, accidentes históricos y más.
        </p>

        {/* Two-column card */}
        <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-2">
          {/* Left — mini stat cards */}
          <div className="bg-gray-50 dark:bg-gray-900 p-6 flex flex-col gap-3">
            {MINI_CARDS.map((card) => (
              <div
                key={card.title}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3"
              >
                <h4 className={`text-xs font-semibold mb-2 ${card.titleColor}`}>{card.title}</h4>
                <div className="flex flex-wrap gap-3">
                  {card.stats.map((stat) => (
                    <span key={stat.label} className="text-xs text-gray-500 dark:text-gray-400">
                      <span
                        className={`font-data font-medium text-gray-900 dark:text-gray-100 ${stat.valueColor ?? ""}`}
                      >
                        {stat.value}
                      </span>{" "}
                      {stat.label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Right — description + tags + CTA */}
          <div className="bg-white dark:bg-gray-950 p-6 flex flex-col justify-center">
            <p className="font-heading text-xs font-semibold uppercase tracking-widest text-tl-600 mb-1">
              Ejemplo: Valladolid
            </p>
            <h3 className="font-heading text-lg font-bold text-gray-900 dark:text-gray-50 mb-2">
              Dashboard completo por ciudad
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-5">
              Cada ciudad tiene su propia página con sidebar de navegación, datos en vivo, mapa
              interactivo, ranking de gasolineras, cámaras en directo, historial de accidentes,
              zonas de riesgo, paneles DGT y noticias locales.
            </p>

            {/* Section tag pills */}
            <div className="flex flex-wrap gap-1.5 mb-6">
              {SECTION_TAGS.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400"
                >
                  {tag}
                </span>
              ))}
            </div>

            <Link
              href="/trafico/valladolid"
              className="inline-flex items-center gap-2 self-start bg-tl-600 hover:bg-tl-700 text-white font-heading font-semibold text-sm rounded-lg px-5 py-2.5 transition-colors"
            >
              Ver ejemplo: Valladolid &rarr;
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
