import { Car, TrainFront, Bus, Plane } from "lucide-react";

interface ComparisonTableProps {
  origin: string;
  destination: string;
}

const MODES = [
  { label: "Coche",  Icon: Car        },
  { label: "Tren",   Icon: TrainFront },
  { label: "Bus",    Icon: Bus        },
  { label: "Avión",  Icon: Plane      },
];

const COLUMNS = ["Duración", "Precio desde", "Frecuencia", "CO2 aprox."];

/**
 * Placeholder comparison table for multimodal travel.
 * All cells show "—" until S4 wires the data engine.
 *
 * TODO(S4-T1.9): Populate rows from /api/ir/comparison?origin=&destination=
 *   which will return duration, price, frequency, co2 per mode.
 */
export function ComparisonTable({ origin, destination }: ComparisonTableProps) {
  return (
    <section
      aria-label={`Comparativa de medios de transporte de ${origin} a ${destination}`}
      className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
    >
      <div className="px-5 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <h2 className="font-display text-base font-bold text-gray-900 dark:text-gray-100">
          Comparativa de medios de transporte
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Próximamente: motor de rutas combinadas con datos en tiempo real.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800">
              <th className="text-left px-5 py-3 font-semibold text-gray-600 dark:text-gray-400 w-32">
                Medio
              </th>
              {COLUMNS.map((col) => (
                <th
                  key={col}
                  className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODES.map(({ label, Icon }, idx) => (
              <tr
                key={label}
                className={
                  idx % 2 === 0
                    ? "bg-white dark:bg-gray-950"
                    : "bg-gray-50/50 dark:bg-gray-900/50"
                }
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
                    <Icon className="w-4 h-4 text-tl-500" aria-hidden />
                    {label}
                  </div>
                </td>
                {COLUMNS.map((col) => (
                  <td
                    key={col}
                    className="px-4 py-3 text-gray-400 dark:text-gray-600 font-mono text-xs"
                  >
                    —
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
