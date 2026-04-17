import { Plane, TrainFront, Bus, Car } from "lucide-react";

interface OffersProps {
  origin: string;
  destination: string;
}

/**
 * Placeholder component for multimodal travel offers.
 * Will be populated in S4 via HS6 (T2.4 provider integration).
 *
 * TODO(S4-T1.9): Wire to /api/ir/offers?origin=&destination= — returns
 *   ranked results from AVE, bus operators, BlaBlaCar, Vueling, Iberia.
 */
export function Offers({ origin, destination }: OffersProps) {
  const modes = [
    { label: "Avión",  Icon: Plane      },
    { label: "Tren",   Icon: TrainFront },
    { label: "Bus",    Icon: Bus        },
    { label: "Coche",  Icon: Car        },
  ];

  return (
    <section
      aria-label={`Ofertas de viaje de ${origin} a ${destination}`}
      className="rounded-xl border border-tl-200 dark:border-tl-800 bg-tl-50 dark:bg-tl-900/20 p-6"
    >
      <h2 className="font-display text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">
        Ofertas de viaje
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Próximamente: vuelos, trenes, bus y coche compartido en un solo lugar.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {modes.map(({ label, Icon }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-2 p-4 rounded-lg bg-white dark:bg-gray-900 border border-tl-100 dark:border-tl-800 opacity-60"
          >
            <Icon className="w-6 h-6 text-tl-400" aria-hidden />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
