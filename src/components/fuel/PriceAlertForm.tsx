"use client";

import { useState, FormEvent } from "react";
import { Bell, Check, AlertCircle, X } from "lucide-react";
import { trackPriceAlert } from "@/lib/analytics";

const PROVINCES: { code: string; name: string }[] = [
  { code: "01", name: "Álava" },
  { code: "02", name: "Albacete" },
  { code: "03", name: "Alicante" },
  { code: "04", name: "Almería" },
  { code: "05", name: "Ávila" },
  { code: "06", name: "Badajoz" },
  { code: "07", name: "Baleares" },
  { code: "08", name: "Barcelona" },
  { code: "09", name: "Burgos" },
  { code: "10", name: "Cáceres" },
  { code: "11", name: "Cádiz" },
  { code: "12", name: "Castellón" },
  { code: "13", name: "Ciudad Real" },
  { code: "14", name: "Córdoba" },
  { code: "15", name: "A Coruña" },
  { code: "16", name: "Cuenca" },
  { code: "17", name: "Girona" },
  { code: "18", name: "Granada" },
  { code: "19", name: "Guadalajara" },
  { code: "20", name: "Gipuzkoa" },
  { code: "21", name: "Huelva" },
  { code: "22", name: "Huesca" },
  { code: "23", name: "Jaén" },
  { code: "24", name: "León" },
  { code: "25", name: "Lleida" },
  { code: "26", name: "La Rioja" },
  { code: "27", name: "Lugo" },
  { code: "28", name: "Madrid" },
  { code: "29", name: "Málaga" },
  { code: "30", name: "Murcia" },
  { code: "31", name: "Navarra" },
  { code: "32", name: "Ourense" },
  { code: "33", name: "Asturias" },
  { code: "34", name: "Palencia" },
  { code: "35", name: "Las Palmas" },
  { code: "36", name: "Pontevedra" },
  { code: "37", name: "Salamanca" },
  { code: "38", name: "S.C. Tenerife" },
  { code: "39", name: "Cantabria" },
  { code: "40", name: "Segovia" },
  { code: "41", name: "Sevilla" },
  { code: "42", name: "Soria" },
  { code: "43", name: "Tarragona" },
  { code: "44", name: "Teruel" },
  { code: "45", name: "Toledo" },
  { code: "46", name: "Valencia" },
  { code: "47", name: "Valladolid" },
  { code: "48", name: "Bizkaia" },
  { code: "49", name: "Zamora" },
  { code: "50", name: "Zaragoza" },
  { code: "51", name: "Ceuta" },
  { code: "52", name: "Melilla" },
];

interface PriceAlertFormProps {
  /** Pre-select a fuel type: "gasoleoA" | "gasolina95" */
  defaultFuelType?: "gasoleoA" | "gasolina95";
  /** Suggested target price (e.g. current national average) */
  defaultTargetPrice?: number;
  /** Pre-select a province code */
  defaultProvinceCode?: string;
  /** Card accent colour: "blue" (gasolina 95) | "amber" (gasóleo A) */
  accent?: "blue" | "amber";
}

type Status = "idle" | "loading" | "success" | "error";

export function PriceAlertForm({
  defaultFuelType = "gasolina95",
  defaultTargetPrice,
  defaultProvinceCode = "",
  accent = "blue",
}: PriceAlertFormProps) {
  const [email, setEmail] = useState("");
  const [fuelType, setFuelType] = useState<"gasoleoA" | "gasolina95">(defaultFuelType);
  const [targetPrice, setTargetPrice] = useState(
    defaultTargetPrice !== undefined ? defaultTargetPrice.toFixed(3) : ""
  );
  const [province, setProvince] = useState(defaultProvinceCode);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const isAmber = accent === "amber" || fuelType === "gasoleoA";

  const borderColor = isAmber ? "border-tl-amber-200 dark:border-tl-amber-800" : "border-tl-200 dark:border-tl-800";
  const bgColor = isAmber ? "bg-tl-amber-50 dark:bg-tl-amber-900/20" : "bg-tl-50 dark:bg-tl-900/20";
  const titleColor = isAmber ? "text-tl-amber-900" : "text-tl-800 dark:text-tl-200";
  const iconColor = isAmber ? "text-tl-amber-600 dark:text-tl-amber-400" : "text-tl-600 dark:text-tl-400";
  const btnClass = isAmber
    ? "bg-tl-amber-600 hover:bg-tl-amber-700 focus:ring-tl-amber-500"
    : "bg-tl-600 hover:bg-tl-700 focus:ring-tl-500 dark:ring-tl-400";
  const inputFocusClass = isAmber
    ? "focus:ring-tl-amber-400 focus:border-tl-amber-400"
    : "focus:ring-tl-400 focus:border-tl-400";

  const selectedProvince = PROVINCES.find((p) => p.code === province);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    const parsedPrice = parseFloat(targetPrice.replace(",", "."));
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setStatus("error");
      setMessage("Introduce un precio objetivo válido (p.ej. 1.450)");
      return;
    }

    try {
      const res = await fetch("/api/price-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          fuelType,
          targetPrice: parsedPrice,
          province: province || null,
          provinceName: selectedProvince?.name || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Error al crear la alerta. Inténtalo de nuevo.");
        return;
      }

      setStatus("success");
      trackPriceAlert(fuelType, province || undefined);
      setMessage(
        `Alerta creada correctamente. Te avisaremos en ${email} cuando el precio ${
          fuelType === "gasoleoA" ? "del Gasóleo A" : "de la Gasolina 95"
        } baje de ${parsedPrice.toFixed(3)}€${
          selectedProvince ? ` en ${selectedProvince.name}` : " en España"
        }.`
      );
      // Reset form fields (keep email for convenience)
      setTargetPrice("");
      setProvince("");
    } catch {
      setStatus("error");
      setMessage("Error de red. Por favor, inténtalo de nuevo más tarde.");
    }
  }

  function handleDismiss() {
    setStatus("idle");
    setMessage("");
  }

  return (
    <div className={`rounded-2xl border ${borderColor} ${bgColor} p-5 shadow-sm`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Bell className={`w-5 h-5 ${iconColor} flex-shrink-0`} />
        <div>
          <h3 className={`font-semibold ${titleColor} text-sm`}>
            Alerta de Precio de Combustible
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Recibe un aviso por email cuando el precio baje de tu objetivo
          </p>
        </div>
      </div>

      {/* Success state */}
      {status === "success" ? (
        <div className="flex items-start gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-xl p-4">
          <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-green-800">{message}</div>
          <button
            onClick={handleDismiss}
            className="text-green-600 dark:text-green-400 hover:text-green-800 flex-shrink-0"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          {/* Error message */}
          {status === "error" && message && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg px-3 py-2 mb-3 text-sm text-red-700 dark:text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Email */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="alert-email">
                Correo electrónico
              </label>
              <input
                id="alert-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className={`w-full rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 ${inputFocusClass} transition`}
              />
            </div>

            {/* Fuel type */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="alert-fuel-type">
                Combustible
              </label>
              <select
                id="alert-fuel-type"
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value as "gasoleoA" | "gasolina95")}
                className={`w-full rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 ${inputFocusClass} transition`}
              >
                <option value="gasolina95">Gasolina 95</option>
                <option value="gasoleoA">Gasóleo A (Diésel)</option>
              </select>
            </div>

            {/* Target price */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="alert-target-price">
                Precio objetivo (€/L)
              </label>
              <input
                id="alert-target-price"
                type="number"
                required
                min="0.001"
                max="9.999"
                step="0.001"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="1.450"
                className={`w-full rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 ${inputFocusClass} transition`}
              />
            </div>

            {/* Province (optional) */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="alert-province">
                Provincia{" "}
                <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <select
                id="alert-province"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className={`w-full rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 ${inputFocusClass} transition`}
              >
                <option value="">Toda España</option>
                {PROVINCES.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={status === "loading"}
            className={`mt-4 w-full flex items-center justify-center gap-2 ${btnClass} text-white text-sm font-medium py-2.5 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {status === "loading" ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creando alerta…
              </>
            ) : (
              <>
                <Bell className="w-4 h-4" />
                Crear Alerta
              </>
            )}
          </button>

          <p className="mt-2 text-xs text-gray-400 text-center">
            Sin spam. Puedes cancelar en cualquier momento con el enlace del email.
          </p>
        </form>
      )}
    </div>
  );
}

export default PriceAlertForm;
