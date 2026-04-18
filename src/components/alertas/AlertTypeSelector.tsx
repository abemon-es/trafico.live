"use client";

import { motion } from "motion/react";
import { Route as Road, Train, Plane } from "lucide-react";

export type AlertType = "ROAD" | "TRAIN" | "FLIGHT";

interface TypeOption {
  value: AlertType;
  label: string;
  description: string;
  icon: typeof Road;
  examples: string;
}

const TYPE_OPTIONS: TypeOption[] = [
  {
    value: "ROAD",
    label: "Carretera",
    description: "Incidencias, obras y retenciones en una vía",
    icon: Road,
    examples: "A-6, M-30, AP-7, N-340...",
  },
  {
    value: "TRAIN",
    label: "Tren",
    description: "Retrasos y alertas en líneas de Cercanías, AVE o Larga Distancia",
    icon: Train,
    examples: "Madrid-Barcelona, Cercanías C-1...",
  },
  {
    value: "FLIGHT",
    label: "Vuelo",
    description: "Estado de vuelo por código IATA",
    icon: Plane,
    examples: "IB6250, VY1234, FR4321...",
  },
];

interface AlertTypeSelectorProps {
  value: AlertType | null;
  onChange: (type: AlertType) => void;
}

export function AlertTypeSelector({ value, onChange }: AlertTypeSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {TYPE_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const selected = value === opt.value;
        return (
          <motion.button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={[
              "relative text-left rounded-xl border-2 p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-tl-600",
              selected
                ? "border-tl-600 bg-tl-50 dark:bg-tl-900/20 dark:border-tl-400"
                : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-tl-300 dark:hover:border-tl-600",
            ].join(" ")}
            aria-pressed={selected}
          >
            {selected && (
              <motion.span
                layoutId="type-selection"
                className="absolute inset-0 rounded-xl border-2 border-tl-600 dark:border-tl-400"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                selected
                  ? "bg-tl-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
              }`}
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
            </div>
            <p
              className={`font-semibold font-heading text-sm ${
                selected
                  ? "text-tl-700 dark:text-tl-300"
                  : "text-gray-900 dark:text-gray-100"
              }`}
            >
              {opt.label}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {opt.description}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic">
              {opt.examples}
            </p>
          </motion.button>
        );
      })}
    </div>
  );
}
