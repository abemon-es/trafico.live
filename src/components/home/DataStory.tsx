import type { HomeStats } from "@/app/HomeClient";

interface BigNumber {
  value: string;
  label: string;
  detail: string;
  colorClass: string;
}

// Gas stations and chargers are counted live (they read 12.437 and 18.642,
// written by hand; the database had 12.470 and 12.074), and drop out when the
// count didn't load. Gone: «6.117 sensores Madrid» (4.902 report today) and
// «2003–25» accidents, a range no table holds.
function bigNumbers(stats: HomeStats): BigNumber[] {
  const live = (n: number, item: Omit<BigNumber, "value">): BigNumber[] =>
    n > 0 ? [{ value: n.toLocaleString("es-ES"), ...item }] : [];
  return [
    { value: "14.400+", label: "Estaciones de aforo", detail: "IMD desde 2017", colorClass: "text-tl-600" },
    ...live(stats.stationCount, { label: "Gasolineras", detail: "Precios diarios", colorClass: "text-tl-amber-500" }),
    ...live(stats.chargerCount, { label: "Cargadores EV", detail: "Red completa", colorClass: "text-signal-green" }),
    { value: "2019–23", label: "Accidentes con víctimas", detail: "Microdatos DGT", colorClass: "text-signal-red" },
  ];
}

const SOURCES = [
  "DGT NAP",
  "AEMET",
  "Min. Transportes",
  "MINETUR",
  "Madrid Informo",
  "SCT Catalunya",
  "Euskadi",
  "Valencia",
  "IPMA Portugal",
  "DGEG Portugal",
  "Mobilitat Andorra",
  "ArcGIS REST",
];

export function DataStory({ stats }: { stats: HomeStats }) {
  return (
    <section className="py-18 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900 border-t border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto text-center">
        {/* Header */}
        <p className="font-heading text-xs font-semibold uppercase tracking-widest text-tl-600 mb-1">
          La radiografía completa
        </p>
        <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight mb-8">
          España en datos
        </h2>

        {/* Big numbers row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {bigNumbers(stats).map((item) => (
            <div key={item.label} className="text-center">
              <p
                className={`font-data text-4xl font-bold tracking-tight leading-none mb-1 ${item.colorClass}`}
              >
                {item.value}
              </p>
              <p className="font-heading text-xs font-semibold text-gray-700 dark:text-gray-300 mb-0.5">
                {item.label}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{item.detail}</p>
            </div>
          ))}
        </div>

        {/* Source badges */}
        <div className="flex flex-wrap justify-center gap-1.5">
          {SOURCES.map((source) => (
            <span
              key={source}
              className="text-xs text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-0.5"
            >
              {source}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
