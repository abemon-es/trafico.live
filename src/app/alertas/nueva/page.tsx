"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import {
  Route as Road,
  Train,
  Plane,
  Bell,
  Mail,
  MessageCircle,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { AlertTypeSelector, type AlertType } from "@/components/alertas/AlertTypeSelector";
import { FrequencyPicker, type AlertFrequency } from "@/components/alertas/FrequencyPicker";
import { PushPermissionPrompt } from "@/components/alertas/PushPermissionPrompt";

// ---------------------------------------------------------------------------
// Step indicators
// ---------------------------------------------------------------------------
const STEPS = [
  { label: "Tipo" },
  { label: "Destino" },
  { label: "Canales" },
];

// ---------------------------------------------------------------------------
// Target input per type
// ---------------------------------------------------------------------------
interface TargetInputProps {
  type: AlertType;
  value: { targetKey: string; targetLabel: string };
  onChange: (v: { targetKey: string; targetLabel: string }) => void;
}

function TargetInput({ type, value, onChange }: TargetInputProps) {
  if (type === "ROAD") {
    return (
      <div className="space-y-4">
        <div>
          <label
            htmlFor="road-code"
            className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1"
          >
            Código de vía
          </label>
          <input
            id="road-code"
            type="text"
            placeholder="Ej: A-6, M-30, AP-7, N-340"
            value={value.targetKey.replace(/^road:|:.*$/, "").replace(/^road:/, "")}
            onChange={(e) => {
              const road = e.target.value.trim().toUpperCase();
              onChange({
                targetKey: `road:${road}`,
                targetLabel: road,
              });
            }}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-tl-600 focus:border-transparent"
          />
          <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
            Código DGT (ej. A-6, AP-7, M-30). Añade km opcionales: A-6 km 50–90
          </p>
        </div>
        <div>
          <label
            htmlFor="road-label"
            className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1"
          >
            Descripción (cómo quieres verla)
          </label>
          <input
            id="road-label"
            type="text"
            placeholder="Ej: A-6 Madrid → La Coruña"
            value={value.targetLabel}
            onChange={(e) =>
              onChange({ ...value, targetLabel: e.target.value })
            }
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-tl-600 focus:border-transparent"
          />
        </div>
      </div>
    );
  }

  if (type === "TRAIN") {
    return (
      <div className="space-y-4">
        <div>
          <label
            htmlFor="train-route"
            className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1"
          >
            Línea o trayecto
          </label>
          <input
            id="train-route"
            type="text"
            placeholder="Ej: Cercanías C-1, Madrid–Barcelona, AVE"
            value={value.targetKey.replace(/^train:/, "")}
            onChange={(e) => {
              const route = e.target.value;
              onChange({
                targetKey: `train:${route.toLowerCase().replace(/\s+/g, "-")}`,
                targetLabel: route,
              });
            }}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-tl-600 focus:border-transparent"
          />
          <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
            Línea Cercanías (C-1, C-2…), trayecto AVE/LD (Madrid-Barcelona), o nombre de marca (Iryo, Ouigo…)
          </p>
        </div>
        <div>
          <label
            htmlFor="train-label"
            className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1"
          >
            Descripción
          </label>
          <input
            id="train-label"
            type="text"
            placeholder="Ej: Cercanías C-1 Madrid"
            value={value.targetLabel}
            onChange={(e) => onChange({ ...value, targetLabel: e.target.value })}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-tl-600 focus:border-transparent"
          />
        </div>
      </div>
    );
  }

  // FLIGHT
  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="flight-iata"
          className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1"
        >
          Código de vuelo (IATA)
        </label>
        <input
          id="flight-iata"
          type="text"
          placeholder="Ej: IB6250, VY1234, FR4321"
          value={value.targetKey.replace(/^flight:/, "")}
          onChange={(e) => {
            const code = e.target.value.trim().toUpperCase();
            onChange({
              targetKey: `flight:${code}`,
              targetLabel: code,
            });
          }}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-tl-600 focus:border-transparent"
        />
        <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
          2 letras de aerolínea + número de vuelo, ej. IB6250 (Iberia), VY1234 (Vueling)
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Channel toggle
// ---------------------------------------------------------------------------
type AlertChannel = "PUSH" | "EMAIL" | "TELEGRAM";

const CHANNEL_OPTIONS: {
  value: AlertChannel;
  label: string;
  description: string;
  icon: typeof Bell;
}[] = [
  {
    value: "PUSH",
    label: "Notificación web",
    description: "En el navegador o dispositivo",
    icon: Bell,
  },
  {
    value: "EMAIL",
    label: "Email",
    description: "A tu dirección registrada",
    icon: Mail,
  },
  {
    value: "TELEGRAM",
    label: "Telegram",
    description: "@traficoLiveBot (próximamente)",
    icon: MessageCircle,
  },
];

// ---------------------------------------------------------------------------
// Main wizard
// ---------------------------------------------------------------------------
export default function NuevaAlertaPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [alertType, setAlertType] = useState<AlertType | null>(null);
  const [target, setTarget] = useState({ targetKey: "", targetLabel: "" });
  const [channels, setChannels] = useState<AlertChannel[]>(["PUSH"]);
  const [frequency, setFrequency] = useState<AlertFrequency>("REAL_TIME");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function toggleChannel(ch: AlertChannel) {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  }

  function canAdvance(): boolean {
    if (step === 0) return alertType !== null;
    if (step === 1) return target.targetKey.length > 2 && target.targetLabel.length > 0;
    if (step === 2) return channels.length > 0;
    return false;
  }

  async function handleSubmit() {
    if (!alertType || !target.targetKey || channels.length === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          type: alertType,
          targetKey: target.targetKey,
          targetLabel: target.targetLabel,
          channels,
          frequency,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string; message?: string };
        setSubmitError(data.message ?? data.error ?? "Error al crear la alerta");
        return;
      }

      router.push("/alertas?created=1");
    } catch {
      setSubmitError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PushPermissionPrompt userId={null} />

      <main className="max-w-xl mx-auto px-4 py-8 space-y-6" id="main-content">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 dark:text-gray-400">
          <Link href="/" className="hover:text-[var(--tl-primary)] transition-colors">
            Inicio
          </Link>
          <span className="mx-2">/</span>
          <Link href="/alertas" className="hover:text-[var(--tl-primary)] transition-colors">
            Mis alertas
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 dark:text-gray-100 font-semibold">Nueva alerta</span>
        </nav>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div
                className={[
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors",
                  i < step
                    ? "bg-tl-600 text-white"
                    : i === step
                    ? "bg-tl-600 text-white ring-2 ring-tl-300 dark:ring-tl-700"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-400",
                ].join(" ")}
              >
                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span
                className={`text-xs font-semibold hidden sm:block ${
                  i === step
                    ? "text-tl-700 dark:text-tl-300"
                    : "text-gray-400 dark:text-gray-500"
                }`}
              >
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-0.5 flex-1 rounded-full transition-colors ${
                    i < step ? "bg-tl-600" : "bg-gray-200 dark:bg-gray-700"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: "spring", stiffness: 350, damping: 35 }}
            className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6 space-y-5"
          >
            {step === 0 && (
              <>
                <div>
                  <h2 className="text-lg font-bold font-heading text-gray-900 dark:text-gray-100">
                    ¿Qué quieres monitorizar?
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Elige el tipo de alerta que quieres crear.
                  </p>
                </div>
                <AlertTypeSelector value={alertType} onChange={setAlertType} />
              </>
            )}

            {step === 1 && alertType && (
              <>
                <div>
                  <h2 className="text-lg font-bold font-heading text-gray-900 dark:text-gray-100">
                    {alertType === "ROAD" && "¿Qué vía quieres vigilar?"}
                    {alertType === "TRAIN" && "¿Qué línea o trayecto?"}
                    {alertType === "FLIGHT" && "¿Cuál es el código del vuelo?"}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Indica el destino exacto de tu alerta.
                  </p>
                </div>
                <TargetInput type={alertType} value={target} onChange={setTarget} />
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <h2 className="text-lg font-bold font-heading text-gray-900 dark:text-gray-100">
                    Canales y frecuencia
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    ¿Cómo y cuándo quieres recibir las notificaciones?
                  </p>
                </div>

                {/* Channels */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Canales
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {CHANNEL_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const selected = channels.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => toggleChannel(opt.value)}
                          className={[
                            "flex items-start gap-2 rounded-lg border-2 p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-tl-600",
                            selected
                              ? "border-tl-600 bg-tl-50 dark:bg-tl-900/20 dark:border-tl-400"
                              : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-tl-300",
                          ].join(" ")}
                          aria-pressed={selected}
                        >
                          <div
                            className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${
                              selected
                                ? "bg-tl-600 text-white"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                          </div>
                          <div>
                            <p
                              className={`text-xs font-semibold ${
                                selected
                                  ? "text-tl-700 dark:text-tl-300"
                                  : "text-gray-700 dark:text-gray-300"
                              }`}
                            >
                              {opt.label}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              {opt.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {channels.includes("PUSH") && (
                    <p className="mt-2 text-xs text-tl-600 dark:text-tl-400">
                      Activa las notificaciones del navegador para recibir en vivo.
                    </p>
                  )}
                </div>

                {/* Frequency */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Frecuencia
                  </p>
                  <FrequencyPicker value={frequency} onChange={setFrequency} />
                </div>

                {submitError && (
                  <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                    {submitError}
                  </div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              Atrás
            </button>
          ) : (
            <Link
              href="/alertas"
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              Cancelar
            </Link>
          )}

          {step < 2 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance()}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-tl-600 text-white font-semibold text-sm hover:bg-tl-700 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-tl-600 transition-colors"
            >
              Siguiente
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !canAdvance()}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-tl-600 text-white font-semibold text-sm hover:bg-tl-700 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-tl-600 transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  Creando…
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" aria-hidden="true" />
                  Crear alerta
                </>
              )}
            </button>
          )}
        </div>
      </main>
    </>
  );
}
