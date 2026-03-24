import { Metadata } from "next";
import Link from "next/link";
import {
  Truck,
  Fuel,
  MapPin,
  Ban,
  AlertTriangle,
  ChevronRight,
  Gauge,
  Clock,
  Shield,
} from "lucide-react";
import { AffiliateWidget } from "@/components/ads/AffiliateWidget";

export const metadata: Metadata = {
  title: "Portal Profesional - Transportistas",
  description:
    "Información especializada para transportistas profesionales: precios de diésel, áreas de descanso, restricciones ZBE y normativa de transporte en España.",
  keywords: [
    "transportistas",
    "diésel barato",
    "áreas de descanso",
    "zonas de bajas emisiones",
    "restricciones camiones",
    "transporte profesional",
  ],
};

const QUICK_LINKS = [
  {
    title: "Diésel más barato",
    description: "Encuentra las gasolineras con el diésel más económico para tu flota",
    href: "/profesional/diesel",
    icon: Fuel,
    color: "bg-amber-100 text-amber-600",
    stats: "Precios actualizados hoy",
  },
  {
    title: "Áreas de descanso",
    description: "Localiza áreas de servicio con parking para vehículos pesados",
    href: "/profesional/areas",
    icon: MapPin,
    color: "bg-blue-100 text-blue-600",
    stats: "Con servicios 24h",
  },
  {
    title: "Restricciones activas",
    description: "ZBE, túneles con restricciones y limitaciones de peso/altura",
    href: "/profesional/restricciones",
    icon: Ban,
    color: "bg-red-100 text-red-600",
    stats: "Actualizado en tiempo real",
  },
];

const INFO_CARDS = [
  {
    title: "Tiempos de conducción",
    description: "Máximo 9h diarias (puede ampliarse a 10h dos veces por semana)",
    icon: Clock,
  },
  {
    title: "Descanso obligatorio",
    description: "45 min cada 4,5h de conducción o pausas de 15+30 min",
    icon: Shield,
  },
  {
    title: "Tacógrafo digital",
    description: "Obligatorio para vehículos +3,5t en transporte profesional",
    icon: Gauge,
  },
];

export default function ProfesionalPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Portal Profesional
              </h1>
              <p className="text-gray-600">
                Herramientas para transportistas y gestores de flotas
              </p>
            </div>
          </div>
        </div>

        {/* Alert Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-amber-800">Información en desarrollo</h3>
            <p className="text-sm text-amber-700 mt-1">
              Estamos ampliando las funcionalidades del portal profesional.
              Algunas secciones pueden mostrar datos limitados mientras completamos la integración.
            </p>
          </div>
        </div>

        {/* Quick Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 hover:shadow-lg transition-all group"
              >
                <div className={`w-12 h-12 ${link.color} rounded-lg flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-green-700 transition-colors">
                  {link.title}
                </h2>
                <p className="text-sm text-gray-600 mb-4">{link.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{link.stats}</span>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Info Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Normativa básica de transporte
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {INFO_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.title} className="flex gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{card.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{card.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Affiliate Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <AffiliateWidget type="insurance" />
          <AffiliateWidget type="fuel-card" />
        </div>

        {/* Related Links */}
        <div className="bg-gray-100 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            También te puede interesar
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/gasolineras"
              className="bg-white rounded-lg p-4 text-center hover:shadow-md transition-shadow"
            >
              <Fuel className="w-6 h-6 text-gray-600 mx-auto mb-2" />
              <span className="text-sm text-gray-700">Todas las gasolineras</span>
            </Link>
            <Link
              href="/incidencias"
              className="bg-white rounded-lg p-4 text-center hover:shadow-md transition-shadow"
            >
              <AlertTriangle className="w-6 h-6 text-gray-600 mx-auto mb-2" />
              <span className="text-sm text-gray-700">Alertas de tráfico</span>
            </Link>
            <Link
              href="/camaras"
              className="bg-white rounded-lg p-4 text-center hover:shadow-md transition-shadow"
            >
              <svg className="w-6 h-6 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="text-sm text-gray-700">Cámaras de tráfico</span>
            </Link>
            <Link
              href="/carreteras"
              className="bg-white rounded-lg p-4 text-center hover:shadow-md transition-shadow"
            >
              <svg className="w-6 h-6 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <span className="text-sm text-gray-700">Estado carreteras</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
