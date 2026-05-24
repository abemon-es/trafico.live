"use client";

import { useState } from "react";
import { CheckCircle, Zap, Building2, Rocket } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TierConfig {
  name: "FREE" | "PRO" | "ENTERPRISE";
  label: string;
  price: string;
  period: string;
  highlight: boolean;
  badge: string | null;
  perMinute: number;
  perDay: number | string;
  features: string[];
  cta: string;
  ctaVariant: "outline" | "primary" | "amber";
  icon: React.ElementType;
  stripeTier?: "PRO" | "ENTERPRISE";
}

// ---------------------------------------------------------------------------
// Tier definitions — kept in sync with src/lib/api-tiers.ts
// Prices: FREE=0, PRO=49€/mes, ENTERPRISE=149€/mes
// ---------------------------------------------------------------------------

const TIERS: TierConfig[] = [
  {
    name: "FREE",
    label: "Gratuito",
    price: "0€",
    period: "",
    highlight: false,
    badge: null,
    perMinute: 10,
    perDay: "1.000",
    features: [
      "Incidencias de tráfico en tiempo real",
      "Precios de combustible actuales",
      "Alertas meteorológicas de carretera",
      "Alertas de servicio Renfe",
      "Búsqueda sobre 26 colecciones",
      "JSON + GeoJSON estándar",
      "Hasta 3 claves API por email",
    ],
    cta: "Empezar gratis",
    ctaVariant: "outline",
    icon: Rocket,
  },
  {
    name: "PRO",
    label: "Profesional",
    price: "49€",
    period: "/mes",
    highlight: true,
    badge: "Más popular",
    perMinute: 100,
    perDay: "100.000",
    features: [
      "Todo lo del plan FREE",
      "Datos históricos completos",
      "Análisis de tendencias de combustible",
      "Matrices de movilidad O-D",
      "Microdatos de siniestralidad DGT",
      "Registros climáticos (AEMET, desde 2019)",
      "Seguimiento de flota ferroviaria en tiempo real",
      "Tráfico de ciudades (Madrid/Barcelona/Valencia)",
      "Aviación: posiciones y aeropuertos AENA",
      "Calidad del aire (506 estaciones MITECO)",
    ],
    cta: "Solicitar acceso PRO",
    ctaVariant: "primary",
    icon: Zap,
    stripeTier: "PRO",
  },
  {
    name: "ENTERPRISE",
    label: "Enterprise",
    price: "149€",
    period: "/mes",
    highlight: false,
    badge: null,
    perMinute: 1000,
    perDay: "Sin límite",
    features: [
      "Todo lo del plan PRO",
      "Exportación masiva (bulk export)",
      "Webhooks push en tiempo real",
      "Soporte prioritario con SLA",
      "Factura mensual personalizada",
      "IP dedicada bajo demanda",
      "Acceso a todos los endpoints actuales y futuros",
    ],
    cta: "Contactar ventas",
    ctaVariant: "amber",
    icon: Building2,
    stripeTier: "ENTERPRISE",
  },
];

const CTA_CLASSES: Record<TierConfig["ctaVariant"], string> = {
  outline:
    "border border-tl-200 dark:border-tl-700 text-tl-600 dark:text-tl-300 hover:bg-tl-50 dark:hover:bg-tl-900/50",
  primary:
    "bg-[color:var(--tl-primary)] hover:bg-[color:var(--tl-primary-hover)] text-white",
  amber:
    "bg-tl-amber-400 hover:bg-tl-amber-300 text-tl-amber-950",
};

const TIER_BADGE_CLASSES: Record<TierConfig["name"], string> = {
  FREE: "bg-tl-100 dark:bg-tl-900 text-tl-700 dark:text-tl-200",
  PRO: "bg-[color:var(--tl-primary)] text-white",
  ENTERPRISE: "bg-tl-amber-400 text-tl-amber-950",
};

// ---------------------------------------------------------------------------
// Email modal state
// ---------------------------------------------------------------------------

type ModalTier = "PRO" | "ENTERPRISE";

interface CheckoutState {
  loading: boolean;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PricingTable() {
  const [modalTier, setModalTier] = useState<ModalTier | null>(null);
  const [email, setEmail] = useState("");
  const [checkout, setCheckout] = useState<CheckoutState>({
    loading: false,
    error: null,
  });

  function handleCta(tier: TierConfig) {
    if (tier.name === "FREE") {
      // Scroll to the API key section on /api-docs
      window.location.href = "/api-docs#obtener-clave";
      return;
    }
    setModalTier(tier.stripeTier!);
    setEmail("");
    setCheckout({ loading: false, error: null });
  }

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (!modalTier) return;
    setCheckout({ loading: true, error: null });

    // Grab GA client_id from _ga cookie for server-side attribution
    let gaClientId: string | undefined;
    try {
      const gaCookie = document.cookie
        .split("; ")
        .find((c) => c.startsWith("_ga="));
      if (gaCookie) {
        const parts = gaCookie.split("=")[1].split(".");
        gaClientId = parts.slice(2).join(".");
      }
    } catch {
      // non-critical
    }

    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, tier: modalTier, gaClientId }),
      });

      const data = (await res.json()) as { url?: string; error?: string };

      if (!res.ok || !data.url) {
        setCheckout({
          loading: false,
          error: data.error ?? "No se pudo iniciar el pago. Inténtalo de nuevo.",
        });
        return;
      }

      window.location.href = data.url;
    } catch {
      setCheckout({
        loading: false,
        error: "Error de conexión. Inténtalo de nuevo.",
      });
    }
  }

  return (
    <>
      {/* Pricing grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {TIERS.map((tier) => {
          const Icon = tier.icon;
          return (
            <div
              key={tier.name}
              className={`rounded-2xl border p-6 relative flex flex-col transition-shadow hover:shadow-md ${
                tier.highlight
                  ? "border-2 border-[color:var(--tl-primary)] bg-[color:var(--tl-primary-bg)] dark:bg-tl-900"
                  : "border border-tl-200 dark:border-tl-800 bg-white dark:bg-gray-900"
              }`}
            >
              {tier.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold bg-[color:var(--tl-primary)] text-white px-4 py-1 rounded-full shadow">
                  {tier.badge}
                </span>
              )}

              {/* Icon + tier badge */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    tier.highlight
                      ? "bg-[color:var(--tl-primary)] text-white"
                      : "bg-[color:var(--tl-primary-bg)] text-[color:var(--tl-primary)]"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span
                  className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full font-mono ${TIER_BADGE_CLASSES[tier.name]}`}
                >
                  {tier.name}
                </span>
              </div>

              {/* Price */}
              <div className="mb-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-heading font-bold text-gray-900 dark:text-gray-100">
                    {tier.price}
                  </span>
                  {tier.period && (
                    <span className="text-tl-500 dark:text-tl-400 text-sm">
                      {tier.period}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex gap-3 text-xs font-mono text-tl-600 dark:text-tl-300">
                  <span>{tier.perMinute} req/min</span>
                  <span className="text-tl-300 dark:text-tl-600">·</span>
                  <span>{tier.perDay} req/día</span>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-6 flex-1">
                {tier.features.map((feat) => (
                  <li
                    key={feat}
                    className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <CheckCircle className="w-4 h-4 text-[color:var(--tl-success)] flex-shrink-0 mt-0.5" />
                    {feat}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                type="button"
                onClick={() => handleCta(tier)}
                className={`block w-full text-center text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer ${CTA_CLASSES[tier.ctaVariant]}`}
              >
                {tier.cta}
              </button>
            </div>
          );
        })}
      </div>

      {/* Checkout modal */}
      {modalTier && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setModalTier(null);
            }
          }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-tl-200 dark:border-tl-700 shadow-2xl p-8 w-full max-w-md">
            <h3 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100 mb-1">
              Solicitar plan {modalTier}
            </h3>
            <p className="text-sm text-tl-500 dark:text-tl-400 mb-6">
              Introduce tu email para continuar con el pago en Stripe. Sin sorpresas, cancela cuando quieras.
            </p>

            <form onSubmit={handleCheckout} className="space-y-4">
              <div>
                <label
                  htmlFor="checkout-email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Email de facturación
                </label>
                <input
                  id="checkout-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@empresa.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-tl-200 dark:border-tl-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm placeholder:text-tl-400 focus:outline-none focus:ring-2 focus:ring-[color:var(--tl-primary)] focus:border-transparent"
                />
              </div>

              {checkout.error && (
                <p className="text-sm text-[color:var(--tl-danger)] bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5">
                  {checkout.error}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setModalTier(null)}
                  className="flex-1 text-sm font-medium px-4 py-2.5 rounded-xl border border-tl-200 dark:border-tl-700 text-tl-600 dark:text-tl-300 hover:bg-tl-50 dark:hover:bg-tl-900/50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={checkout.loading}
                  className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl bg-[color:var(--tl-primary)] hover:bg-[color:var(--tl-primary-hover)] text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {checkout.loading ? "Redirigiendo..." : "Ir a Stripe"}
                </button>
              </div>

              <p className="text-xs text-tl-400 dark:text-tl-500 text-center">
                Pago seguro con Stripe · Sin permanencia · Cancela en cualquier momento
              </p>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
