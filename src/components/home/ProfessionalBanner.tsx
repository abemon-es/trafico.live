import Link from "next/link";
import { Fuel, Ban, Route, Code2, Truck, BarChart2 } from "lucide-react";
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
    detail: "Precio por ruta y zona",
  },
  {
    icon: Ban,
    label: "ZBE check",
    detail: "13+ zonas activas",
  },
  {
    icon: Route,
    label: "Restricciones",
    detail: "Tiempo real DGT",
  },
  {
    icon: Code2,
    label: "API REST",
    detail: "40+ endpoints",
  },
  {
    icon: Truck,
    label: "Gestión de flota",
    detail: "Alertas y rutas",
  },
  {
    icon: BarChart2,
    label: "Informes",
    detail: "Exportables PDF/CSV",
  },
];

export function ProfessionalBanner() {
  return (
    <section className="py-18 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-tl-50 dark:bg-tl-950/30 border border-tl-200 dark:border-tl-800/50 rounded-2xl px-8 py-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          {/* Left — text */}
          <div>
            <p className="font-heading text-xs font-semibold uppercase tracking-widest text-tl-600 dark:text-tl-400 mb-1">
              Para profesionales
            </p>
            <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-50 mb-3 leading-tight">
              Herramientas para flotas y transporte
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              trafico.live Professional ofrece una suite completa de herramientas para empresas de transporte, gestores de flota y profesionales de la logística. Accede a datos de combustible optimizados por ruta, alertas de restricciones en tiempo real y análisis histórico de condiciones de tráfico por tramo.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 leading-relaxed mb-4">
              Nuestra API REST con más de 40 endpoints permite integrar datos de incidencias, precios de combustible, cámaras, radares, cargadores EV y zonas ZBE directamente en tus sistemas de gestión. Documentación completa, autenticación por API key y límites de tarifa adaptados al volumen de tu empresa.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 leading-relaxed mb-6">
              Incluye módulo de gestión de flota con seguimiento de activos, cálculo de coste de combustible por trayecto, alertas de ZBE para vehículos sin etiqueta, e informes exportables en PDF y CSV para cumplimiento normativo.
            </p>
            <Link
              href="/profesional"
              className="inline-flex items-center gap-2 bg-tl-600 hover:bg-tl-700 text-white font-heading font-semibold text-sm rounded-lg px-5 py-2.5 transition-colors"
            >
              Conocer las herramientas profesionales
            </Link>
          </div>

          {/* Right — 2x3 feature grid */}
          <div className="grid grid-cols-2 gap-3">
            {PRO_FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.label}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <Icon className="w-4 h-4 text-tl-600 dark:text-tl-400 mb-2" />
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-tight mb-0.5">
                    {feature.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">{feature.detail}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
