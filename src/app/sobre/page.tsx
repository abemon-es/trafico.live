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
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Sobre Tráfico España</h1>
          <p className="mt-4 text-lg text-gray-600">
            Plataforma de inteligencia vial en tiempo real para España
          </p>
        </div>

        {/* Mission */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Nuestra misión</h2>
          <p className="text-gray-600 leading-relaxed">
            Tráfico España tiene como objetivo proporcionar información clara y accesible sobre el estado
            del tráfico en las carreteras españolas. Centralizamos datos de múltiples fuentes oficiales
            para ofrecer una visión completa de la situación vial en tiempo real.
          </p>
        </section>

        {/* Features */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Características</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-red-50 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Balizas V16</h3>
              </div>
              <p className="text-sm text-gray-600">
                Localización en tiempo real de las balizas V16 de emergencia activadas en las carreteras españolas.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-tl-50 rounded-lg">
                  <Database className="w-6 h-6 text-tl-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Datos oficiales</h3>
              </div>
              <p className="text-sm text-gray-600">
                Información proveniente directamente del Punto de Acceso Nacional (NAP) de la DGT en formato DATEX II.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <Clock className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Actualización continua</h3>
              </div>
              <p className="text-sm text-gray-600">
                Los datos se actualizan automáticamente cada 60 segundos para mantener la información al día.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Cobertura nacional</h3>
              </div>
              <p className="text-sm text-gray-600">
                Cobertura de las 52 provincias españolas, incluyendo datos de fuentes autonómicas.
              </p>
            </div>
          </div>
        </section>

        {/* Data Sources */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Fuentes de datos</h2>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-200">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">DGT NAP (DATEX II v3.6)</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Punto de Acceso Nacional de Tráfico y Movilidad. Incidencias, balizas V16, obras y restricciones.
                  </p>
                </div>
                <a
                  href="https://nap.dgt.es"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tl-600 hover:text-tl-700 flex items-center gap-1 text-sm"
                >
                  Visitar <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">DGT en Cifras</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Estadísticas históricas de siniestralidad vial. Datos anuales desde 2015.
                  </p>
                </div>
                <a
                  href="https://www.dgt.es/menusecundario/dgt-en-cifras/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tl-600 hover:text-tl-700 flex items-center gap-1 text-sm"
                >
                  Visitar <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">AEMET</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Datos meteorológicos y alertas que pueden afectar a las condiciones de circulación.
                  </p>
                </div>
                <a
                  href="https://www.aemet.es"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tl-600 hover:text-tl-700 flex items-center gap-1 text-sm"
                >
                  Visitar <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Euskadi Traffic API</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Incidencias de tráfico del País Vasco.
                  </p>
                </div>
                <a
                  href="https://api.euskadi.eus"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tl-600 hover:text-tl-700 flex items-center gap-1 text-sm"
                >
                  Visitar <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">SCT - Servei Català de Trànsit</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Incidencias de tráfico de Cataluña.
                  </p>
                </div>
                <a
                  href="https://transit.gencat.cat"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tl-600 hover:text-tl-700 flex items-center gap-1 text-sm"
                >
                  Visitar <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Limitations */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Limitaciones</h2>
          <div className="bg-tl-amber-50 border border-tl-amber-200 rounded-lg p-6">
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

        {/* Technology & Operator */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Equipo</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Technology */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tecnología</h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-tl-600 to-tl-400 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-xl">A</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">abemonFLOW™ Engine</p>
                  <p className="text-sm text-gray-500">Motor de procesamiento de datos</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                Plataforma de integración y procesamiento de datos en tiempo real desarrollada por Abemon.
              </p>
              <a
                href="https://abemon.es"
                target="_blank"
                rel="noopener noreferrer"
                className="text-tl-600 hover:text-tl-400 flex items-center gap-1 text-sm font-medium"
              >
                abemon.es <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* Independent */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Proyecto independiente</h3>
              <div className="mb-4">
                <p className="font-semibold text-gray-900 text-lg">trafico.live</p>
                <p className="text-sm text-gray-500">Inteligencia vial en tiempo real</p>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                Plataforma independiente dedicada a ofrecer la información de tráfico más completa de España, combinando múltiples fuentes oficiales en un único punto de acceso.
              </p>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Contacto</h2>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-gray-600 mb-4">
              Para consultas, sugerencias o reportar errores sobre esta plataforma:
            </p>
            <div className="space-y-2 text-gray-700">
              <p>
                <span className="font-medium">Email:</span>{" "}
                <a href="mailto:hola@trafico.live" className="text-tl-600 hover:underline">
                  hola@trafico.live
                </a>
              </p>
              <p>
                <span className="font-medium">Web:</span>{" "}
                <a
                  href="https://trafico.live"
                  className="text-tl-600 hover:underline"
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
