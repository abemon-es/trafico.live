"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

type Tier = "FREE" | "PRO" | "ENTERPRISE";

interface TierResult {
  name: Tier;
  cost: string;
  explanation: string;
}

function computeTier(requests: number): TierResult {
  // FREE: 1.000 req/día × 30 = 30.000/mes
  // PRO: 100.000 req/día × 30 = 3.000.000/mes
  // ENTERPRISE: sin límite
  if (requests <= 30_000) {
    return {
      name: "FREE",
      cost: "0€/mes",
      explanation:
        "El plan FREE cubre 1.000 req/día (30.000/mes). Suficiente para tu volumen previsto.",
    };
  }
  if (requests <= 3_000_000) {
    return {
      name: "PRO",
      cost: "49€/mes",
      explanation:
        "El plan PRO cubre 100.000 req/día (3 M/mes). Incluye datos históricos, análisis avanzado y flota ferroviaria en tiempo real.",
    };
  }
  return {
    name: "ENTERPRISE",
    cost: "149€/mes",
    explanation:
      "El plan ENTERPRISE ofrece peticiones ilimitadas, webhooks push, bulk export y soporte prioritario con SLA.",
  };
}

const TIER_CLASSES: Record<Tier, string> = {
  FREE: "bg-tl-100 dark:bg-tl-900 text-tl-700 dark:text-tl-200 border-tl-200 dark:border-tl-700",
  PRO: "bg-[color:var(--tl-primary-bg)] text-tl-800 dark:text-tl-100 border-[color:var(--tl-primary)]",
  ENTERPRISE:
    "bg-tl-amber-50 dark:bg-tl-amber-900/20 text-tl-amber-900 dark:text-tl-amber-200 border-tl-amber-300 dark:border-tl-amber-700",
};

export function CostCalculator() {
  const [requests, setRequests] = useState(50_000);
  const result = computeTier(requests);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-tl-200 dark:border-tl-800 p-6 space-y-5">
      {/* Slider */}
      <div>
        <label
          htmlFor="req-slider"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Peticiones al mes:{" "}
          <span className="font-mono font-bold text-[color:var(--tl-primary)]">
            {requests.toLocaleString("es-ES")}
          </span>
        </label>
        <input
          id="req-slider"
          type="range"
          min={1_000}
          max={10_000_000}
          step={1_000}
          value={requests}
          onChange={(e) => setRequests(Number(e.target.value))}
          className="w-full accent-[color:var(--tl-primary)]"
        />
        <div className="flex justify-between text-xs text-tl-400 dark:text-tl-500 mt-1 select-none">
          <span>1.000</span>
          <span>1 M</span>
          <span>10 M</span>
        </div>
      </div>

      {/* Result */}
      <div
        className={`rounded-xl border p-4 flex items-start gap-4 ${TIER_CLASSES[result.name]}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1 flex-wrap">
            <span className="font-mono text-sm font-bold">{result.name}</span>
            <span className="font-mono text-xl font-bold">{result.cost}</span>
          </div>
          <p className="text-sm leading-relaxed">{result.explanation}</p>
        </div>
        <a
          href="#precios"
          className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold hover:underline mt-0.5 whitespace-nowrap"
        >
          Ver plan
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>

      <p className="text-xs text-tl-400 dark:text-tl-500">
        Los límites diarios se aplican en ventana deslizante de 24 h. Puedes
        combinar hasta 3 claves FREE por email para distintos entornos.
      </p>
    </div>
  );
}
