import { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Database, Clock, Shield, ExternalLink } from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Sobre Tráfico España",
  description: "Información sobre el proyecto Tráfico España, fuentes de datos, metodología y equipo detrás de la plataforma.",
  alternates: {
    canonical: `${BASE_URL}/sobre`,
  },
};

export default function SobrePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Sobre Tráfico España</h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Plataforma de inteligencia vial en tiempo real para España
          </p>
        </div>

        {/* Mission */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Nuestra misión</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            Tráfico España tiene como objetivo proporcionar información clara y accesible sobre el estado
            del tráfico en las carreteras españolas. Centralizamos datos de múltiples fuentes oficiales
            para ofrecer una visión completa de la situación vial en tiempo real.
          </p>
        </section>

        {/* Features */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Características</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Balizas V16</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Localización en tiempo real de las balizas V16 de emergencia activadas en las carreteras españolas.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-tl-50 dark:bg-tl-900/20 rounded-lg">
                  <Database className="w-6 h-6 text-tl-600 dark:text-tl-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Datos oficiales</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Información proveniente directamente del Punto de Acceso Nacional (NAP) de la DGT en formato DATEX II.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <Clock className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Actualización continua</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Los datos se actualizan automáticamente cada 60 segundos para mantener la información al día.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Cobertura nacional</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Cobertura de las 52 provincias españolas, incluyendo datos de fuentes autonómicas.
              </p>
            </div>
          </div>
        </section>

        {/* Data Sources */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Fuentes de datos</h2>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 divide-y divide-gray-200 dark:divide-gray-800">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">DGT NAP (DATEX II v3.6)</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Punto de Acceso Nacional de Tráfico y Movilidad. Incidencias, balizas V16, obras y restricciones.
                  </p>
                </div>
                <a
                  href="https://nap.dgt.es"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tl-600 dark:text-tl-400 hover:text-tl-700 dark:text-tl-300 flex items-center gap-1 text-sm"
                >
                  Visitar <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">DGT en Cifras</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Estadísticas históricas de siniestralidad vial. Datos anuales desde 2015.
                  </p>
                </div>
                <a
                  href="https://www.dgt.es/menusecundario/dgt-en-cifras/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tl-600 dark:text-tl-400 hover:text-tl-700 dark:text-tl-300 flex items-center gap-1 text-sm"
                >
                  Visitar <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">AEMET</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Datos meteorológicos y alertas que pueden afectar a las condiciones de circulación.
                  </p>
                </div>
                <a
                  href="https://www.aemet.es"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tl-600 dark:text-tl-400 hover:text-tl-700 dark:text-tl-300 flex items-center gap-1 text-sm"
                >
                  Visitar <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Euskadi Traffic API</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Incidencias de tráfico del País Vasco.
                  </p>
                </div>
                <a
                  href="https://api.euskadi.eus"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tl-600 dark:text-tl-400 hover:text-tl-700 dark:text-tl-300 flex items-center gap-1 text-sm"
                >
                  Visitar <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">SCT - Servei Català de Trànsit</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Incidencias de tráfico de Cataluña.
                  </p>
                </div>
                <a
                  href="https://transit.gencat.cat"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tl-600 dark:text-tl-400 hover:text-tl-700 dark:text-tl-300 flex items-center gap-1 text-sm"
                >
                  Visitar <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Limitations */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Limitaciones</h2>
          <div className="bg-tl-amber-50 dark:bg-tl-amber-900/20 border border-tl-amber-200 dark:border-tl-amber-800 rounded-lg p-6">
            <ul className="space-y-3 text-tl-amber-800">
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>Puede haber un retraso de hasta 2 minutos entre que ocurre un evento y su publicación en el sistema.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>Esta plataforma es informativa y no sustituye las indicaciones oficiales de la DGT.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Operator & Developer */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Equipo</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Operator — Certus SPV */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Gestión y operación</h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-gray-800 to-gray-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-xl">C</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">Certus SPV, SLU</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Titular y operador de trafico.live</p>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                Certus SPV gestiona la plataforma, la infraestructura y las relaciones institucionales con las fuentes de datos oficiales.
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                CIF: B13852223 · Madrid, España
              </p>
            </div>

            {/* Developer — abemon */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Desarrollo e ingeniería</h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-tl-600 to-tl-400 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-xl">A</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">Abemon</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Soluciones digitales</p>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                Diseño, desarrollo y mantenimiento técnico de la plataforma: arquitectura, integraciones de datos en tiempo real e infraestructura cloud.
              </p>
              <a
                href="https://abemon.es"
                target="_blank"
                rel="noopener noreferrer"
                className="text-tl-600 dark:text-tl-400 hover:text-tl-400 flex items-center gap-1 text-sm font-medium"
              >
                abemon.es <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Contacto</h2>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Para consultas, sugerencias o reportar errores sobre esta plataforma:
            </p>
            <div className="space-y-2 text-gray-700 dark:text-gray-300">
              <p>
                <span className="font-medium">Email:</span>{" "}
                <a href="mailto:hola@trafico.live" className="text-tl-600 dark:text-tl-400 hover:underline">
                  hola@trafico.live
                </a>
              </p>
              <p>
                <span className="font-medium">Web:</span>{" "}
                <a
                  href="https://trafico.live"
                  className="text-tl-600 dark:text-tl-400 hover:underline"
                >
                  trafico.live
                </a>
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
