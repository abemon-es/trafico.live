import Link from "next/link";
import { Fuel, Ban, Route, Code2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ProFeature {
  icon: LucideIcon;
  label: string;
  detail: string;
}

const PRO_FEATURES: ProFeature[] = [
  {
    icon: Fuel,
    label: "Diesel tracker",
    detail: "Por ruta y zona",
  },
  {
    icon: Ban,
    label: "ZBE check",
    detail: "13+ zonas",
  },
  {
    icon: Route,
    label: "Restricciones",
    detail: "Tiempo real",
  },
  {
    icon: Code2,
    label: "API REST",
    detail: "40+ endpoints",
  },
];

export function ProfessionalBanner() {
  return (
    <section className="py-18 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-tl-950 rounded-2xl px-8 py-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Left — text */}
          <div>
            <p className="font-heading text-xs font-semibold uppercase tracking-widest text-tl-400 mb-1">
              Para profesionales
            </p>
            <h2 className="font-heading text-xl font-bold text-white mb-3 leading-tight">
              Herramientas para flotas y transporte
            </h2>
            <p className="text-sm text-white/50 leading-relaxed mb-6">
              Diésel por ruta, restricciones en vivo, áreas de descanso, informes y API REST con
              40+ endpoints. Todo lo que necesitas para gestionar tu flota.
            </p>
            <Link
              href="/profesional"
              className="inline-flex items-center gap-2 bg-tl-600 hover:bg-tl-500 text-white font-heading font-semibold text-sm rounded-lg px-5 py-2.5 transition-colors"
            >
              Acceder
            </Link>
          </div>

          {/* Right — 2x2 feature grid */}
          <div className="grid grid-cols-2 gap-3">
            {PRO_FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.label}
                  className="bg-white/5 border border-white/10 rounded-lg p-3"
                >
                  <Icon className="w-4 h-4 text-tl-400 mb-2" />
                  <p className="text-sm font-medium text-white/70 leading-tight mb-0.5">
                    {feature.label}
                  </p>
                  <p className="text-xs text-white/30">{feature.detail}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
