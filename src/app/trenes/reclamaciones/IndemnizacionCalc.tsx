"use client";

import { useState } from "react";
import { Euro, Clock, AlertTriangle } from "lucide-react";

// ─── Compensation logic (Reglamento UE 1371/2007, art. 17) ───────────────────

function calcIndemnizacion(precioEur: number, retrasoMin: number): {
  porcentaje: number;
  importe: number;
  nivel: "none" | "partial" | "half" | "full";
  mensaje: string;
} {
  if (retrasoMin < 60) {
    return {
      porcentaje: 0,
      importe: 0,
      nivel: "none",
      mensaje: "Con menos de 60 minutos de retraso no hay derecho a indemnización.",
    };
  }
  if (retrasoMin < 120) {
    const importe = precioEur * 0.25;
    return {
      porcentaje: 25,
      importe,
      nivel: "partial",
      mensaje: `Retraso de 60–119 min: 25 % del precio del billete.`,
    };
  }
  const importe = precioEur * 0.5;
  return {
    porcentaje: 50,
    importe,
    nivel: "half",
    mensaje: `Retraso ≥ 120 min: 50 % del precio del billete.`,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function IndemnizacionCalc() {
  const [precio, setPrecio] = useState("");
  const [retraso, setRetraso] = useState("");

  const precioNum = parseFloat(precio.replace(",", "."));
  const retrasoNum = parseInt(retraso, 10);

  const ready = !isNaN(precioNum) && precioNum > 0 && !isNaN(retrasoNum) && retrasoNum > 0;
  const result = ready ? calcIndemnizacion(precioNum, retrasoNum) : null;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
      <div className="p-6 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Price input */}
          <div>
            <label
              htmlFor="calc-precio"
              className="block font-body text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Precio del billete (€)
            </label>
            <div className="relative">
              <Euro
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                aria-hidden
              />
              <input
                id="calc-precio"
                type="number"
                min="0"
                step="0.01"
                placeholder="ej. 49.50"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-data text-sm focus:outline-none focus:ring-2 focus:ring-tl-500 focus:border-transparent transition"
                aria-label="Precio del billete en euros"
              />
            </div>
          </div>

          {/* Delay input */}
          <div>
            <label
              htmlFor="calc-retraso"
              className="block font-body text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Minutos de retraso
            </label>
            <div className="relative">
              <Clock
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                aria-hidden
              />
              <input
                id="calc-retraso"
                type="number"
                min="0"
                step="1"
                placeholder="ej. 90"
                value={retraso}
                onChange={(e) => setRetraso(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-data text-sm focus:outline-none focus:ring-2 focus:ring-tl-500 focus:border-transparent transition"
                aria-label="Minutos de retraso"
              />
            </div>
          </div>
        </div>

        {/* Result */}
        {result && (
          <div
            aria-live="polite"
            aria-atomic="true"
            className={`rounded-xl p-5 border ${
              result.nivel === "none"
                ? "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                : result.nivel === "partial"
                ? "border-tl-amber-200 dark:border-tl-amber-800/40 bg-tl-amber-50 dark:bg-tl-amber-900/10"
                : "border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-900/10"
            }`}
          >
            {result.nivel === "none" ? (
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <p className="font-body text-sm text-gray-600 dark:text-gray-400">
                  {result.mensaje}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-5">
                <div>
                  <p
                    className={`font-data text-4xl font-bold ${
                      result.nivel === "partial"
                        ? "text-tl-amber-600 dark:text-tl-amber-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {result.importe.toLocaleString("es-ES", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    €
                  </p>
                  <p className="font-body text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {result.porcentaje}&nbsp;% de {precioNum.toFixed(2)}&nbsp;€
                  </p>
                </div>
                <div className="flex-1 min-w-0 border-l border-current/10 pl-5">
                  <p className="font-body text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {result.mensaje}
                  </p>
                  <p className="font-body text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Art. 17 Reglamento UE 1371/2007 · actualizado por Reg. 2021/782
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {!ready && !result && (
          <p className="font-body text-xs text-gray-400 dark:text-gray-500 text-center">
            Introduce el precio del billete y los minutos de retraso para calcular.
          </p>
        )}
      </div>

      <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
        <p className="font-body text-[11px] text-gray-400 dark:text-gray-500">
          Cálculo orientativo según Reglamento (CE) n.º 1371/2007 y Reg. (UE) 2021/782. Para abonos
          el importe es proporcional. Este cálculo no constituye asesoramiento jurídico.
        </p>
      </div>
    </div>
  );
}
