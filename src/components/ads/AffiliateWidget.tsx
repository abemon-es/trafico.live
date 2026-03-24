"use client";

import { Shield, CreditCard, Zap, ClipboardCheck } from "lucide-react";

export interface AffiliateWidgetProps {
  type: "insurance" | "fuel-card" | "ev-charger" | "itv";
  className?: string;
}

interface WidgetConfig {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  borderColor: string;
  gradientFrom: string;
  gradientTo: string;
  ctaColor: string;
  ctaHoverColor: string;
  heading: string;
  description: string;
  cta: string;
  href: string;
}

const WIDGET_CONFIGS: Record<AffiliateWidgetProps["type"], WidgetConfig> = {
  insurance: {
    icon: Shield,
    iconBg: "bg-tl-100",
    iconColor: "text-tl-600",
    borderColor: "border-tl-200",
    gradientFrom: "from-tl-50",
    gradientTo: "to-white",
    ctaColor: "bg-tl-600",
    ctaHoverColor: "hover:bg-tl-700",
    heading: "¿Tu seguro de coche está al día?",
    description:
      "Compara seguros de coche y ahorra hasta un 50%. Las mejores aseguradoras de España.",
    cta: "Comparar Seguros",
    href: "#",
  },
  "fuel-card": {
    icon: CreditCard,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    borderColor: "border-amber-200",
    gradientFrom: "from-amber-50",
    gradientTo: "to-white",
    ctaColor: "bg-amber-600",
    ctaHoverColor: "hover:bg-amber-700",
    heading: "Tarjeta de combustible para flotas",
    description:
      "Solred, Repsol y más. Ahorra en cada repostaje con tarjetas para profesionales.",
    cta: "Ver Tarjetas",
    href: "#",
  },
  "ev-charger": {
    icon: Zap,
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    borderColor: "border-green-200",
    gradientFrom: "from-green-50",
    gradientTo: "to-white",
    ctaColor: "bg-green-600",
    ctaHoverColor: "hover:bg-green-700",
    heading: "Instala un cargador en casa",
    description: "Cargadores Wallbox desde 499€. Instalación profesional incluida.",
    cta: "Ver Ofertas",
    href: "#",
  },
  itv: {
    icon: ClipboardCheck,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    borderColor: "border-purple-200",
    gradientFrom: "from-purple-50",
    gradientTo: "to-white",
    ctaColor: "bg-purple-600",
    ctaHoverColor: "hover:bg-purple-700",
    heading: "¿Tienes la ITV al día?",
    description: "Reserva tu cita ITV online. Sin colas, sin esperas.",
    cta: "Reservar ITV",
    href: "#",
  },
};

export function AffiliateWidget({ type, className = "" }: AffiliateWidgetProps) {
  const config = WIDGET_CONFIGS[type];
  const Icon = config.icon;

  return (
    <div
      className={`relative rounded-xl border ${config.borderColor} bg-gradient-to-r ${config.gradientFrom} ${config.gradientTo} p-4 sm:p-5 ${className}`}
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div
          className={`flex-shrink-0 w-12 h-12 ${config.iconBg} rounded-lg flex items-center justify-center`}
        >
          <Icon className={`w-6 h-6 ${config.iconColor}`} />
        </div>

        {/* Text + CTA */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-0.5">
            {config.heading}
          </h3>
          <p className="text-xs text-gray-600 leading-relaxed mb-3">{config.description}</p>
          <a
            href={config.href}
            rel="noopener noreferrer sponsored"
            className={`inline-flex items-center gap-1.5 ${config.ctaColor} ${config.ctaHoverColor} text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors`}
          >
            {config.cta}
          </a>
        </div>
      </div>

      {/* LSSI compliance label */}
      <p className="mt-3 text-[10px] text-gray-400 text-right leading-none">
        Enlace patrocinado
      </p>
    </div>
  );
}
