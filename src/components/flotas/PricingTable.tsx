"use client";

import { motion } from "motion/react";
import { Check, Zap, Building2, Truck } from "lucide-react";
import Link from "next/link";

interface PricingTier {
  name: string;
  price: string;
  subtitle: string;
  minVehicles?: string;
  icon: React.ReactNode;
  highlight: boolean;
  features: string[];
  cta: string;
  ctaHref: string;
}

const tiers: PricingTier[] = [
  {
    name: "Starter",
    price: "19 €",
    subtitle: "por vehículo / mes",
    icon: <Truck className="w-5 h-5" />,
    highlight: false,
    features: [
      "Hasta 49 vehículos",
      "Posiciones GPS en tiempo real",
      "Mapa con tráfico y peajes",
      "Alertas de incidencias en ruta",
      "API de ingestión de posiciones",
      "Informes diarios y semanales",
      "Soporte por email",
    ],
    cta: "Empezar prueba",
    ctaHref: "/flotas/onboarding",
  },
  {
    name: "Pro",
    price: "14 €",
    subtitle: "por vehículo / mes",
    minVehicles: "desde 50 vehículos",
    icon: <Zap className="w-5 h-5" />,
    highlight: true,
    features: [
      "50 a 199 vehículos",
      "Todo lo de Starter",
      "Overlay de precios de combustible",
      "Exportación CSV y JSON",
      "Webhooks de posición",
      "Dashboard multi-conductor",
      "SLA 99,5 %",
      "Soporte prioritario",
    ],
    cta: "Activar Pro",
    ctaHref: "/flotas/onboarding",
  },
  {
    name: "Enterprise",
    price: "9 €",
    subtitle: "por vehículo / mes",
    minVehicles: "desde 200 vehículos",
    icon: <Building2 className="w-5 h-5" />,
    highlight: false,
    features: [
      "200 + vehículos",
      "Todo lo de Pro",
      "Aislamiento de datos dedicado",
      "Integración personalizada",
      "Acceso a API completa sin límites",
      "Informes a medida",
      "SLA 99,9 % con penalización",
      "Account manager dedicado",
    ],
    cta: "Contactar ventas",
    ctaHref: "mailto:flotas@trafico.live",
  },
];

export function PricingTable() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
      {tiers.map((tier, i) => (
        <motion.div
          key={tier.name}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 260, damping: 24, delay: i * 0.1 }}
          className={[
            "relative flex flex-col rounded-2xl border p-7 gap-6",
            tier.highlight
              ? "border-tl-amber-500 bg-tl-amber-50 dark:bg-tl-amber-950/30 shadow-lg shadow-tl-amber-500/10"
              : "border-tl-100 dark:border-tl-800 bg-white dark:bg-tl-950",
          ].join(" ")}
        >
          {tier.highlight && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-tl-amber-500 text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
              Más popular
            </span>
          )}

          <div>
            <div
              className={[
                "inline-flex items-center gap-2 text-sm font-semibold mb-3",
                tier.highlight ? "text-tl-amber-600 dark:text-tl-amber-400" : "text-tl-600 dark:text-tl-400",
              ].join(" ")}
            >
              {tier.icon}
              {tier.name}
            </div>
            <div className="flex items-end gap-1">
              <span className="font-heading text-4xl font-bold text-foreground">{tier.price}</span>
              <span className="text-sm text-foreground/50 mb-1">{tier.subtitle}</span>
            </div>
            {tier.minVehicles && (
              <p className="mt-1 text-xs text-foreground/50">{tier.minVehicles}</p>
            )}
          </div>

          <ul className="flex flex-col gap-2 flex-1">
            {tier.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-foreground/80">
                <Check className="w-4 h-4 shrink-0 mt-0.5 text-tl-500" />
                {f}
              </li>
            ))}
          </ul>

          <Link
            href={tier.ctaHref}
            className={[
              "block text-center py-3 rounded-xl font-semibold text-sm transition-colors",
              tier.highlight
                ? "bg-tl-amber-500 hover:bg-tl-amber-600 text-white"
                : "bg-tl-600 hover:bg-tl-700 text-white",
            ].join(" ")}
          >
            {tier.cta}
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
