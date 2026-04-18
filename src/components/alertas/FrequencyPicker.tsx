"use client";

import { Zap, Calendar, CalendarDays } from "lucide-react";

export type AlertFrequency = "REAL_TIME" | "DAILY" | "WEEKLY";

interface FrequencyOption {
  value: AlertFrequency;
  label: string;
  description: string;
  icon: typeof Zap;
}

const OPTIONS: FrequencyOption[] = [
  {
    value: "REAL_TIME",
    label: "Tiempo real",
    description: "Al instante de detectarse",
    icon: Zap,
  },
  {
    value: "DAILY",
    label: "Resumen diario",
    description: "Una notificación al día con el resumen",
    icon: Calendar,
  },
  {
    value: "WEEKLY",
    label: "Resumen semanal",
    description: "Un resumen cada lunes",
    icon: CalendarDays,
  },
];

interface FrequencyPickerProps {
  value: AlertFrequency;
  onChange: (f: AlertFrequency) => void;
}

export function FrequencyPicker({ value, onChange }: FrequencyPickerProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={[
              "flex-1 flex items-start gap-3 rounded-lg border-2 p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-tl-600",
              selected
                ? "border-tl-600 bg-tl-50 dark:bg-tl-900/20 dark:border-tl-400"
                : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-tl-300",
            ].join(" ")}
            aria-pressed={selected}
          >
            <div
              className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${
                selected
                  ? "bg-tl-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
              }`}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <p
                className={`text-sm font-semibold ${
                  selected ? "text-tl-700 dark:text-tl-300" : "text-gray-900 dark:text-gray-100"
                }`}
              >
                {opt.label}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{opt.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
